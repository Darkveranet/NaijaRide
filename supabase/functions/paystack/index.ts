// Supabase Edge Function — Paystack (REAL charging).
// Deploy:  supabase functions deploy paystack --no-verify-jwt
// Secrets: supabase secrets set PAYSTACK_SECRET_KEY=sk_... \
//            SUPABASE_URL=https://YOUR.supabase.co SUPABASE_SERVICE_ROLE_KEY=...
// Routes:
//   POST /paystack/initialize { bookingId, email, amount } -> { authorizationUrl, reference }
//   POST /paystack/webhook   (Paystack) -> verify HMAC-SHA512, call mark_payment_success()
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.192.0/node/crypto.ts';

const SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';
const URL = Deno.env.get('SUPABASE_URL') ?? '';
const ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const admin = createClient(URL, ROLE);
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const path = new URL(req.url).pathname;

  if (req.method === 'POST' && path.endsWith('/initialize')) {
    const { bookingId, email, amount } = await req.json();
    if (!bookingId || !email || !amount) return json({ error: 'bookingId, email, amount required' }, 400);
    const reference = `PAY-${bookingId}-${Date.now()}`;
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, amount: amount * 100, reference,           // Paystack expects KOBO
        channels: ['card', 'bank_transfer', 'ussd', 'apple_pay'],
        metadata: { bookingId },
      }),
    });
    const data = await res.json();
    if (!data.status) return json({ error: data.message ?? 'init failed' }, 400);
    return json({ authorizationUrl: data.data.authorization_url, reference: data.data.reference });
  }

  if (req.method === 'POST' && path.endsWith('/webhook')) {
    const raw = await req.text();
    const sig = req.headers.get('x-paystack-signature') ?? '';
    if (createHmac('sha512', SECRET).update(raw).digest('hex') !== sig) return json({ error: 'bad signature' }, 401);
    const event = JSON.parse(raw);
    if (event.event === 'charge.success') {
      const bookingId = event.data?.metadata?.bookingId;
      const channel = event.data?.channel ?? 'card';
      if (bookingId) await admin.rpc('mark_payment_success', { p_booking_id: bookingId, p_ref: event.data.reference, p_channel: channel });
    }
    return json({ ok: true });
  }
  return json({ error: 'not found' }, 404);
});
