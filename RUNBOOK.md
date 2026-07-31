# RUNBOOK — from your saved repo to a live URL on your NEW repo

You keep ALL your design files. This kit adds a deploy + feature layer and pushes
to your new GitHub repo. ~15 minutes.

## 0. Prereqs
- Node 20+, git, a GitHub account, a Supabase project.

## 1. Get a fresh copy of your saved repo
```bash
git clone https://github.com/<you>/<OLD_REPO>.git naijaride-new
# (or copy your saved folder to ./naijaride-new)
```

## 2. Apply this kit onto it (one command)
Unzip this kit, then from inside the kit folder:
```bash
bash apply-merge.sh /full/path/to/naijaride-new
```
This copies the merge files in, deletes the 3 incompatible files, and rewrites the
trip links — automatically.

## 3. Point it at your NEW GitHub repo and push
```bash
cd /full/path/to/naijaride-new
npm install
rm -rf .git                      # detach from the old repo history (optional)
git init && git add . && git commit -m "NaijaRide (merged for GitHub Pages)"
git branch -M main
git remote add origin https://github.com/<you>/<NEW_REPO>.git
git push -u origin main
```

## 4. Turn on GitHub Pages + add Supabase keys
- Repo → Settings → Pages → Source = GitHub Actions.
- Repo → Settings → Secrets and variables → Actions → Variables → add:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
- Push again (or Actions → Run workflow). Live at:
  https://<you>.github.io/<NEW_REPO>/

## 5. Supabase SQL (so data + admin work)
In Supabase → SQL Editor, run both files in supabase/migrations/ from this kit.
Then make yourself admin:
```sql
select id, full_name, phone from public.profiles;   -- copy your id
update public.profiles set role = 'admin' where id = 'YOUR-UUID';
```

## 6. (Optional) email + WhatsApp confirmations
Deploy the function and set secrets (see comments in the notify migration + function).

Done — same design, now live on the web and installable as an app.
