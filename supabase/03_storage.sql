-- ============================================================
-- NaijaRide — GAP PHASE 1: storage buckets + policies
-- Enables real document uploads (KYC) and vehicle photos.
-- Run in Supabase → SQL Editor. Buckets are also visible under Storage.
-- ============================================================

-- vehicle-photos: public read (shown on trip cards); authenticated upload
insert into storage.buckets (id, name, public) values ('vehicle-photos','vehicle-photos', true)
  on conflict (id) do nothing;

-- kyc-documents: PRIVATE (licence, insurance, selfie, gov id)
insert into storage.buckets (id, name, public) values ('kyc-documents','kyc-documents', false)
  on conflict (id) do nothing;

-- ── vehicle-photos policies ─────────────────────────────────
drop policy if exists vphotos_read on storage.objects;
create policy vphotos_read on storage.objects for select
  using (bucket_id = 'vehicle-photos');

drop policy if exists vphotos_upload on storage.objects;
create policy vphotos_upload on storage.objects for insert to authenticated
  with check (
    bucket_id = 'vehicle-photos'
    -- basic file-type validation: only images
    and lower(right(name, 4)) in ('.jpg','.png','.web','jpeg')
  );

-- ── kyc-documents policies (owner-scoped by first path segment) ──
-- Upload files as:  <auth.uid()>/<type>-<timestamp>.<ext>
drop policy if exists kyc_docs_rw on storage.objects;
create policy kyc_docs_rw on storage.objects for all to authenticated
  using (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- Admins can read all KYC documents (for review).
drop policy if exists kyc_docs_admin_read on storage.objects;
create policy kyc_docs_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'kyc-documents' and public.is_admin());
