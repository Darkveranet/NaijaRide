// Central client-side feature flags. Each integration is OPTIONAL: the app works
// in a safe simulated mode until you paste the matching key as a repo Variable,
// at which point the feature activates automatically — no code changes.
export const PAYSTACK_ENABLED   = Boolean(process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY);
export const MAPS_ENABLED       = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY);
export const SUPABASE_URL       = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const ANON               = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const BASE               = process.env.NEXT_PUBLIC_BASE_PATH || '';

// Call any deployed Edge Function. Functions themselves detect their own secrets
// (SMS/WhatsApp/NIN/Paystack) and simulate gracefully when a secret is absent.
export async function callFn(name: string, body: any) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}`, apikey: ANON },
    body: JSON.stringify(body),
  });
  return res.json();
}
