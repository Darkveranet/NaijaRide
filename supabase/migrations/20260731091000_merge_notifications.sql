/* MERGE — Booking confirmation notifications (email + WhatsApp), free tier.
   book_trip() creates bookings with status 'confirmed', so we fire on INSERT
   (and UPDATE) when confirmed and not yet notified, via pg_net. */
create extension if not exists pg_net with schema extensions;
alter table public.bookings add column if not exists notified_at timestamptz;

create or replace function public.notify_confirmed_booking()
returns trigger language plpgsql security definer set search_path = public, extensions
as $$
declare v_url text := current_setting('app.notify_url', true);
        v_secret text := current_setting('app.notify_secret', true);
begin
  if new.status = 'confirmed' and new.notified_at is null and v_url is not null then
    perform net.http_post(url := v_url,
      headers := jsonb_build_object('Content-Type','application/json','x-notify-secret', coalesce(v_secret,'')),
      body := jsonb_build_object('bookingId', new.id));
  end if;
  return new;
end; $$;

drop trigger if exists trg_notify_confirmed_ins on public.bookings;
create trigger trg_notify_confirmed_ins after insert on public.bookings
  for each row execute function public.notify_confirmed_booking();
drop trigger if exists trg_notify_confirmed_upd on public.bookings;
create trigger trg_notify_confirmed_upd after update of status on public.bookings
  for each row execute function public.notify_confirmed_booking();

-- After deploying the function, set (replace values) then reload:
--   alter database postgres set "app.notify_url"    = 'https://PROJECT_REF.functions.supabase.co/notify-booking';
--   alter database postgres set "app.notify_secret" = 'a-long-random-string';
--   select pg_reload_conf();
