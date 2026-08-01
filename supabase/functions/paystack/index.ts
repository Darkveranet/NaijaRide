// Supabase Edge Function — Paystack. Web Crypto (no node imports).
// Routes:
//   POST /paystack/initialize { bookingId, email, amount, callbackUrl } -> { authorizationUrl, reference }
//   POST /paystack/verify     { reference }  -> verifies with Paystack, confirms booking, returns {status}
//   POST /paystack/webhook    (Paystack)     -> HMAC check, confirms booking
// Secrets: PAYSTACK_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';
const URL_ = Deno.env.get('SUPABASE_URL') ?? '';
const ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const admin = createClient(URL_, ROLE);
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

async function hmacSha512Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Extract bookingId from our reference: PAY-<uuid>-<timestamp>
function bookingIdFromRef(ref: string): string | null {
  const p = ref.split('-');
  if (p[0] !== 'PAY' || p.length < 3) return null;
  return p.slice(1, p.length - 1).join('-');
}

async function confirm(reference: string) {
  // Ask Paystack for the truth (works even if the webhook never fired).
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${SECRET}` },
  });
  const data = await res.json();
  if (!data.status || data.data?.status !== 'success') {
    return { ok: false, status: data.data?.status ?? 'unknown' };
  }
  const bookingId = data.data?.metadata?.bookingId || bookingIdFromRef(reference);
  const channel = data.data?.channel ?? 'card';
  if (bookingId) {
    const { error } = await admin.rpc('mark_payment_success', { p_booking_id: bookingId, p_ref: reference, p_channel: channel });
    if (error) return { ok: false, status: 'rpc_error', error: error.message };
  }
  return { ok: true, status: 'success', bookingId };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const path = new URL(req.url).pathname;

  if (req.method === 'POST' && path.endsWith('/initialize')) {
    try {
      const { bookingId, email, amount, callbackUrl } = await req.json();
      if (!bookingId || !email || !amount) return json({ error: 'bookingId, email, amount required' }, 400);
      const reference = `PAY-${bookingId}-${Date.now()}`;
      const res = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, amount: amount * 100, reference, callback_url: callbackUrl, channels: ['card','bank_transfer','ussd','apple_pay'], metadata: { bookingId } }),
      });
      const data = await res.json();
      if (!data.status) return json({ error: data.message ?? 'init failed' }, 400);
      return json({ authorizationUrl: data.data.authorization_url, reference: data.data.reference });
    } catch (e) { return json({ error: String(e) }, 500); }
  }

  // Browser calls this from the success page (source-of-truth confirmation).
  if (req.method === 'POST' && path.endsWith('/verify')) {
    try {
      const { reference } = await req.json();
      if (!reference) return json({ error: 'reference required' }, 400);
      return json(await confirm(reference));
    } catch (e) { return json({ error: String(e) }, 500); }
  }

  if (req.method === 'POST' && path.endsWith('/webhook')) {
    const raw = await req.text();
    const signature = req.headers.get('x-paystack-signature') ?? '';
    if (await hmacSha512Hex(SECRET, raw) !== signature) return json({ error: 'invalid signature' }, 401);
    const event = JSON.parse(raw);
    if (event.event === 'charge.success') { await confirm(event.data.reference); }
    return json({ ok: true });
  }
  return json({ error: 'not found' }, 404);
});
