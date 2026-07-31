# Merge notes (what changed and why)

Adapts your shared NaijaRide repo to deploy as a **static export on GitHub Pages**
with **Supabase**, and adds an installable **PWA**, **email + WhatsApp** booking
confirmations, and a **Contact-driver** WhatsApp link. The look & feel is unchanged.

## Overwrites
- `next.config.js`  → static export + basePath
- `app/layout.tsx`  → same layout + PWA register/manifest/icons

## New files
- `app/trip/page.tsx` (static-safe trip detail via ?id=)
- `app/manifest.ts`, `components/pwa-register.tsx`, `components/install-prompt.tsx`
- `public/sw.js`, `public/offline.html`, `public/.nojekyll`, icons
- `.github/workflows/deploy-pages.yml`
- `supabase/migrations/*_merge_rls_and_admin.sql`  (fixes 2 RLS bugs + admin)
- `supabase/migrations/*_merge_notifications.sql`
- `supabase/functions/notify-booking/index.ts`

## Removed (break static export)
- `app/trips/`  (dynamic [id] route)
- `lib/supabase/server.ts`  (server cookies client)
- `netlify.toml`

## One rewrite
- `/trips/${...}`  →  `/trip?id=${...}`  (mainly in components/shared/trip-card.tsx)

The included `apply-merge.sh` does all of the above automatically.
