// Supabase Edge Function — notify-booking (FREE TIER).
// Matched to the shared repo schema: bookings(seats_booked,total_amount,
// booking_reference,status,passenger_id,trip_id), trips(origin,destination,
// departure_time,driver_id), profiles(full_name,phone).
//
// Deploy:  supabase functions deploy notify-booking --no-verify-jwt
// Secrets: supabase secrets set NOTIFY_SECRET=... RESEND_API_KEY=re_... \
//   MAIL_FROM="NaijaRide <onboarding@resend.dev>" \
//   WHATSAPP_TOKEN=... WHATSAPP_PHONE_ID=... WHATSAPP_TEMPLATE=
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const NOTIFY_SECRET = Deno.env.get('NOTIFY_SECRET') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const MAIL_FROM = Deno.env.get('MAIL_FROM') ?? 'NaijaRide <onboarding@resend.dev>';
const WA_TOKEN = Deno.env.get('WHATSAPP_TOKEN') ?? '';
const WA_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID') ?? '';
const WA_TEMPLATE = Deno.env.get('WHATSAPP_TEMPLATE') ?? '';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
const naira = (n: number) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

function waNumber(phone?: string | null): string | null {
  if (!phone) return null;
  let p = phone.replace(/[^\d+]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('0')) p = '234' + p.slice(1);
  return p || null;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY || !to) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: MAIL_FROM, to, subject, html }),
  }).catch(() => {});
}

async function sendWhatsApp(to: string | null, body: string) {
  if (!WA_TOKEN || !WA_PHONE_ID || !to) return;
  const payload = WA_TEMPLATE
    ? { messaging_product: 'whatsapp', to, type: 'template', template: { name: WA_TEMPLATE, language: { code: 'en' } } }
    : { messaging_product: 'whatsapp', to, type: 'text', text: { body } };
  await fetch(`https://graph.facebook.com/v20.0/${WA_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  if (NOTIFY_SECRET && req.headers.get('x-notify-secret') !== NOTIFY_SECRET) return json({ error: 'unauthorized' }, 401);

  const { bookingId } = await req.json().catch(() => ({}));
  if (!bookingId) return json({ error: 'bookingId required' }, 400);

  const { data: b, error } = await admin
    .from('bookings')
    .select('id, booking_reference, seats_booked, total_amount, status, notified_at, passenger_id, ' +
            'trip:trips!bookings_trip_id_fkey(origin,destination,departure_time, ' +
            'driver:profiles!trips_driver_id_fkey(full_name,phone))')
    .eq('id', bookingId)
    .single();
  if (error || !b) return json({ error: 'booking not found' }, 404);
  if (b.status !== 'confirmed') return json({ skipped: 'not confirmed' });
  if (b.notified_at) return json({ skipped: 'already notified' });

  const trip: any = b.trip; const driver: any = trip?.driver;
  const { data: pax } = await admin.from('profiles').select('full_name, phone').eq('id', b.passenger_id).single();
  const { data: userRes } = await admin.auth.admin.getUserById(b.passenger_id);
  const paxEmail = userRes?.user?.email ?? '';
  const when = new Date(trip.departure_time).toLocaleString('en-NG');
  const route = `${trip.origin} → ${trip.destination}`;

  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto">
    <h2 style="color:#16a34a">Booking confirmed ✅</h2>
    <p>Hi ${pax?.full_name ?? 'there'}, your seat is booked.</p>
    <table style="width:100%;border-collapse:collapse">
      <tr><td>Reference</td><td style="text-align:right"><b>${b.booking_reference}</b></td></tr>
      <tr><td>Route</td><td style="text-align:right"><b>${route}</b></td></tr>
      <tr><td>Departure</td><td style="text-align:right">${when}</td></tr>
      <tr><td>Seats</td><td style="text-align:right">${b.seats_booked}</td></tr>
      <tr><td>Amount</td><td style="text-align:right"><b>${naira(b.total_amount)}</b></td></tr>
      <tr><td>Driver</td><td style="text-align:right">${driver?.full_name ?? '—'}${driver?.phone ? ' · ' + driver.phone : ''}</td></tr>
    </table></div>`;
  await sendEmail(paxEmail, `NaijaRide booking ${b.booking_reference} confirmed`, html);

  await sendWhatsApp(waNumber(pax?.phone),
    `✅ NaijaRide booking confirmed\nRef: ${b.booking_reference}\n${route}\nDeparts: ${when}\n` +
    `Seats: ${b.seats_booked} · ${naira(b.total_amount)}\nDriver: ${driver?.full_name ?? '—'}${driver?.phone ? ' (' + driver.phone + ')' : ''}`);
  await sendWhatsApp(waNumber(driver?.phone),
    `🚗 New confirmed booking\n${route}\nRef: ${b.booking_reference}\nSeats: ${b.seats_booked}\nPassenger: ${pax?.full_name ?? '—'}\nDeparts: ${when}`);

  await admin.from('bookings').update({ notified_at: new Date().toISOString() }).eq('id', b.id);
  return json({ ok: true, notified: b.booking_reference });
});
