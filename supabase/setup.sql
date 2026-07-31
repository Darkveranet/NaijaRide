-- ============================================================
-- NaijaRide — ONE-SHOT Supabase setup
-- Paste this ENTIRE file into Supabase → SQL Editor → Run.
-- Includes: tables, RLS, signup trigger, atomic booking, wallet,
-- SECURE admin functions, sample data, and booking notifications.
-- Money is stored in KOBO (NGN minor units) as integers.
-- ============================================================

create extension if not exists pgcrypto;

-- ─────────────────────────── TABLES ───────────────────────────
create table if not exists public.profiles (
  id            uuid primary key,
  role          text not null default 'PASSENGER' check (role in ('PASSENGER','DRIVER','ADMIN')),
  first_name    text,
  last_name     text,
  phone         text,
  avatar_url    text,
  is_verified   boolean not null default false,
  kyc_status    text not null default 'NOT_STARTED' check (kyc_status in ('NOT_STARTED','PENDING','VERIFIED','REJECTED')),
  rating_average numeric not null default 0,
  rating_count  int not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists public.vehicles (
  id           uuid primary key default gen_random_uuid(),
  driver_id    uuid not null references public.profiles(id) on delete cascade,
  make text not null, model text not null, year int not null, colour text not null,
  plate_number text not null unique,
  seats int not null check (seats between 1 and 60),
  has_ac boolean not null default false,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  photos text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_vehicles_driver on public.vehicles(driver_id);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id),
  departure_state text not null, departure_city text not null,
  destination_state text not null, destination_city text not null,
  pickup_point text not null, dropoff_point text not null,
  depart_at timestamptz not null, departure_time text not null,
  total_seats int not null, available_seats int not null,
  price_per_seat int not null,
  luggage_allowance text, description text,
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED')),
  created_at timestamptz not null default now()
);
create index if not exists idx_trips_search on public.trips(departure_city, destination_city, depart_at);
create index if not exists idx_trips_driver on public.trips(driver_id);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  trip_id uuid not null references public.trips(id) on delete cascade,
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  seat_count int not null check (seat_count > 0),
  amount int not null, discount int not null default 0,
  status text not null default 'PENDING' check (status in ('PENDING','CONFIRMED','REJECTED','CANCELLED','COMPLETED','REFUNDED')),
  qr_token text not null default encode(gen_random_bytes(16),'hex'),
  notified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_bookings_passenger on public.bookings(passenger_id);
create index if not exists idx_bookings_trip on public.bookings(trip_id);

-- ─────────────────────── SIGNUP TRIGGER ───────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, first_name, last_name, phone)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'role', 'PASSENGER'),
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────── ATOMIC BOOKING ───────────────────────
create or replace function public.create_booking(p_trip_id uuid, p_seat_count int)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare v_trip public.trips; v_booking public.bookings; v_ref text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into v_trip from public.trips where id = p_trip_id for update;
  if not found then raise exception 'Trip not found'; end if;
  if v_trip.status <> 'SCHEDULED' then raise exception 'Trip is not open for booking'; end if;
  if v_trip.available_seats < p_seat_count then raise exception 'Not enough seats available'; end if;
  v_ref := 'NR-' || upper(substr(encode(gen_random_bytes(6),'hex'), 1, 8));
  update public.trips set available_seats = available_seats - p_seat_count where id = p_trip_id;
  insert into public.bookings (reference, trip_id, passenger_id, seat_count, amount, status)
  values (v_ref, p_trip_id, auth.uid(), p_seat_count, v_trip.price_per_seat * p_seat_count, 'PENDING')
  returning * into v_booking;
  return v_booking;
end; $$;

create or replace function public.confirm_booking(p_booking_id uuid)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare v_booking public.bookings;
begin
  update public.bookings set status = 'CONFIRMED'
    where id = p_booking_id and passenger_id = auth.uid()
    returning * into v_booking;
  if not found then raise exception 'Booking not found'; end if;
  return v_booking;
end; $$;

