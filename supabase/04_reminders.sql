-- ============================================================
-- NaijaRide — Trip reminders (24h + 2h) via pg_cron + pg_net
-- Sends in-app notifications (and optionally WhatsApp/email through the
-- notify-booking Edge Function) to passengers with confirmed bookings.
-- Run in Supabase → SQL Editor. Requires the notifications table (Phase 1).
-- ============================================================

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

-- Track which reminder(s) were sent per booking so we never double-send.
alter table public.bookings add column if not exists reminded_24h boolean not null default false;
alter table public.bookings add column if not exists reminded_2h  boolean not null default false;

-- Core: find confirmed bookings whose trip departs within a window and notify.
create or replace function public.send_trip_reminders()
returns void
language plpgsql
security definer set search_path = public, extensions
as $$
declare r record;
begin
  -- 24-hour reminder: trips departing in 23–24h, not yet reminded
  for r in
    select b.id as booking_id, b.passenger_id, b.booking_reference,
           t.origin, t.destination, t.departure_time, t.pickup_point,
           d.full_name as driver_name, d.phone as driver_phone
    from public.bookings b
    join public.trips t on t.id = b.trip_id
    join public.profiles d on d.id = t.driver_id
    where b.status = 'confirmed'
      and b.reminded_24h = false
      and t.departure_time between now() + interval '23 hours' and now() + interval '24 hours'
  loop
    insert into public.notifications(user_id, type, channel, title, body, data)
    values (r.passenger_id, 'TRIP_REMINDER_24H', 'in_app',
            'Trip tomorrow: ' || r.origin || ' → ' || r.destination,
            'Your trip departs ' || to_char(r.departure_time, 'Dy DD Mon, HH24:MI') ||
            '. Pickup: ' || coalesce(r.pickup_point, r.origin) ||
            '. Driver: ' || coalesce(r.driver_name,'—') ||
            coalesce(' (' || r.driver_phone || ')', '') || '. Ref ' || r.booking_reference || '.',
            jsonb_build_object('bookingId', r.booking_id));
    update public.bookings set reminded_24h = true where id = r.booking_id;
  end loop;

  -- 2-hour reminder: trips departing in 1.5–2h, not yet reminded
  for r in
    select b.id as booking_id, b.passenger_id, b.booking_reference,
           t.origin, t.destination, t.departure_time, t.pickup_point,
           d.full_name as driver_name, d.phone as driver_phone
    from public.bookings b
    join public.trips t on t.id = b.trip_id
    join public.profiles d on d.id = t.driver_id
    where b.status = 'confirmed'
      and b.reminded_2h = false
      and t.departure_time between now() + interval '90 minutes' and now() + interval '2 hours'
  loop
    insert into public.notifications(user_id, type, channel, title, body, data)
    values (r.passenger_id, 'TRIP_REMINDER_2H', 'in_app',
            'Leaving soon: ' || r.origin || ' → ' || r.destination,
            'Your trip departs at ' || to_char(r.departure_time, 'HH24:MI') ||
            '. Head to ' || coalesce(r.pickup_point, r.origin) ||
            '. Driver: ' || coalesce(r.driver_name,'—') ||
            coalesce(' (' || r.driver_phone || ')', '') || '. Ref ' || r.booking_reference || '.',
            jsonb_build_object('bookingId', r.booking_id));
    update public.bookings set reminded_2h = true where id = r.booking_id;
  end loop;
end;
$$;

-- Schedule it every 15 minutes. (Unschedule first so re-running is safe.)
select cron.unschedule('naijaride_trip_reminders')
  where exists (select 1 from cron.job where jobname = 'naijaride_trip_reminders');

select cron.schedule('naijaride_trip_reminders', '*/15 * * * *', $$ select public.send_trip_reminders(); $$);

-- ── Optional: also push WhatsApp/email via your notify function ──
-- If you want reminders to go out over WhatsApp/email (not just in-app),
-- have send_trip_reminders() additionally call net.http_post to a small
-- reminder Edge Function, mirroring notify-booking. In-app is enough to start.
--
-- Manual test:  select public.send_trip_reminders();
-- Inspect jobs: select jobname, schedule from cron.job;
