-- ============================================================
-- NaijaRide — Supabase schema (run in Supabase SQL Editor)
-- Real database, auth-linked profiles, RLS, storage & seed data.
-- Money is stored in KOBO (NGN minor units) as integers.
-- ============================================================

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- ─────────────────────────── TABLES ───────────────────────────
create table if not exists public.profiles (
  id            uuid primary key,                 -- equals auth.users.id (set by trigger)
  role          text not null default 'PASSENGER' check (role in ('PASSENGER','DRIVER','ADMIN')),
  first_name    text,
  last_name     text,
  phone         text,
  avatar_url    text,
  is_verified   boolean not null default false,   -- green "Verified Driver" badge
  kyc_status    text not null default 'NOT_STARTED' check (kyc_status in ('NOT_STARTED','PENDING','VERIFIED','REJECTED')),
  rating_average numeric not null default 0,
  rating_count  int not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists public.vehicles (
  id           uuid primary key default gen_random_uuid(),
  driver_id    uuid not null references public.profiles(id) on delete cascade,
  make         text not null,
  model        text not null,
  year         int  not null,
  colour       text not null,
  plate_number text not null unique,
  seats        int  not null check (seats between 1 and 60),
  has_ac       boolean not null default false,
  status       text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  photos       text[] not null default '{}',
  created_at   timestamptz not null default now()
);
create index if not exists idx_vehicles_driver on public.vehicles(driver_id);

create table if not exists public.trips (
  id                uuid primary key default gen_random_uuid(),
  driver_id         uuid not null references public.profiles(id) on delete cascade,
  vehicle_id        uuid references public.vehicles(id),
  departure_state   text not null,
  departure_city    text not null,
  destination_state text not null,
  destination_city  text not null,
  pickup_point      text not null,
  dropoff_point     text not null,
  depart_at         timestamptz not null,
  departure_time    text not null,
  total_seats       int not null,
  available_seats   int not null,
  price_per_seat    int not null,                 -- kobo
  luggage_allowance text,
  description       text,
  status            text not null default 'SCHEDULED' check (status in ('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED')),
  created_at        timestamptz not null default now()
);
create index if not exists idx_trips_search on public.trips(departure_city, destination_city, depart_at);
create index if not exists idx_trips_driver on public.trips(driver_id);

create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  reference    text not null unique,
  trip_id      uuid not null references public.trips(id) on delete cascade,
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  seat_count   int not null check (seat_count > 0),
  amount       int not null,                       -- kobo
  discount     int not null default 0,
  status       text not null default 'PENDING' check (status in ('PENDING','CONFIRMED','REJECTED','CANCELLED','COMPLETED','REFUNDED')),
  qr_token     text not null default encode(gen_random_bytes(16),'hex'),
  created_at   timestamptz not null default now()
);
create index if not exists idx_bookings_passenger on public.bookings(passenger_id);
create index if not exists idx_bookings_trip on public.bookings(trip_id);

-- ─────────────────────── SIGNUP TRIGGER ───────────────────────
-- Automatically create a profile row when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, first_name, last_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'PASSENGER'),
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────── ATOMIC BOOKING ───────────────────────
-- Books seats safely: checks availability, decrements, inserts booking.
create or replace function public.create_booking(p_trip_id uuid, p_seat_count int)
returns public.bookings
language plpgsql
security definer set search_path = public
as $$
declare
  v_trip   public.trips;
  v_booking public.bookings;
  v_ref    text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_trip from public.trips where id = p_trip_id for update;
  if not found then raise exception 'Trip not found'; end if;
  if v_trip.status <> 'SCHEDULED' then raise exception 'Trip is not open for booking'; end if;
  if v_trip.available_seats < p_seat_count then raise exception 'Not enough seats available'; end if;

  v_ref := 'NR-' || upper(substr(encode(gen_random_bytes(6),'hex'), 1, 8));

  update public.trips
    set available_seats = available_seats - p_seat_count
    where id = p_trip_id;

  insert into public.bookings (reference, trip_id, passenger_id, seat_count, amount, status)
  values (v_ref, p_trip_id, auth.uid(), p_seat_count, v_trip.price_per_seat * p_seat_count, 'PENDING')
  returning * into v_booking;

  return v_booking;
end;
$$;

-- Mark a booking paid (called after Paystack success). In production this is
-- done by a Supabase Edge Function verifying the Paystack webhook signature.
create or replace function public.confirm_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer set search_path = public
as $$
declare v_booking public.bookings;
begin
  update public.bookings set status = 'CONFIRMED'
    where id = p_booking_id and passenger_id = auth.uid()
    returning * into v_booking;
  if not found then raise exception 'Booking not found'; end if;
  return v_booking;
