# NaijaRide — Setup & GitHub Pages deployment

This single project has **everything merged**: the app, real Supabase data, secure admin,
real Paystack payments, booking confirmations (email + WhatsApp), and a "Contact driver"
WhatsApp link. It deploys to **GitHub Pages** with **no backend server**.

The GitHub Actions workflow is **already configured** — you only set two repository
variables and enable Pages.

---

## STEP 1 — Supabase (one SQL file)
1. Create a free project at <https://supabase.com> (region: EU West / London is closest).
2. **SQL Editor → New query** → paste ALL of `supabase/setup.sql` → **Run**.
   (Creates tables, RLS, triggers, secure admin functions, storage, sample data.)
3. **Authentication → Providers → Email** → turn **off** "Confirm email" (easy testing).
4. **Project Settings → API** → copy **Project URL** and **anon public** key.

## STEP 2 — Push to GitHub
```bash
cd naijaride
git init && git add . && git commit -m "NaijaRide"
git branch -M main
git remote add origin https://github.com/<USER>/<REPO>.git
git push -u origin main
```

## STEP 3 — Enable Pages + add variables
1. Repo → **Settings → Pages → Source = GitHub Actions**.
2. Repo → **Settings → Secrets and variables → Actions → Variables → New variable**:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon public key
   - `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` = *(optional; only for real payments)*
3. Push again or **Actions → “Deploy frontend to GitHub Pages” → Run workflow**.

Your site goes live at: **https://<USER>.github.io/<REPO>/**

## STEP 4 — Make yourself admin
Sign up once in the app, then in Supabase SQL Editor:
```sql
select id, first_name, phone from public.profiles;      -- copy your id
update public.profiles set role = 'ADMIN' where id = 'YOUR-UUID';
```

That's the whole app live. Everything below is **optional**.

---

## Optional A — Real Paystack payments
Needs the Supabase CLI (`npm i -g supabase`):
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy paystack --no-verify-jwt
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_or_live_xxx \
  SUPABASE_URL=https://YOUR.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```
- Paystack dashboard → Webhook URL: `https://YOUR_PROJECT_REF.functions.supabase.co/paystack/webhook`
- Add repo Variable `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_...` and re-run the workflow.
- No public key set = safe test flow (bookings confirm instantly).

## Optional B — Email + WhatsApp booking confirmations
1. Free keys: **Resend** (<https://resend.com>, sender `onboarding@resend.dev`) and
   **Meta WhatsApp Cloud API** (token + phone ID; register your test number).
2. Deploy + secrets:
```bash
supabase functions deploy notify-booking --no-verify-jwt
supabase secrets set NOTIFY_SECRET=a-long-random-string \
  RESEND_API_KEY=re_xxx \
  MAIL_FROM="NaijaRide <onboarding@resend.dev>" \
  WHATSAPP_TOKEN=EAAG... WHATSAPP_PHONE_ID=1234567890 WHATSAPP_TEMPLATE=
```
3. In SQL Editor (same secret + your project ref), then reload:
```sql
alter database postgres set "app.notify_url"    = 'https://YOUR_PROJECT_REF.functions.supabase.co/notify-booking';
alter database postgres set "app.notify_secret" = 'a-long-random-string';
select pg_reload_conf();
```

---

## Run locally (optional — not required to deploy)
```bash
cd frontend
cp .env.example .env.local     # paste your Supabase URL + anon key
npm install
npm run dev                    # http://localhost:3000
```

## What's included
- **Auth** (email/password, roles) · **Search** (verified drivers only) · atomic **booking**
- **Driver**: add vehicle (photo → Storage), publish trip, wallet
- **Admin**: live analytics, approve/reject drivers (admin-only, secured)
- **Payments**: instant test-confirm, or real Paystack via Edge Function
- **Notifications**: email + WhatsApp on confirmed bookings (free tier)
- **Contact driver**: WhatsApp link on confirmed bookings (no keys needed)

## Common gotchas
- **Amber banner / no data:** repo variables not set, or `setup.sql` not run.
- **Admin page denied:** you didn't promote your profile to `role = 'ADMIN'`.
- **Payments do nothing:** that's the test flow — deploy the Paystack function + set the key.
- **Free Supabase paused:** it sleeps after ~1 week idle — resume in the dashboard.
