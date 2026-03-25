# Socion

Socionics-based matching. [socion.app](https://socion.app)

Match by intertype relation, not algorithm. Socionics maps 16 named relationship dynamics between every personality type. Socion puts that theory in users' hands — you choose the dynamic, the system shows you who fits.

## How it works

1. Complete a type questionnaire or enter your type directly
2. Select which intertype dynamics you want to match on (Dual, Mirror, Activity, or any of the 16)
3. Browse profiles whose type produces your chosen relation
4. Connect and message

The matching logic is in [`src/data/relations.js`](src/data/relations.js) — fully open and auditable.

## Stack

- **Frontend**: React + Vite
- **Backend/DB**: Supabase (Postgres, Auth, Realtime)
- **Hosting**: Netlify (auto-deploy from GitHub)
- **Domain**: socion.app → Netlify via Cloudflare CNAME

## Local setup

```bash
git clone https://github.com/sstern42/socionics-match.git
cd socionics-match
npm install
cp .env.example .env   # fill in Supabase credentials
npm run dev
```

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL editor to create tables
3. Run `supabase/rls_reset.sql` to configure Row Level Security policies
4. Enable realtime on the `messages` table (handled by `rls_reset.sql`)
5. Copy your project URL and anon key into `.env`

## Deploy

Push to `main` — Netlify deploys automatically.

Set environment variables in the Netlify dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Structure

```
src/
  components/   Layout, feed cards, messaging UI, relation picker
  data/         Intertype relations matrix (relations.js)
  lib/          Supabase client, auth, profile, feed, messages
  pages/        Route-level components (Feed, Messages, ProfileSetup, ProfileEdit, ...)
supabase/
  schema.sql      Full data model — run once
  rls_reset.sql   Row Level Security policies — run once (safe to re-run)
```

## Routes

| Path | Description |
|---|---|
| `/` | Landing page |
| `/onboarding` | Type questionnaire |
| `/auth` | Sign in / sign up |
| `/profile/setup` | Profile creation (post-auth) |
| `/profile/edit` | Edit profile details and relation preferences |
| `/feed` | Matching feed |
| `/messages` | Messaging (supports `?match=uuid` deep link) |

## Intertype relations matrix

The full 16×16 matrix lives in `src/data/relations.js` and is sourced from [socionicsinsight.com](https://www.socionicsinsight.com/compatibility/matrix/). All 256 cells are validated for symmetry and correct asymmetric inverse pairs (Supervisor/Supervisee, Benefactor/Beneficiary).

## Build phases

- **Phase 0** ✅ Infrastructure — React scaffold, Supabase schema, Netlify deploy
- **Phase 1** ✅ Type onboarding questionnaire
- **Phase 2** ✅ Auth + profile creation
- **Phase 3** ✅ Matching feed with relation filtering
- **Phase 4** ✅ Messaging + realtime
- **Phase 5** ✅ Launch — socion.app live, repo public

## Related

- [socionicsinsight.com](https://socionicsinsight.com) — reference site and community
- [spencerstern.com](https://spencerstern.com)
