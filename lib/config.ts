// Key-optional flags. Each feature works in a fallback mode until you paste the
// matching key as a repo Variable, then it activates automatically.
export const PAYSTACK_ENABLED = Boolean(process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY);
export const MAPS_ENABLED     = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY);
export const MAPS_KEY         = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';
export const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const ANON             = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const BASE             = process.env.NEXT_PUBLIC_BASE_PATH || '';
