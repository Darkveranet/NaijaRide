// Real Paystack payment flow for the static (GitHub Pages) frontend.
// Calls the Supabase Edge Function (which holds the secret key) to initialize
// a transaction, then redirects the browser to Paystack's hosted checkout.
import { supabase } from './supabase';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const PAYSTACK_ENABLED = Boolean(process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY);

export async function payWithPaystack(booking: { id: string; amount: number }) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email;
  if (!email) throw new Error('You must be signed in to pay');

  const callbackUrl = `${window.location.origin}${BASE}/dashboard/passenger/?paid=1`;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/paystack/initialize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}`, apikey: ANON },
    body: JSON.stringify({ bookingId: booking.id, email, amount: booking.amount, callbackUrl }),
  });
  const data = await res.json();
  if (!res.ok || !data.authorizationUrl) throw new Error(data.error || 'Could not start payment');
  window.location.href = data.authorizationUrl;
}
