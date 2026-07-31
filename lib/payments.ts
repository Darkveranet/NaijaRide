'use client';
import { supabase } from '@/lib/supabase/client';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const PAYSTACK_ENABLED = Boolean(process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY);

// booking.total_amount is WHOLE NAIRA (the Edge Function converts to kobo).
export async function payWithPaystack(booking: { id: string; total_amount: number }) {
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email;
  if (!email) throw new Error('Sign in to pay');

  // Where Paystack should send the browser after payment (our success page).
  const callbackUrl = `${window.location.origin}${BASE}/booking-success/`;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/paystack/initialize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}`, apikey: ANON },
    body: JSON.stringify({ bookingId: booking.id, email, amount: booking.total_amount, callbackUrl }),
  });
  const data = await res.json();
  if (!res.ok || !data.authorizationUrl) throw new Error(data.error || 'Could not start payment');
  window.location.href = data.authorizationUrl;
}
