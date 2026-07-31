# Supabase setup — real data with no backend

NaijaRide's frontend talks **directly to Supabase** (Postgres + Auth + Storage) from the
browser. There is **no server to run** — perfect for GitHub Pages.

---

## 1. Create a Supabase project
1. Go to <https://supabase.com> → **New project** (free tier is fine).
2. Choose a region close to Nigeria (e.g. **EU West / London**) for lower latency.
3. Wait for it to provision.

## 2. Run the SQL
In the Supabase dashboard → **SQL Editor** → **New query**:
1. Paste all of [`supabase/schema.sql`](../supabase/schema.sql) → **Run**.
2. Paste all of [`supabase/seed.sql`](../supabase/seed.sql) → **Run**.

This creates the tables, Row-Level Security policies, the signup trigger, the atomic
booking function, storage buckets, and sample verified drivers + upcoming trips.

## 3. Turn off email confirmation (for quick testing)
**Authentication → Providers → Email** → disable **“Confirm email”**.
(With it on, new users must click a link before they can sign in — fine for production,
inconvenient for a demo. You can re-enable it later.)

## 4. Get your API keys
**Project Settings → API** → copy:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> The **anon** key is safe to expose in the browser — RLS policies protect your data.
> Never put the **service_role** key in the frontend.

## 5. Run locally
```bash
cd frontend
cp .env.example .env.local     # paste your URL + anon key
npm install
npm run dev                    # http://localhost:3000
```
The banner turns **green** ("Live — connected to Supabase") when configured.

## 6. Deploy to GitHub Pages
Add the same values as **repository variables**
(Settings → Secrets and variables → Actions → **Variables**):

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | your project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon public key |

Then push to `main` (or run the workflow). See [`GITHUB_PAGES.md`](GITHUB_PAGES.md).

### CORS
Supabase allows all origins by default, so your `*.github.io` site works out of the box.
To restrict it, use **Authentication → URL Configuration**.

---

## Try the full flow
1. **Register** as a passenger → **Search** (Lagos → Ibadan) → open a trip → **Book**.
   Check **My bookings** — the row is real, stored in Postgres.
2. **Register** as a driver → **Admin** page → **Approve** the driver (demo-permissive).
   Back in the **Driver dashboard**, **Add a vehicle** (photo uploads to Storage),
   then **Publish a trip** — it appears in search immediately.

## Payments (optional, real)
Client-side we confirm bookings directly (test flow). For **real** Paystack payments,
deploy the included Edge Function so the secret key and webhook verification stay server-side:
```bash
supabase functions deploy paystack --no-verify-jwt
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxx \
  SUPABASE_URL=https://YOUR.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```
Set the Paystack dashboard webhook to:
`https://YOUR-PROJECT.functions.supabase.co/paystack/webhook`

## Locking down admin (production)
The `admin_analytics` and `admin_set_verified` functions are **demo-permissive**.
Before going live, edit them (in `schema.sql`) to require
`(select role from profiles where id = auth.uid()) = 'ADMIN'`.
