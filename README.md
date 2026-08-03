# Socion™

**Match by personality type, not algorithm.** → [socion.app](https://socion.app)

Socionics maps 16 named relationship dynamics between every pair of the 16 personality types. Socion puts that theory in your hands — you pick the dynamic, the app shows you who fits.

- **Dual** — natural complementarity, each fills the other's blind spots
- **Mirror** — intellectually aligned, prone to mutual challenge  
- **Activity** — energising and stimulating at a distance  
- ...and 13 further named dynamics, each with a distinct character

Not a black box. The matching logic is in [src/data/relations.js](src/data/relations.js) — open and auditable.

**[Try it at socion.app →](https://socion.app)**

---

## How it works

1. Enter your Socionics type (or find it with a free, adaptive typing chat)
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

### Environment variables

`.env.example` is the canonical list. Every `VITE_*` var is inlined into the
client bundle at build time and is therefore public — none of them may hold a
secret.

| Variable | Required | Used for |
|---|---|---|
| `VITE_SUPABASE_URL` | yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | yes | Supabase anon key |
| `VITE_GOOGLE_CLIENT_ID` | no | Google One Tap sign-in (see below); without it, email OTP still works |
| `VITE_VAPID_PUBLIC_KEY` | no | Web push subscriptions; without it, push can't be enabled |
| `VITE_GIPHY_API_KEY` | no | GIF picker in messages and rooms; without it, the GIF button is hidden. Use a public, rate-limited key from [developers.giphy.com](https://developers.giphy.com) |

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Apply everything in `supabase/migrations/` in filename order — `supabase db push`, or paste each file into the SQL editor. The first three files carry the base schema (tables, RLS policies, swipe mode), so this replaces the old "run schema.sql, then rls_reset.sql, then …" sequence.
3. Create the `avatars` storage bucket and its policies with `supabase/avatars.sql`
4. Store the service role key in Vault and schedule the cron jobs with `supabase/stats.sql` (see the comments in that file)
5. Copy your project URL and anon key into `.env`

Realtime on `messages` is handled by `20260527130000_baseline_rls_policies.sql`.

> **A database rebuilt this way is not yet a complete copy of production.** Several tables and RPCs were created by hand in the SQL editor and never captured in any file. See [`supabase/PRODUCTION_ONLY_OBJECTS.md`](supabase/PRODUCTION_ONLY_OBJECTS.md) for the inventory and how to close it.

### Migrations

Schema changes live in `supabase/migrations/` and are applied in **lexical filename order**, so every file is named `YYYYMMDDHHMMSS_description.sql` — a full 14-digit timestamp, unique across the directory. See [CONTRIBUTING](CONTRIBUTING.md#database-migrations) before adding one.

The base schema is the first three files:

| File | Description |
|---|---|
| `20260501000000_initial_schema.sql` | Core tables (users, matches, messages, blocks, stats, …) |
| `20260527130000_baseline_rls_policies.sql` | Row Level Security policies + realtime on `messages` |
| `20260527140000_baseline_swipe_mode.sql` | Swipes table, mutual-match trigger, `already_swiped` view |

The hand-run files still in `supabase/` (`schema.sql`, `rls_reset.sql`, `blocks.sql`, `swipes_schema.sql`, `push_subscriptions.sql`, `get_admin_stats.sql`) are kept for historical reference only — the migrations above supersede them. `avatars.sql` and `stats.sql` are still live, for the storage bucket and the cron jobs respectively.

## Deploy

Push to `main` — Netlify deploys automatically.

Set the same environment variables in the Netlify dashboard — see the
[table above](#environment-variables).

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
    feed/
      ProfileCard.jsx
      SwipeCard.jsx, SwipeDeck.jsx  Swipe-to-connect UI
      MatchModal.jsx                New match overlay
      SeekingYou.jsx               Incoming interest indicator
      FeedAd.jsx
    messages/
      Conversation.jsx, MatchList.jsx
      PushModal.jsx, NotificationPrompt.jsx
    onboarding/
      EntryChoice.jsx, TypeSelector.jsx
    profile/
      PurposePicker.jsx, RelationPicker.jsx, DynamicsTab.jsx, ProfileNav.jsx
    AnnouncementBanner.jsx
    FeedbackButton.jsx
    GifPicker.jsx
    IOSInstallBanner.jsx
    Layout.jsx
    NotificationBell.jsx
    SIWebview.jsx                   In-app socionicsinsight.com webview
    SocionicsChat.jsx               AI Socionics chat widget
  data/
    relations.js    Intertype relations matrix (16×16, fully validated)
    compatibility.js
    books.js
    countries.js
  hooks/
    useNotifications.js
    usePageTitle.js
    useQuadraRoom.js
  lib/
    AuthContext.jsx
    ThemeContext.jsx
    auth.js
    archive.js       Archive/unmatch logic
    blocks.js        Cool-off and block/report logic
    feed.js
    messages.js
    notifications.js
    premium.js
    profile.js
    profileViews.js
    rooms.js
    supabase.js
    typists.js
    unmatch.js
    usePushNotifications.js
    useUnreadCount.js
  pages/
    About.jsx
    Admin.jsx            Founder-only dashboard (/admin)
    AskPage.jsx          AI Socionics Q&A (premium)
    Auth.jsx             Google One Tap + magic link
    Changelog.jsx
    Feed.jsx
    Feedback.jsx
    Help.jsx
    Home.jsx
    Messages.jsx
    Network.jsx          Type network visualisation
    NotFound.jsx
    Onboarding.jsx
    Premium.jsx, PremiumWelcome.jsx
    Privacy.jsx
    ProfileDynamics.jsx
    ProfileEdit.jsx
    ProfileNotifications.jsx
    ProfileSetup.jsx
    Rooms.jsx            Quadra group chat rooms
    Saved.jsx            Saved / bookmarked profiles
    Settings.jsx
    Stats.jsx            Platform statistics
    Support.jsx
    Terms.jsx
    Typing.jsx, TypistProfile.jsx   Typing directory
    Updates.jsx
    UserProfile.jsx      Public profile view
supabase/
  schema.sql              Full data model — run once
  rls_reset.sql           Row Level Security policies — run once (safe to re-run)
  blocks.sql              Blocks table + RLS
  stats.sql               Stats table + scheduled edge function
  push_subscriptions.sql  Push notification subscriptions
  swipes_schema.sql       Swipes table
  avatars.sql             Storage bucket policies
  get_admin_stats.sql     Admin stats SECURITY DEFINER function
  migrations/             Incremental schema changes (see Supabase setup above)
  functions/
    compute-stats/        Edge function for platform statistics
```

## Routes

| Path | Description |
|---|---|
| `/` | Landing page |
| `/onboarding` | Signup flow — purpose, then self-select a type or a starting guess |
| `/auth` | Sign in — Google One Tap + magic link |
| `/profile/setup` | Profile creation (post-auth) |
| `/profile/edit` | Edit profile and purpose |
| `/profile/dynamics` | Edit intertype dynamics preferences |
| `/profile/notifications` | Notification settings |
| `/profile/:userId` | Public profile view |
| `/feed` | Matching feed with relation filtering |
| `/messages` | Messaging with realtime and deep-link support |
| `/rooms` | Quadra group chat rooms |
| `/feedback/:matchId` | Post-match relation rating |
| `/network` | Type network visualisation |
| `/typing` | Typing directory |
| `/typing/chat` | Free adaptive typing chat — signup and retake |
| `/typing/:slug` | Individual typist profile |
| `/saved` | Saved / bookmarked profiles |
| `/premium` | Premium subscription |
| `/premium/welcome` | Post-subscription welcome |
| `/ask` | AI Socionics Q&A (premium) |
| `/stats` | Platform statistics |
| `/settings` | Account settings |
| `/about` | About page |
| `/help` | Help centre |
| `/support` | Support contact |
| `/updates` | Product updates |
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
- **Phase 5+** ✅ Google One Tap, OTP auth, block/report, admin dashboard, push notifications, reply threading, typing indicators, PWA manifest, Discord integration, account deletion, premium subscriptions, quadra group chat rooms, swipe-deck UI, emoji reactions, GIF picker, image attachments, typing directory, saved profiles, settings page, platform stats, network visualisation, AI Socionics Q&A, profile views, archive/unmatch, theme system, updates feed

## Related

- [socionicsinsight.com](https://socionicsinsight.com) — reference site, type profiles, and relation pages
- [spencerstern.com](https://spencerstern.com)