-- ─────────────────────── DRIVER WALLET ────────────────────────
create or replace function public.driver_wallet()
returns json language plpgsql security definer set search_path = public as $$
declare v_confirmed bigint := 0; v_completed bigint := 0;
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
    'currency', 'NGN');
end; $$;

-- ─────────────── SECURE ADMIN (admin-only) ───────────────────
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select coalesce((select role = 'ADMIN' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.admin_analytics()
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  return (select json_build_object(
    'users', (select count(*) from public.profiles),
    'drivers', (select count(*) from public.profiles where role = 'DRIVER'),
    'verifiedDrivers', (select count(*) from public.profiles where is_verified),
    'trips', (select count(*) from public.trips),
    'confirmedBookings', (select count(*) from public.bookings where status in ('CONFIRMED','COMPLETED')),
    'gmv', (select coalesce(sum(amount),0) from public.bookings where status in ('CONFIRMED','COMPLETED')),
    'platformRevenue', (select floor(coalesce(sum(amount),0) * 0.1) from public.bookings where status in ('CONFIRMED','COMPLETED'))));
end; $$;

create or replace function public.admin_set_verified(p_target uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  update public.profiles set is_verified = p_approve,
    kyc_status = case when p_approve then 'VERIFIED' else 'REJECTED' end
    where id = p_target;
end; $$;

-- Stop non-admins changing their own verification / role / kyc.
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if (new.is_verified is distinct from old.is_verified)
       or (new.role is distinct from old.role)
       or (new.kyc_status is distinct from old.kyc_status) then
      raise exception 'Not allowed to modify verification, role or KYC status';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_guard_profile on public.profiles;
create trigger trg_guard_profile before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ─────────────────────────── RLS ──────────────────────────────
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.trips    enable row level security;
alter table public.bookings enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (true);
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (id = auth.uid());

drop policy if exists vehicles_read on public.vehicles;
create policy vehicles_read on public.vehicles for select using (true);
drop policy if exists vehicles_write on public.vehicles;
create policy vehicles_write on public.vehicles for all using (driver_id = auth.uid()) with check (driver_id = auth.uid());

drop policy if exists trips_read on public.trips;
create policy trips_read on public.trips for select using (true);
drop policy if exists trips_write on public.trips;
create policy trips_write on public.trips for all using (driver_id = auth.uid()) with check (driver_id = auth.uid());

drop policy if exists bookings_read on public.bookings;
create policy bookings_read on public.bookings for select using (
  passenger_id = auth.uid()
  or exists (select 1 from public.trips t where t.id = trip_id and t.driver_id = auth.uid()));
drop policy if exists bookings_update on public.bookings;
create policy bookings_update on public.bookings for update using (
  passenger_id = auth.uid()
  or exists (select 1 from public.trips t where t.id = trip_id and t.driver_id = auth.uid()));

-- ────────────────────────── STORAGE ───────────────────────────
insert into storage.buckets (id, name, public) values ('vehicle-photos','vehicle-photos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('kyc-documents','kyc-documents', false) on conflict (id) do nothing;

drop policy if exists vehicle_photos_read on storage.objects;
create policy vehicle_photos_read on storage.objects for select using (bucket_id = 'vehicle-photos');
drop policy if exists vehicle_photos_upload on storage.objects;
create policy vehicle_photos_upload on storage.objects for insert to authenticated with check (bucket_id = 'vehicle-photos');
drop policy if exists kyc_docs_rw on storage.objects;
create policy kyc_docs_rw on storage.objects for all to authenticated
  using (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- ───────────── NOTIFICATIONS (optional; needs Edge Function) ──────────────
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_confirmed_booking()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare v_url text := current_setting('app.notify_url', true);
        v_secret text := current_setting('app.notify_secret', true);
begin
  if new.status = 'CONFIRMED' and (old.status is distinct from 'CONFIRMED')
     and new.notified_at is null and v_url is not null then
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type','application/json','x-notify-secret', coalesce(v_secret,'')),
      body := jsonb_build_object('bookingId', new.id));
  end if;
  return new;
end; $$;
drop trigger if exists trg_notify_confirmed on public.bookings;
create trigger trg_notify_confirmed after update of status on public.bookings
  for each row execute function public.notify_confirmed_booking();
-- To enable notifications, after deploying the notify-booking function run:
--   alter database postgres set "app.notify_url"    = 'https://PROJECT_REF.functions.supabase.co/notify-booking';
--   alter database postgres set "app.notify_secret" = 'a-long-random-string';
--   select pg_reload_conf();

-- ─────────────────────────── SEED ─────────────────────────────
insert into public.profiles (id, role, first_name, last_name, phone, is_verified, kyc_status, rating_average, rating_count) values
  ('11111111-1111-1111-1111-111111111111','DRIVER','Musa','Adeyemi','+2348030000001', true,'VERIFIED',4.8,24),
  ('22222222-2222-2222-2222-222222222222','DRIVER','Ngozi','Okeke','+2348030000002', true,'VERIFIED',4.9,41),
  ('33333333-3333-3333-3333-333333333333','DRIVER','Emeka','Obi','+2348030000003', true,'VERIFIED',4.7,18)
on conflict (id) do nothing;

insert into public.vehicles (id, driver_id, make, model, year, colour, plate_number, seats, has_ac, status) values
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Toyota','Sienna',2019,'Silver','LAG-123XY',6,true,'APPROVED'),
  ('aaaaaaaa-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','Toyota','Hiace',2020,'White','ABJ-456AB',4,true,'APPROVED'),
  ('aaaaaaaa-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333','Mercedes','Sprinter',2018,'Grey','EDO-789CD',6,true,'APPROVED')
on conflict (id) do nothing;

insert into public.trips (driver_id, vehicle_id, departure_state, departure_city, destination_state, destination_city, pickup_point, dropoff_point, depart_at, departure_time, total_seats, available_seats, price_per_seat, luggage_allowance, description) values
  ('11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000001','Lagos','Lagos','Oyo','Ibadan','Ojota Bus Stop','Iwo Road', now() + interval '1 day' + interval '7 hours 30 minutes','07:30',5,5,500000,'1 bag per seat','Comfortable AC ride, morning departure. Water provided.'),
  ('22222222-2222-2222-2222-222222222222','aaaaaaaa-0000-0000-0000-000000000002','FCT','Abuja','Kaduna','Kaduna','Berger Junction','Kawo Park', now() + interval '1 day' + interval '9 hours','09:00',4,4,700000,'1 bag per seat','Express intercity trip with a verified driver.'),
  ('33333333-3333-3333-3333-333333333333','aaaaaaaa-0000-0000-0000-000000000003','Lagos','Lagos','Edo','Benin City','Berger Ojodu','Ring Road', now() + interval '2 days' + interval '6 hours','06:00',6,6,1200000,'2 bags per seat','Long-distance AC coach, early start.'),
  ('11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000001','Lagos','Lagos','Ogun','Abeokuta','Ikeja Along','Kuto', now() + interval '1 day' + interval '16 hours 30 minutes','16:30',5,5,300000,'1 bag per seat','Afternoon ride, spacious vehicle.'),
  ('22222222-2222-2222-2222-222222222222','aaaaaaaa-0000-0000-0000-000000000002','Rivers','Port Harcourt','Abia','Aba','Waterlines','Aba Park', now() + interval '2 days' + interval '8 hours','08:00',4,4,350000,'1 bag per seat','Reliable morning trip.'),
  ('33333333-3333-3333-3333-333333333333','aaaaaaaa-0000-0000-0000-000000000003','Enugu','Enugu','Anambra','Onitsha','Holy Ghost','Upper Iweka', now() + interval '3 days' + interval '10 hours','10:00',6,6,400000,'1 bag per seat','Comfortable, verified and insured.');

-- ─────────── AFTER YOU SIGN UP ONCE, MAKE YOURSELF ADMIN ───────────
-- select id, first_name, phone from public.profiles;   -- find your id
-- update public.profiles set role = 'ADMIN' where id = 'YOUR-UUID-HERE';
