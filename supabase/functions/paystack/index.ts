// Supabase Edge Function — Paystack (REAL charging).
// FIXED: no external "node/crypto.ts" import. Uses built-in Web Crypto for the
// webhook HMAC-SHA512 check, and Deno.serve (native) — nothing to bundle.
//
// Deploy (Dashboard): create a function named `paystack`, paste this, Deploy.
// Secrets: PAYSTACK_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Routes:
//   POST /paystack/initialize { bookingId, email, amount } -> { authorizationUrl, reference }
//   POST /paystack/webhook   (Paystack) -> verify signature, call mark_payment_success()

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';
const URL_ = Deno.env.get('SUPABASE_URL') ?? '';
const ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const admin = createClient(URL_, ROLE);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

// HMAC-SHA512 using built-in Web Crypto (no imports).
async function hmacSha512Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const path = new URL(req.url).pathname;

  // 1) Initialize a transaction (called from the browser).
  if (req.method === 'POST' && path.endsWith('/initialize')) {
    try {
      const { bookingId, email, amount } = await req.json();
      if (!bookingId || !email || !amount) return json({ error: 'bookingId, email, amount required' }, 400);
      const reference = `PAY-${bookingId}-${Date.now()}`;
      const res = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          amount: amount * 100, // Paystack expects KOBO; our amounts are whole naira
          reference,
          channels: ['card', 'bank_transfer', 'ussd', 'apple_pay'],
          metadata: { bookingId },
        }),
      });
      const data = await res.json();
      if (!data.status) return json({ error: data.message ?? 'init failed' }, 400);
      return json({ authorizationUrl: data.data.authorization_url, reference: data.data.reference });
    } catch (e) {
      return json({ error: String(e) }, 500);
    }
  }

  // 2) Webhook — Paystack sends charge.success here (server-to-server).
  if (req.method === 'POST' && path.endsWith('/webhook')) {
    const raw = await req.text();
    const signature = req.headers.get('x-paystack-signature') ?? '';
    const expected = await hmacSha512Hex(SECRET, raw);
    if (expected !== signature) return json({ error: 'invalid signature' }, 401);

    const event = JSON.parse(raw);
    if (event.event === 'charge.success') {
      const bookingId = event.data?.metadata?.bookingId;
      const channel = event.data?.channel ?? 'card';
      if (bookingId) {
        await admin.rpc('mark_payment_success', {
          p_booking_id: bookingId,
          p_ref: event.data.reference,
          p_channel: channel,
        });
      }
    }
    return json({ ok: true });
  }

  return json({ error: 'not found' }, 404);
});
