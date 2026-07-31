# Deploying to GitHub Pages

The Next.js app is exported as a **static site** (`output: 'export'` → `frontend/out`) and
published by the included workflow (`.github/workflows/deploy-pages.yml`). It talks directly
to **Supabase** for data, so there's no backend to host.

> Do **Supabase setup first**: [`SUPABASE.md`](SUPABASE.md).

## Step 1 — Push to GitHub
```bash
cd naijaride
git init
git add .
git commit -m "NaijaRide (Supabase)"
git branch -M main
git remote add origin https://github.com/<USER>/<REPO>.git
git push -u origin main
```

## Step 2 — Enable Pages
Repo → **Settings → Pages** → **Build and deployment → Source = GitHub Actions**.

## Step 3 — Add repository variables
Repo → **Settings → Secrets and variables → Actions → Variables**:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon public key |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | *(optional)* |

## Step 4 — Deploy
Push to `main`, or **Actions → “Deploy frontend to GitHub Pages” → Run workflow**.
Your site goes live at:
```
https://<USER>.github.io/<REPO>/
```

## Local preview of the static build
```bash
cd frontend
npm install
NEXT_PUBLIC_BASE_PATH="" npm run build
npx serve out            # http://localhost:3000
```

## How `basePath` works
Project sites live at `/<repo>`, so the workflow injects `NEXT_PUBLIC_BASE_PATH=/<repo>`
at build time. Locally (`npm run dev`) it's empty, so everything works at
`http://localhost:3000`.

## Custom domain
Add `frontend/public/CNAME` with your domain, set DNS, and remove the
`NEXT_PUBLIC_BASE_PATH` line from the workflow (root domains need no basePath).
