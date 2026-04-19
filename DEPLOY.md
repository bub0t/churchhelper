Deploying to Vercel (quick checklist)

This document lists the recommended steps and environment configuration to deploy Church Helper to Vercel (App Router + server API routes).

## 1) Required environment variables (set in Vercel → Project → Settings → Environment Variables)

- `OPENAI_API_KEY` — server-only secret (used by server routes)
- `OPENWEATHER_API_KEY` — server-only secret
- `SUPABASE_URL` — your Supabase URL (can be public, but prefer using `NEXT_PUBLIC_SUPABASE_URL` for client use)
- `SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` — client-safe anon key (if client uses Supabase)
- `SUPABASE_SERVICE_KEY` — server-only secret (required to persist/search embeddings in Supabase)
- `DEMO_USER` (optional) — demo login id (default `CBC`) for the demo fallback
- `DEMO_PASSWORD` (optional) — demo login password (enables demo fallback when set)
- Any other envs used locally (e.g., `SONG_EMBED_PATH`, `DEV_DEMO_PASSWORD`) — keep service keys server-only

Notes:
- Only server-only secrets should be left without the `NEXT_PUBLIC_` prefix. Do NOT expose `SUPABASE_SERVICE_KEY` or `OPENAI_API_KEY` to the browser.
- The app will refuse to write fallback embeddings in production unless `SUPABASE_SERVICE_KEY` is present.

## 2) Database migrations (run before using DB-backed features)

Create the required tables (`song_embeddings`, `churches`) in your Supabase DB. Options:

- Supabase CLI (recommended if you use migrations):

```bash
# login & push migrations (depends on your workflow)
supabase login
supabase db push
```

- Or run SQL files manually:

```bash
psql <CONNECTION_STRING> -f sql/migrations/20260419_create_song_embeddings.sql
psql <CONNECTION_STRING> -f sql/migrations/20260419_create_churches.sql
```

## 3) Seed a demo church (optional, local/manual)

For quick local testing you can upsert a demo `churches` row with a hashed password using the included seed script:

```bash
export SUPABASE_URL=your_supabase_url
export SUPABASE_SERVICE_KEY=your_supabase_service_key
export DEMO_PASSWORD='MyDemoPassword'
npm run seed
```

The seed script uses `DEMO_PASSWORD` to create a bcrypt hash and upsert an `id=CBC` row. This is safe to run locally (do not commit service keys).

## 4) Build & deploy on Vercel

- Vercel will run `npm run build` (the `build` script uses `next build`). No `next.config.js` is required for a default App Router deploy.
- Use Node 18+ runtime if you must set a specific Node version in Project Settings.

## 5) One-time embedding rebuild (after deploy + service key)

If you want embeddings persisted to Supabase, trigger the rebuild endpoint once (after `SUPABASE_SERVICE_KEY` is configured in Vercel):

```bash
curl -X POST https://<your-deployment>/api/embeddings/rebuild \
  -H "Content-Type: application/json" \
  -d '{"userId":"CBC"}'
```

This will compute embeddings and store them in `song_embeddings` (requires `SUPABASE_SERVICE_KEY`).

## 6) Demo login fallback (MVP convenience)

- The server supports a demo fallback when `DEMO_PASSWORD` (or legacy `DEV_DEMO_PASSWORD`) is set. This allows quick MVP deployments without full auth.
- To enable: set `DEMO_USER` and `DEMO_PASSWORD` in Vercel. Remove these envs before moving to production auth.

## 7) Filesystem and serverless notes

- Vercel's project filesystem is read-only at runtime. The app uses the OS temp dir (`/tmp`) for non-production fallbacks. In production the app refuses to write fallback files and requires `SUPABASE_SERVICE_KEY`.

## 8) Post-deploy verification

- Confirm the `song_embeddings` and `churches` tables exist in Supabase.
- Call the embeddings rebuild endpoint and verify rows in `song_embeddings`.
- Log in via the UI (either Supabase Auth or demo credentials) and confirm `/api/songs` and `/api/themes` work.

## 9) Security & housekeeping

- NEVER commit `.env.local` or service keys. Add `.env.local` to `.gitignore`.
- Rotate and revoke keys if they were accidentally committed. Use Supabase/GCP/OpenAI dashboards to regenerate keys.
- Ensure `SUPABASE_SERVICE_KEY` and `OPENAI_API_KEY` are configured only as server-only secrets in Vercel.

## 10) Automation (optional enhancements)

- Add a GitHub Action to run migrations (or call Supabase CLI) after merging to `main`.
- Add a deployment job to call `/api/embeddings/rebuild` once `SUPABASE_SERVICE_KEY` is available.

If you'd like, I can add a `.env.example` file, update `README.md` with exact Vercel instructions, or add an automated migration workflow. Tell me which and I will implement it.
