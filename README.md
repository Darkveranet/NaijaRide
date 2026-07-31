# NaijaRide 🚗 — Nigerian Intercity Car Trip Booking (Supabase + GitHub Pages)

A mobile-first marketplace connecting **verified vehicle owners** with **passengers**
travelling between Nigerian cities. Drivers publish scheduled trips; passengers search,
compare and book seats — with **real data** powered by **Supabase**, deployable to
**GitHub Pages** with **no backend server**.

---

## 🧱 Architecture

```
Browser (Next.js static site on GitHub Pages)
        │  @supabase/supabase-js
        ▼
Supabase  ── Postgres (RLS)  ── Auth  ── Storage  ── (optional) Edge Functions
```

- **No custom server.** The static frontend calls Supabase directly.
- **Row-Level Security** protects data; the browser only ever uses the safe **anon** key.
- **Storage buckets** hold vehicle photos (public) and KYC documents (private).
- **Optional Edge Function** handles real Paystack payments server-side.

## 📁 Structure
```
naijaride/
├── frontend/               # Next.js 14 static export (App Router, Tailwind, React Query)
│   └── src/
│       ├── lib/supabase.ts # client
│       ├── lib/data.ts     # all queries + React Query hooks (real Supabase)
│       ├── app/            # home, search, trip, login, register, dashboards, admin
│       └── components/     # UI, Navbar, TripCard
├── supabase/
│   ├── schema.sql          # tables, RLS, triggers, RPCs, storage buckets
│   ├── seed.sql            # sample verified drivers + trips
│   └── functions/paystack/ # optional Edge Function for real payments
├── .github/workflows/deploy-pages.yml
└── docs/                   # SUPABASE.md, GITHUB_PAGES.md
```

## 🚀 Get started (2 steps)

**1) Set up Supabase** — create a project, run `supabase/schema.sql` then `supabase/seed.sql`,
copy your URL + anon key. Full guide → [`docs/SUPABASE.md`](docs/SUPABASE.md).

**2) Run locally**
```bash
cd frontend
cp .env.example .env.local     # paste NEXT_PUBLIC_SUPABASE_URL + ANON_KEY
npm install
npm run dev                    # http://localhost:3000
```
The top banner turns **green** when connected.

## 🌐 Deploy to GitHub Pages
Push to GitHub, enable Pages (Source = GitHub Actions), add the two Supabase values as
repository **Variables**, and the workflow publishes to
`https://<user>.github.io/<repo>/`. Guide → [`docs/GITHUB_PAGES.md`](docs/GITHUB_PAGES.md).

## ✨ What works (real data)
- **Auth** — email/password sign-up & sign-in (Supabase Auth) with role (passenger/driver).
- **Search** — filter by route, date, price, AC; **only verified drivers** are shown.
- **Booking** — atomic seat reservation via a Postgres function; booking reference generated.
- **Driver** — add a vehicle (photo → Storage), publish a trip, see wallet & trips.
- **Admin** — live analytics; approve/reject driver verification.
- **Payments** — instant test-confirm client-side; real Paystack via the Edge Function.

## 🔐 Notes before production
- Lock down the demo-permissive `admin_*` SQL functions to real admins.
- Re-enable email confirmation in Supabase Auth.
- Deploy the Paystack Edge Function for real payments (secret key stays server-side).
- Consider a proper KYC provider for NIN verification (never store raw NIN in the browser).

---
MIT © NaijaRide
