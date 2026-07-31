// Supabase Edge Function — Paystack (REAL charging). Web Crypto, no node imports.
// Deploy (Dashboard): function name `paystack`, paste this as index.ts, Deploy.
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
        body: JSON.stringify({
          email, amount: amount * 100, reference,
          callback_url: callbackUrl,           // ← sends the browser back to our success page
          channels: ['card', 'bank_transfer', 'ussd', 'apple_pay'],
          metadata: { bookingId },
        }),
      });
      const data = await res.json();
      if (!data.status) return json({ error: data.message ?? 'init failed' }, 400);
      return json({ authorizationUrl: data.data.authorization_url, reference: data.data.reference });
    } catch (e) { return json({ error: String(e) }, 500); }
  }

  if (req.method === 'POST' && path.endsWith('/webhook')) {
    const raw = await req.text();
    const signature = req.headers.get('x-paystack-signature') ?? '';
    if (await hmacSha512Hex(SECRET, raw) !== signature) return json({ error: 'invalid signature' }, 401);
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
