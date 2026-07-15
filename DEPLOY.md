# Deploying worldmarkets.in (all free tiers)

Architecture: **FastAPI backend on Render** + **Next.js frontend on Vercel**, with the
paid domain `worldmarkets.in` pointed at Vercel. InfinityFree is not used (it cannot
run Python or Node).

```
Browser ──> https://worldmarkets.in (Vercel, Next.js)
                      │  polls every 30 s
                      ▼
        https://worldmarkets-api.onrender.com (Render, FastAPI)
                      │  cached fetches (60 s+)
                      ▼
        Yahoo Finance / CoinGecko / AMFI / RSS
```

## Step 0 — Push this folder to GitHub (one time)

The local git repo and first commit already exist. Create an empty repo on
github.com (e.g. `worldmarkets`), then:

```
cd D:\Manoj\worldmarkets.in
git remote add origin https://github.com/<your-username>/worldmarkets.git
git push -u origin main
```

## Step 1 — Backend on Render

1. Sign up at https://render.com with your GitHub account.
2. Click **New → Blueprint** and select the `worldmarkets` repo.
   Render reads [render.yaml](render.yaml) automatically — it builds from the
   `backend/` folder and starts uvicorn on Render's `$PORT`. Pick the **Free** plan.
3. When the deploy finishes, note your URL, e.g. `https://worldmarkets-api.onrender.com`.
4. Test it: open `https://<your-render-url>/api/markets` — you should see JSON.

Notes:
- CORS is controlled by the `CORS_ORIGINS` env var (already set in render.yaml to
  allow `worldmarkets.in`). Add more origins there if needed, comma-separated.
- **Free tier sleeps after ~15 min idle** (first request then takes 30–60 s).
  Fix: create a free account at https://cron-job.org and add a job that GETs
  `https://<your-render-url>/api/health` every 10 minutes.

## Step 2 — Frontend on Vercel

1. Sign up at https://vercel.com with your GitHub account.
2. **Add New → Project**, import the `worldmarkets` repo.
3. Set **Root Directory** to `frontend` (important — it's a monorepo). Framework
   auto-detects as Next.js; leave build settings as-is.
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL` = `https://<your-render-url>` (no trailing slash)
5. Deploy. Verify the `*.vercel.app` preview URL shows live prices.

## Step 3 — Point worldmarkets.in at Vercel

1. In the Vercel project: **Settings → Domains → Add** `worldmarkets.in` and
   `www.worldmarkets.in`. Vercel shows the exact DNS records it wants.
2. At your domain registrar's DNS panel (wherever you bought worldmarkets.in —
   if its nameservers currently point to InfinityFree, change them back to the
   registrar's own or use Vercel's nameservers), set:
   - `A` record, host `@`, value `76.76.21.21`
   - `CNAME` record, host `www`, value `cname.vercel-dns.com`
3. Wait for DNS to propagate (minutes to a few hours). Vercel then issues the
   SSL certificate automatically.

## Step 4 — Verify production

- https://worldmarkets.in loads the dashboard with live prices.
- Browser dev tools → Network: `/api/markets` calls go to the Render URL and
  return 200 with `access-control-allow-origin: https://worldmarkets.in`.
- Render dashboard → Logs: `[FETCH]` lines appear at most once per 60 s per
  data source no matter how many visitors are polling.

## Local development (unchanged)

- Backend: `backend\venv\Scripts\uvicorn main:app --port 8787 --app-dir backend`
- Frontend: `frontend\dev.cmd` (adds the portable Node at `D:\Manoj\tools\node`
  to PATH), reads `frontend/.env.local` (copy from `.env.example`).

## Free-tier gotchas to remember

| Issue | Symptom | Mitigation |
|---|---|---|
| Render sleep | First load takes ~1 min | cron-job.org pinger on /api/health |
| Yahoo blocks datacenter IPs sometimes | indices/commodities empty, `[FETCH-FAIL]` in Render logs | Cache serves stale data; usually transient |
| CoinGecko free rate limit (~30 req/min) | crypto tile empty | Our cache = 1 req/min, safely under |
| Altiva SIF not in AMFI dump yet | NAV shows static ₹185.32 "indicative" | Auto-resolves once AMFI lists it |
