// Supabase Edge Function — Paystack (optional, for REAL payments).
// Deploy with: supabase functions deploy paystack --no-verify-jwt
// Set secrets:  supabase secrets set PAYSTACK_SECRET_KEY=sk_live_... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_URL=...
//
// Two routes:
//   POST /paystack/initialize  { bookingId, email, amount }  → returns Paystack authorization_url
//   POST /paystack/webhook     (Paystack calls this)         → verifies signature, confirms booking
//
// This runs server-side on Supabase's infrastructure, so the secret key and
// webhook signature verification never touch the browser.

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.192.0/node/crypto.ts';

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

serve(async (req) => {
  const url = new URL(req.url);

  // 1) Initialize a transaction (called from the browser).
  if (req.method === 'POST' && url.pathname.endsWith('/initialize')) {
    const { bookingId, email, amount } = await req.json();
    const reference = `PAY-${bookingId}-${Date.now()}`;
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, amount, reference, metadata: { bookingId } }),
    });
    const data = await res.json();
    return json({ authorizationUrl: data.data?.authorization_url, reference });
  }

  // 2) Webhook — Paystack sends charge.success here.
  if (req.method === 'POST' && url.pathname.endsWith('/webhook')) {
    const raw = await req.text();
    const signature = req.headers.get('x-paystack-signature') ?? '';
    const hash = createHmac('sha512', PAYSTACK_SECRET).update(raw).digest('hex');
    if (hash !== signature) return json({ error: 'invalid signature' }, 401);

    const event = JSON.parse(raw);
    if (event.event === 'charge.success') {
      const bookingId = event.data?.metadata?.bookingId;
      if (bookingId) {
        await admin.from('bookings').update({ status: 'CONFIRMED' }).eq('id', bookingId);
      }
    }
    return json({ ok: true });
  }

  return json({ error: 'not found' }, 404);
});
