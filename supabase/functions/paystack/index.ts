// Supabase Edge Function — Paystack (REAL payments).
// Deploy:  supabase functions deploy paystack --no-verify-jwt
// Secrets: supabase secrets set PAYSTACK_SECRET_KEY=sk_... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.192.0/node/crypto.ts';

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = new URL(req.url);

  if (req.method === 'POST' && url.pathname.endsWith('/initialize')) {
    try {
      const { bookingId, email, amount, callbackUrl } = await req.json();
      if (!bookingId || !email || !amount) return json({ error: 'bookingId, email, amount required' }, 400);
      const reference = `PAY-${bookingId}-${Date.now()}`;
      const res = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, amount, reference, callback_url: callbackUrl,
          channels: ['card', 'bank_transfer', 'ussd', 'apple_pay'], metadata: { bookingId } }),
      });
      const data = await res.json();
      if (!data.status) return json({ error: data.message ?? 'init failed' }, 400);
      return json({ authorizationUrl: data.data.authorization_url, reference: data.data.reference });
    } catch (e) { return json({ error: String(e) }, 500); }
  }

  if (req.method === 'POST' && url.pathname.endsWith('/webhook')) {
    const raw = await req.text();
    const signature = req.headers.get('x-paystack-signature') ?? '';
    const hash = createHmac('sha512', PAYSTACK_SECRET).update(raw).digest('hex');
    if (hash !== signature) return json({ error: 'invalid signature' }, 401);
    const event = JSON.parse(raw);
    if (event.event === 'charge.success') {
      const bookingId = event.data?.metadata?.bookingId;
      if (bookingId) await admin.from('bookings').update({ status: 'CONFIRMED' }).eq('id', bookingId);
    }
    return json({ ok: true });
  }
  return json({ error: 'not found' }, 404);
});