end;
$$;

-- ─────────────────────── DRIVER WALLET ────────────────────────
-- Computes earnings from confirmed/completed bookings (10% commission).
create or replace function public.driver_wallet()
returns json
language plpgsql
security definer set search_path = public
as $$
declare
  v_confirmed bigint := 0;
  v_completed bigint := 0;
begin
  select coalesce(sum(b.amount),0) into v_confirmed
  from public.bookings b join public.trips t on t.id = b.trip_id
  where t.driver_id = auth.uid() and b.status = 'CONFIRMED';

  select coalesce(sum(b.amount),0) into v_completed
  from public.bookings b join public.trips t on t.id = b.trip_id
  where t.driver_id = auth.uid() and b.status = 'COMPLETED';

  return json_build_object(
    'earnings', floor((v_confirmed + v_completed) * 0.9),
    'pendingBalance', floor(v_confirmed * 0.9),
    'withdrawableBalance', floor(v_completed * 0.9),
    'currency', 'NGN'
  );
end;
$$;

-- ─────────────────────── ADMIN HELPERS ────────────────────────
-- NOTE: demo-permissive (any authenticated user). Lock down by checking
-- (select role from profiles where id = auth.uid()) = 'ADMIN' in production.
create or replace function public.admin_analytics()
returns json
language sql
security definer set search_path = public
as $$
  select json_build_object(
    'users', (select count(*) from public.profiles),
    'drivers', (select count(*) from public.profiles where role = 'DRIVER'),
    'verifiedDrivers', (select count(*) from public.profiles where is_verified),
    'trips', (select count(*) from public.trips),
    'confirmedBookings', (select count(*) from public.bookings where status in ('CONFIRMED','COMPLETED')),
    'gmv', (select coalesce(sum(amount),0) from public.bookings where status in ('CONFIRMED','COMPLETED')),
    'platformRevenue', (select floor(coalesce(sum(amount),0) * 0.1) from public.bookings where status in ('CONFIRMED','COMPLETED'))
  );
$$;

create or replace function public.admin_set_verified(p_target uuid, p_approve boolean)
returns void
language sql
security definer set search_path = public
as $$
  update public.profiles
    set is_verified = p_approve,
        kyc_status = case when p_approve then 'VERIFIED' else 'REJECTED' end
    where id = p_target;
$$;

-- ─────────────────────────── RLS ──────────────────────────────
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.trips    enable row level security;
alter table public.bookings enable row level security;

-- profiles: anyone can read (needed to show driver names/ratings); manage own row.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (true);
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (id = auth.uid());

-- vehicles: public read; owner manages.
drop policy if exists vehicles_read on public.vehicles;
create policy vehicles_read on public.vehicles for select using (true);
drop policy if exists vehicles_write on public.vehicles;
create policy vehicles_write on public.vehicles for all
  using (driver_id = auth.uid()) with check (driver_id = auth.uid());

-- trips: public read; owner (verified driver) manages.
drop policy if exists trips_read on public.trips;
create policy trips_read on public.trips for select using (true);
drop policy if exists trips_write on public.trips;
create policy trips_write on public.trips for all
  using (driver_id = auth.uid()) with check (driver_id = auth.uid());

-- bookings: passenger sees own; driver sees bookings on their trips.
drop policy if exists bookings_read on public.bookings;
create policy bookings_read on public.bookings for select using (
  passenger_id = auth.uid()
  or exists (select 1 from public.trips t where t.id = trip_id and t.driver_id = auth.uid())
);
drop policy if exists bookings_update on public.bookings;
create policy bookings_update on public.bookings for update using (
  passenger_id = auth.uid()
  or exists (select 1 from public.trips t where t.id = trip_id and t.driver_id = auth.uid())
);

-- ────────────────────────── STORAGE ───────────────────────────
insert into storage.buckets (id, name, public)
values ('vehicle-photos','vehicle-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('kyc-documents','kyc-documents', false)
on conflict (id) do nothing;

-- Public read for vehicle photos; authenticated users can upload.
drop policy if exists vehicle_photos_read on storage.objects;
create policy vehicle_photos_read on storage.objects for select
  using (bucket_id = 'vehicle-photos');

drop policy if exists vehicle_photos_upload on storage.objects;
create policy vehicle_photos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'vehicle-photos');

-- KYC docs: users can only read/write their own files (path prefixed by their uid).
drop policy if exists kyc_docs_rw on storage.objects;
create policy kyc_docs_rw on storage.objects for all to authenticated
  using (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);
