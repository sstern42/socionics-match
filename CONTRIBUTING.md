# Contributing to Socion™

Socion is open source under the MIT licence. The matching logic — the intertype relations matrix and type confidence scoring — is published and auditable. Community trust through transparency is a core principle of the project.

## Current state

Socion launched on 25 March 2026. As of late March 2026 the app has 40+ members across 7+ countries with all 16 intertype relations represented in real connections. The core matching loop — onboarding, feed, connect, message, feedback — is live and working.

## What this repo contains

The full frontend React app (`src/`) and the Supabase schema and SQL files (`supabase/`). Key files:

- `src/data/relations.js` — the intertype relations matrix. Single source of truth for all matching logic.
- `src/lib/feed.js` — feed filtering and match creation.
- `src/lib/messages.js` — messaging and match retrieval.
- `supabase/schema.sql` — database schema.
- `supabase/rls_reset.sql` — full Row Level Security policy set.
- `supabase/get_admin_stats.sql` — SECURITY DEFINER function for site-wide admin analytics.

## How to contribute

**Bug reports** — open a GitHub issue with steps to reproduce. Screenshots welcome.

**Matrix corrections** — open an issue citing the specific relation pair and the source you are working from. The SLIDE System™ framework underlies the typing logic; corrections should reference established Socionics literature.

**Feature suggestions** — open an issue before building. The product direction is intentional. Describe the use case, not just the feature.

**Pull requests** — welcome for bug fixes and small improvements. For larger changes, open an issue first to discuss scope. PRs should be focused and not bundle unrelated changes.

**Socionics expertise** — if you have deep knowledge of the theory and spot an inconsistency in how types or relations are described, open an issue. Type descriptions and relation copy are in `src/data/relations.js` and referenced throughout.

## Local setup

See the README for full setup instructions.

You will need your own Supabase project — the schema is in `supabase/schema.sql`. Run `rls_reset.sql` after schema setup to apply Row Level Security policies. Do not commit credentials.

Environment variables required (see `.env.example`):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_CLIENT_ID` — for Google One Tap sign-in

## Code style

No strict linter beyond the default ESLint config. A few principles:

- Keep the intertype relations matrix as a single source of truth — derive from it, do not duplicate it.
- Feed filtering happens server-side (Postgres `.in()`) not client-side. Keep it that way.
- Profile data lives in `profile_data` JSONB — new profile fields go there, not as new columns.
- Fire-and-forget analytics via `window.umami?.track()` — always use optional chaining so it fails silently if Umami hasn't loaded.
- No new dependencies without a clear reason.

## Licence

By contributing, you agree that your contributions will be licensed under the MIT Licence.

The SLIDE System™ is a trademark of Spencer Stern. The open source licence applies to the code; it does not grant rights to use the SLIDE System™ name or methodology commercially.
