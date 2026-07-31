import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// True once you've set the two env vars (locally or as Pages repo variables).
export const SUPABASE_ENABLED = Boolean(url && anon);

// A single shared browser client. When not configured, this is null and the
// UI shows a "connect Supabase" notice instead of erroring.
export const supabase: SupabaseClient | null = SUPABASE_ENABLED
  ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export const formatNaira = (kobo: number) =>
  `₦${(Number(kobo || 0) / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;
