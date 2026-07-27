# AGENTS.md

## Cursor Cloud specific instructions

This is a Lovable-generated **Vite + React + TypeScript SPA** (shadcn/ui + Tailwind) with a **hosted Supabase** backend. It is a Brazilian real-estate management / land-regularization platform ("Tijolo em Capital"). There is no custom Node backend — the client talks directly to Supabase.

### Services & how to run
- **Frontend dev server** is the only service to run: `npm run dev` (Vite, serves on port **8080**). Scripts live in `package.json` (`dev`, `build`, `build:dev`, `lint`, `preview`, `test`).
- **Backend is a remote hosted Supabase project**, with public/anon credentials committed in `.env` (`VITE_SUPABASE_*`). No local database, Docker, or `supabase start` is needed for normal development.
- Package manager: use **npm** (`package-lock.json`). `bun.lock`/`bun.lockb` are also committed, but bun is not installed in this environment; npm is the supported path here.

### Auth / testing the app
- Entry route `/` is a Supabase-auth **login** page; `/admin/*` requires a logged-in user with an `admin` role or screen permissions. No admin credentials exist in the repo, so the admin area cannot be exercised without a real account.
- **Public, no-login routes** are the easiest way to exercise core functionality end-to-end:
  - Investor catalog: `/catalogo/:token` — validates the token against Supabase and lists published properties.
  - Broker submission: `/submit/:token`.
  - A working demo token exists in the hosted DB: `demo-investidor-2024` (e.g. `http://localhost:8080/catalogo/demo-investidor-2024`).
- Property images in the seed data render as broken icons (the stored image URLs are not served) — this is a data issue, not an environment problem.

### Lint / test / build gotchas
- `npm run lint` currently reports **pre-existing errors** (many `@typescript-eslint/no-explicit-any`); this is the repo's baseline, not a regression introduced by setup.
- `npm run test` (Vitest) passes but there are currently **no test files** (it reports "No test files found"). Vitest only picks up `src/**/*.{test,spec}.{ts,tsx}`.
- `npm run build` succeeds; the CSS `@import must precede...` and >500 kB chunk warnings are harmless.

### Optional / not required for core dev
- `supabase/functions/*` (Edge Functions: `generate-communication`, `generate-pdf`, `calculate-interest-score`) are optional. They only power AI WhatsApp message generation, PDF export, and lead scoring, and require the Supabase CLI + Docker plus a `LOVABLE_API_KEY` secret set in Supabase. The core app runs fine without them.
