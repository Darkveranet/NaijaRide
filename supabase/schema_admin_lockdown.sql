-- ============================================================
-- NaijaRide — ADMIN LOCKDOWN (run in Supabase SQL Editor AFTER schema.sql)
-- Secures the previously demo-permissive admin functions so ONLY real
-- admins (profiles.role = 'ADMIN') can use them, and prevents users from
-- self-verifying / escalating their own role.
-- ============================================================

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
as $$
  select coalesce((select role = 'ADMIN' from public.profiles where id = auth.uid()), false);
$$;

-- Analytics — admin only.
create or replace function public.admin_analytics()
returns json
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  return (select json_build_object(
    'users', (select count(*) from public.profiles),
    'drivers', (select count(*) from public.profiles where role = 'DRIVER'),
    'verifiedDrivers', (select count(*) from public.profiles where is_verified),
    'trips', (select count(*) from public.trips),
    'confirmedBookings', (select count(*) from public.bookings where status in ('CONFIRMED','COMPLETED')),
    'gmv', (select coalesce(sum(amount),0) from public.bookings where status in ('CONFIRMED','COMPLETED')),
    'platformRevenue', (select floor(coalesce(sum(amount),0) * 0.1) from public.bookings where status in ('CONFIRMED','COMPLETED'))
  ));
end;
$$;

-- Verify / reject a driver — admin only.
create or replace function public.admin_set_verified(p_target uuid, p_approve boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;
  update public.profiles
    set is_verified = p_approve,
        kyc_status  = case when p_approve then 'VERIFIED' else 'REJECTED' end
    where id = p_target;
end;
$$;

-- Guard: non-admins cannot change their own verification/role/kyc via the
-- profiles UPDATE policy (prevents a driver self-verifying).
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    if (new.is_verified is distinct from old.is_verified)
       or (new.role is distinct from old.role)
       or (new.kyc_status is distinct from old.kyc_status) then
      raise exception 'Not allowed to modify verification, role or KYC status';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile on public.profiles;
create trigger trg_guard_profile
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ────────────────────────────────────────────────────────────
-- Bootstrap your FIRST admin (no one is an admin yet).
-- 1) Sign up / log in once so a profiles row exists for you.
-- 2) Find your id:   select id, first_name, phone from public.profiles;
-- 3) Promote yourself (replace the uuid):
--    update public.profiles set role = 'ADMIN' where id = 'YOUR-UUID-HERE';
-- ────────────────────────────────────────────────────────────
