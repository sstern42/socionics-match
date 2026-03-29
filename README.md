# Socion

**Match by personality type, not algorithm.** → [socion.app](https://socion.app)

Socionics maps 16 named relationship dynamics between every pair of the 16 personality types. Socion puts that theory in your hands — you pick the dynamic, the app shows you who fits.

- **Dual** — natural complementarity, each fills the other's blind spots
- **Mirror** — intellectually aligned, prone to mutual challenge  
- **Activity** — energising and stimulating at a distance  
- ...and 13 further named dynamics, each with a distinct character

Not a black box. The matching logic is in [](src/data/relations.js) — open and auditable.

**[Try it at socion.app →](https://socion.app)**

---

## How it works

1. Enter your Socionics type (or complete the onboarding questionnaire)
2. Choose which intertype dynamics you want to match on
3. Browse profiles whose type produces your chosen relation with yours
4. Connect and message

The theory makes falsifiable predictions — the app is designed to test them at scale.

## Stack

- **Frontend**: React + Vite
- **Backend/DB**: Supabase (Postgres, Auth, Realtime)
- **Hosting**: Netlify (auto-deploy from GitHub)
- **Domain**: socion.app → Netlify via Cloudflare CNAME
- **Auth**: Google One Tap + OTP code (email)
- **Email**: Resend
- **Analytics**: Umami (cookieless)

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
4. Run `supabase/blocks.sql` to create the blocks table
5. Run `supabase/stats.sql` to create the stats table and scheduled job
6. Enable realtime on the `messages` table (handled by `rls_reset.sql`)
7. Copy your project URL and anon key into `.env`

### Required SQL functions

Run these in the Supabase SQL editor:

```sql
-- Merge profile_data JSONB without overwriting manual fields (e.g. role)
create or replace function merge_profile_data(
  p_user_id uuid, p_data jsonb, p_type text, p_avatar_url text default null
) returns void language plpgsql security definer as $$
begin
  update users set
    profile_data = profile_data || p_data,
    type = p_type,
    avatar_url = coalesce(p_avatar_url, avatar_url)
  where id = p_user_id;
end; $$;

-- Admin stats — bypasses RLS for platform-wide counts
create or replace function get_admin_stats() returns jsonb language plpgsql security definer as $$
declare result jsonb;
begin
  select jsonb_build_object(
    'connections', (select count(*) from matches),
    'messages', (select count(*) from messages),
    'assessments', (select count(*) from type_assessments),
    'cooloffs', (select count(*) from blocks where type = 'cooloff'),
    'reports', (select count(*) from blocks where type = 'block' and reason is not null),
    'recent_blocks', (select jsonb_agg(b) from (select id, type, reason, created_at from blocks order by created_at desc limit 20) b)
  ) into result;
  return result;
end; $$;
```

## Deploy

Push to `main` — Netlify deploys automatically.

Set environment variables in the Netlify dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_CLIENT_ID` (for Google One Tap)

### Google One Tap setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web application)
3. Add `https://socion.app` and `http://localhost:5173` as authorised JavaScript origins
4. Add your Supabase callback URL as an authorised redirect URI
5. Enable Google as a provider in Supabase Authentication → Providers
6. Add `VITE_GOOGLE_CLIENT_ID` to Netlify environment variables

## Structure

```
src/
  components/
    feed/         ProfileCard
    messages/     Conversation, MatchList
    onboarding/   EntryChoice, QuestionScreen, ResultScreen, TypeSelector
    profile/      PurposePicker, RelationPicker
    Layout.jsx
  data/
    relations.js  Intertype relations matrix (16×16, fully validated)
    questions.js  Type questionnaire
    scoring.js    Type distribution computation
    countries.js
  lib/
    AuthContext.jsx
    auth.js
    blocks.js     Cool-off and block/report logic
    feed.js
    messages.js
    profile.js
    supabase.js
    useUnreadCount.js
  pages/
    Admin.jsx     Founder-only dashboard (/admin)
    Auth.jsx      Google One Tap + magic link
    Changelog.jsx
    Feed.jsx
    Feedback.jsx
    Home.jsx
    Messages.jsx
    NotFound.jsx
    Onboarding.jsx
    Privacy.jsx
    ProfileEdit.jsx
    ProfileSetup.jsx
    Terms.jsx
supabase/
  schema.sql        Full data model — run once
  rls_reset.sql     Row Level Security policies — run once (safe to re-run)
  blocks.sql        Blocks table + RLS
  stats.sql         Stats table + scheduled edge function
  avatars.sql       Storage bucket policies
  functions/
    compute-stats/  Edge function for platform statistics
```

## Routes

| Path | Description |
|---|---|
| `/` | Landing page |
| `/onboarding` | Type questionnaire |
| `/auth` | Sign in — Google One Tap + magic link |
| `/profile/setup` | Profile creation (post-auth) |
| `/profile/edit` | Edit profile, dynamics, and purpose |
| `/feed` | Matching feed with relation filtering |
| `/messages` | Messaging with realtime and deep-link support |
| `/feedback/:matchId` | Post-match relation rating |
| `/admin` | Founder dashboard (role-gated) |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/changelog` | What's new |

## Intertype relations matrix

The full 16×16 matrix lives in `src/data/relations.js` and is sourced from [socionicsinsight.com](https://www.socionicsinsight.com/compatibility/matrix/). All 256 cells are validated for symmetry and correct asymmetric inverse pairs (Supervisor/Supervisee, Benefactor/Beneficiary).

## Block & report

Two-tier system:

- **Cool off** — 7 day mutual pause. Feed hidden, messaging disabled, conversation preserved. Lifts automatically. Either party can lift early.
- **Block & report** — permanent. Reason required (spam, inappropriate content, or other). Reports visible to founder in admin dashboard.

## Build phases

- **Phase 0** ✅ Infrastructure — React scaffold, Supabase schema, Netlify deploy
- **Phase 1** ✅ Type onboarding questionnaire
- **Phase 2** ✅ Auth + profile creation
- **Phase 3** ✅ Matching feed with relation filtering
- **Phase 4** ✅ Messaging + realtime
- **Phase 5** ✅ Launch — socion.app live, repo public
- **Phase 5+** ✅ Google One Tap, OTP auth, block/report, admin dashboard, push notifications, reply threading, typing indicators, PWA manifest, Discord integration, account deletion

## Related

- [socionicsinsight.com](https://socionicsinsight.com) — reference site, type profiles, and relation pages
- [spencerstern.com](https://spencerstern.com)
