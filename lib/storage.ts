'use client';
import { supabase } from '@/lib/supabase/client';

// Upload to a Supabase Storage bucket. KYC docs are namespaced by the user's id
// (required by the storage RLS policy: <uid>/<file>). Returns a usable URL.
export async function uploadFile(
  bucket: 'vehicle-photos' | 'kyc-documents',
  file: File,
  opts: { prefix?: string } = {},
): Promise<{ path: string; url: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in to upload');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const base = `${opts.prefix || 'file'}-${Date.now()}.${ext}`;
  const path = bucket === 'kyc-documents' ? `${user.id}/${base}` : `${user.id}/${base}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;

  if (bucket === 'vehicle-photos') {
    return { path, url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl };
  }
  // private bucket → signed URL (1h) for immediate preview
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  return { path, url: data?.signedUrl || '' };
}
