/*
  MERGE FIX — RLS + admin for the shared NaijaRide schema.
  Fixes two bugs in the shared repo's own-row-only policies:
   1) search/trip cards showed blank driver info (join returned NULL for others)
   2) admin could not approve other users' profiles/vehicles
*/

-- 1. Public read of driver-facing profile info (name, rating, verified badge).
drop policy if exists "public_read_profiles" on public.profiles;
create policy "public_read_profiles" on public.profiles
  for select to anon, authenticated using (true);

-- 2. Admin helper.
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public
as $$ select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false); $$;

-- 3. Admin can approve drivers (update any profile).
drop policy if exists "admin_update_profiles" on public.profiles;
create policy "admin_update_profiles" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- 4. Admin can read + approve/reject any vehicle.
drop policy if exists "admin_read_vehicles" on public.vehicles;
create policy "admin_read_vehicles" on public.vehicles
  for select to authenticated using (public.is_admin());
drop policy if exists "admin_update_vehicles" on public.vehicles;
create policy "admin_update_vehicles" on public.vehicles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- 5. Admin can read all trips (admin dashboard).
drop policy if exists "admin_read_trips" on public.trips;
create policy "admin_read_trips" on public.trips
  for select to authenticated using (public.is_admin());

-- 6. Guard: non-admins can't self-verify or change their role.
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    if (new.is_verified_driver is distinct from old.is_verified_driver)
       or (new.role is distinct from old.role)
       or (new.kyc_status is distinct from old.kyc_status
           and not (old.kyc_status = 'unverified' and new.kyc_status = 'pending')) then
      raise exception 'Not allowed to modify verification, role or KYC status';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_guard_profile on public.profiles;
create trigger trg_guard_profile
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- Make yourself the first admin:
--   select id, full_name, phone from public.profiles;
--   update public.profiles set role = 'admin' where id = 'YOUR-UUID';
