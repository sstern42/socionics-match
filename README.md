# Socion

Socionics-based matching. [socion.app](https://socion.app)

Match by intertype relation, not algorithm. Socionics maps 16 named relationship dynamics between every personality type. Socion puts that theory in users' hands.

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
2. Run `supabase/schema.sql` in the SQL editor
3. Copy your project URL and anon key into `.env`

## Deploy

Push to `main` — Netlify deploys automatically.

Set environment variables in Netlify dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Structure

```
src/
  components/   Layout and shared UI
  data/         Intertype relations matrix (relations.js)
  lib/          Supabase client
  pages/        Route-level components
supabase/
  schema.sql    Full data model — run once in Supabase SQL editor
```

## Build phases

- **Phase 0** ✅ Infrastructure — React scaffold, Supabase schema, Netlify deploy
- **Phase 1** Type onboarding questionnaire
- **Phase 2** Profile creation and auth
- **Phase 3** Matching feed
- **Phase 4** Messaging and post-match feedback
- **Phase 5** Launch on r/socionics and English-language Discord servers

## Related

- [socionicsinsight.com](https://socionicsinsight.com) — reference site and community
- [spencerstern.com](https://spencerstern.com)
