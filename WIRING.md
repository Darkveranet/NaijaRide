# NaijaRide — Wiring Update (admin lockdown + real Paystack)

Drop these files into the project you already downloaded (`naijaride/`), keeping the
same paths, then follow the steps below.

```
naijaride-wiring/
├── supabase/
│   ├── schema_admin_lockdown.sql        → run in Supabase SQL Editor
│   └── functions/paystack/index.ts      → replaces existing Edge Function
└── frontend/src/
    ├── lib/payments.ts                   → NEW file
    └── app/trip/page.tsx                 → replaces existing trip page
```

---

## A. Secure the admin functions (2 min)

1. In Supabase → **SQL Editor**, paste all of
   [`supabase/schema_admin_lockdown.sql`](supabase/schema_admin_lockdown.sql) → **Run**.
   This makes `admin_analytics` / `admin_set_verified` **admin-only** and adds a trigger
   that stops users from self-verifying or changing their own role/KYC.
2. **Make yourself the first admin** (nobody is an admin yet):
   - Sign up / log in once so your `profiles` row exists.
   - Run: `select id, first_name, phone from public.profiles;` and copy your id.
   - Run: `update public.profiles set role = 'ADMIN' where id = 'YOUR-UUID';`
3. Now the **/admin** page works for you, and drivers can no longer self-verify.

## B. Turn on real Paystack payments

### 1. Deploy the Edge Function
Install the Supabase CLI, then from the project root:
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy paystack --no-verify-jwt
supabase secrets set \
  PAYSTACK_SECRET_KEY=sk_test_or_live_xxx \
  SUPABASE_URL=https://YOUR.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Point Paystack's webhook at it
Paystack dashboard → **Settings → API Keys & Webhooks → Webhook URL**:
```
https://YOUR_PROJECT_REF.functions.supabase.co/paystack/webhook
```

### 3. Add your Paystack PUBLIC key to the frontend
- Local: add to `frontend/.env.local`
  ```
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_or_live_xxx
  ```
- GitHub Pages: add repo **Variable** `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` (Settings →
  Secrets and variables → Actions → Variables), then re-run the deploy workflow.

### How it flows
1. Passenger clicks **Pay** → `createBooking` reserves seats (status `PENDING`).
2. Browser calls the Edge Function `/initialize` (secret key stays server-side) and gets a
   Paystack `authorization_url`.
3. Redirect to Paystack hosted checkout (card / transfer / USSD / Apple Pay).
4. On success Paystack redirects back to your **/dashboard/passenger/?paid=1** and, in
   parallel, calls the **/webhook** which verifies the HMAC-SHA512 signature and flips the
   booking to `CONFIRMED`.

> **No `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` set?** The app stays in the safe **test flow**:
> bookings confirm instantly so you can still demo the full journey.

## C. Rebuild / redeploy
```bash
cd frontend && npm run build     # verify it compiles
git add . && git commit -m "wire admin lockdown + Paystack" && git push
```
The Pages workflow redeploys automatically.
