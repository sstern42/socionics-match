# Socion™

**Match by personality type, not algorithm.** → [socion.app](https://socion.app)

Socionics maps 16 named relationship dynamics between every pair of the 16 personality types. Socion puts that theory in your hands, you pick the dynamic, the app shows you who fits.

- **Dual**: natural complementarity, each fills the other's blind spots
- **Mirror**: intellectually aligned, prone to mutual challenge  
- **Activity**: energising and stimulating at a distance  
- ...and 13 further named dynamics, each with a distinct character

Not a black box. The matching logic is in [src/data/relations.js](src/data/relations.js), open and auditable.

**[Try it at socion.app →](https://socion.app)**

---

## How it works

1. Enter your Socionics type (or find it with a free, adaptive typing chat)
2. Choose which intertype dynamics you want to match on
3. Browse profiles whose type produces your chosen relation with yours
4. Connect and message

The theory makes falsifiable predictions, the app is designed to test them at scale.

## Stack

- **Frontend**: React + Vite
- **Backend/DB**: Supabase (Postgres, Auth, Realtime)
- **Hosting**: Netlify (auto-deploy from GitHub)
- **Domain**: socion.app → Netlify via Cloudflare CNAME
- **Auth**: Supabase Auth, email OTP code plus Google and Discord OAuth
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
client bundle at build time and is therefore public, none of them may hold a
secret.

| Variable | Required | Used for |
|---|---|---|
| `VITE_SUPABASE_URL` | yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | yes | Supabase anon key |
| `VITE_ONBOARDING_COUPON_CODE` | no | Typing-chat discount banner code; the banner is hidden when unset |
| `VITE_ONBOARDING_COUPON_EXPIRES` | no | ISO date after which that banner stops showing |
| `VITE_VAPID_PUBLIC_KEY` | no | Web push subscriptions; without it, push can't be enabled |
| `VITE_GIPHY_API_KEY` | no | GIF picker in messages and rooms; without it, the GIF button is hidden. Use a public, rate-limited key from [developers.giphy.com](https://developers.giphy.com) |

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Apply everything in `supabase/migrations/` in filename order, `supabase db push`, or paste each file into the SQL editor. The first three files carry the base schema (tables, RLS policies, swipe mode), so this replaces the old "run schema.sql, then rls_reset.sql, then …" sequence.
3. Create the `avatars` storage bucket and its policies with `supabase/avatars.sql`
4. Store the service role key in Vault and schedule the cron jobs with `supabase/stats.sql` (see the comments in that file)
5. Copy your project URL and anon key into `.env`

Realtime on `messages` is handled by `20260527130000_baseline_rls_policies.sql`.

> **A database rebuilt this way is not yet a complete copy of production.** Several tables and RPCs were created by hand in the SQL editor and never captured in any file. See [`supabase/PRODUCTION_ONLY_OBJECTS.md`](supabase/PRODUCTION_ONLY_OBJECTS.md) for the inventory and how to close it.

### Migrations

Schema changes live in `supabase/migrations/` and are applied in **lexical filename order**, so every file is named `YYYYMMDDHHMMSS_description.sql`, a full 14-digit timestamp, unique across the directory. See [CONTRIBUTING](CONTRIBUTING.md#database-migrations) before adding one.

The base schema is the first three files:

| File | Description |
|---|---|
| `20260501000000_initial_schema.sql` | Core tables (users, matches, messages, blocks, stats, …) |
| `20260527130000_baseline_rls_policies.sql` | Row Level Security policies + realtime on `messages` |
| `20260527140000_baseline_swipe_mode.sql` | Swipes table, mutual-match trigger, `already_swiped` view |

The hand-run files still in `supabase/` (`schema.sql`, `rls_reset.sql`, `blocks.sql`, `swipes_schema.sql`, `push_subscriptions.sql`, `get_admin_stats.sql`) are kept for historical reference only, the migrations above supersede them. `avatars.sql` and `stats.sql` are still live, for the storage bucket and the cron jobs respectively.

## Deploy

Push to `main`, Netlify deploys automatically.

Set the same environment variables in the Netlify dashboard, see the
[table above](#environment-variables).

### OAuth providers

Google and Discord sign-in are Supabase Auth providers (Authentication → Providers in the dashboard); nothing is configured client-side. Add `https://socion.app` and your Supabase callback URL to each provider's allowed origins and redirect URIs. On a Deploy Preview, where the OAuth redirect does not match, the email OTP form is shown expanded instead.

### Edge functions

Functions live in `supabase/functions/<name>/index.ts`, one self-contained file each so they can be deployed from the dashboard editor or with `supabase functions deploy <name>`. When a changelog entry says "Needs redeploying", deploy the functions it names. Secrets are set in the dashboard (Edge Functions → Secrets) or `supabase secrets set`.

| Secret | Used by |
|---|---|
| `SUPABASE_URL`, `PROJECT_SECRET_KEY` | every function (service-role access) |
| `ANTHROPIC_API_KEY` | `chat-socionics`, `onboarding-typing-turn`, `onboarding-typing-analyse`, `seed-room-prompt` |
| `STRIPE_SECRET_KEY`, `APP_URL` | `create-checkout-session`, `create-portal-session` |
| `STRIPE_PREMIUM_PRICE_ID` | `create-checkout-session` |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` |
| `RESEND_API_KEY`, `SITE_URL`, `UNSUBSCRIBE_SECRET` | `stripe-webhook`, `notify-abandoned-signup`, `send-referral-emails` (`email-unsubscribe` uses `SITE_URL` and `UNSUBSCRIBE_SECRET` only) |
| `RESEND_API_KEY`, `DIGEST_TO` | `daily-digest` |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | `send-push`, `send-room-push`, `notify-new-dual`, `notify-reengagement` |
| `DISCORD_WEBHOOK_URL`, `DISCORD_FEEDBACK_WEBHOOK_URL`, `DISCORD_TYPING_WEBHOOK_URL` | `discord-notify` |
| `DISCORD_STATS_WEBHOOK_URL` | `daily-ai-usage` |
| `MAILERLITE_API_KEY` | `delete-account` |
| `MAILERLITE_WEBHOOK_SECRET` | `mailerlite-webhook` |

`APP_URL` and `SITE_URL` both hold `https://socion.app`; the Stripe functions read the first, the email functions the second.

## Structure

```
src/
  components/
    boards/
      MentionTextarea.jsx
    feed/
      FeedAd.jsx
      FeedRightSidebar.jsx
      MatchModal.jsx                        New match overlay
      MiniProfileCard.jsx
      ProfileCard.jsx
      QuadraOnlineCard.jsx
      SeekingYou.jsx                        Incoming interest indicator
      SwipeCard.jsx                         Swipe-to-connect UI
      SwipeDeck.jsx                         Swipe-to-connect UI
    messages/
      Conversation.jsx
      MatchList.jsx
      NotificationPrompt.jsx
      PastConnectionsList.jsx
      PushModal.jsx
    onboarding/
      EntryChoice.jsx
      TypeSelector.jsx
    profile/
      DynamicsTab.jsx
      PointsPanel.jsx
      ProfileNav.jsx
      PurposePicker.jsx
      ReferralPanel.jsx
      RelationPicker.jsx
    AnnouncementBanner.jsx
    FeedbackButton.jsx
    FlagImage.jsx
    GifPicker.jsx
    IOSInstallBanner.jsx
    LatestArticles.jsx
    Layout.jsx
    LegalLines.jsx                          Operator identity lines (footer, menu, Settings)
    MarketingConsentPrompt.jsx              One-time marketing-email consent ask
    NotificationBell.jsx
    SIWebview.jsx                           In-app socionicsinsight.com webview
    SocionicsChat.jsx                       AI Socionics chat widget
    VisibilityReminder.jsx
  config/
    legal.js                                Operator name, address, email, ICO number
  data/
    books.js                                Type nicknames and book links
    compatibility.js
    countries.js                            Country list
    reinin-dichotomies.json                 Reinin table (reference; the AI prompt carries its own copy)
    relations.js                            Intertype relations matrix (16×16, fully validated)
  hooks/
    useNotifications.js
    usePageMeta.js                          Title, description, canonical and share meta per page
    usePageTitle.js
    useQuadraRoom.js
  lib/
    AuthContext.jsx
    ThemeContext.jsx
    archive.js                              Archive/unmatch logic
    auth.js
    blocks.js                               Cool-off and block/report logic
    boards.js                               Founder boards API
    catchup.js                              Grouped toasts after time away
    dateUtils.js
    device.js                               Signup device detection
    emailPreferences.js                     Marketing consent writes
    feed.js
    giphy.js                                GIF picker API
    mentions.js                             @mentions in rooms
    messages.js
    notifications.js
    onboardingChat.js                       Typing chat client
    pageTitle.js                            Per-page title and unread badge
    points.js                               Points awards
    premium.js
    profile.js
    profileViews.js
    referral.js                             Referral codes
    rooms.js
    siArticles.js                           Latest Socionics Insight articles (via /si-feed.xml)
    supabase.js
    typists.js                              Typing directory data
    unmatch.js
    usePushNotifications.js
    useUnreadCount.js
    userReports.js                          Report a member
  pages/
    About.jsx
    Admin.jsx                               Founder-only dashboard (/admin)
    AskPage.jsx                             AI Socionics Q&A (premium)
    Auth.jsx                                Google One Tap + magic link
    BoardDetail.jsx                         Board thread list
    BoardPost.jsx                           Board post
    Boards.jsx                              Founder boards
    Changelog.jsx
    Feed.jsx
    Feedback.jsx
    Help.jsx
    Home.jsx
    HomeDashboard.jsx                       Signed-in homepage
    Messages.jsx
    Network.jsx                             Type network visualisation
    NotFound.jsx
    Onboarding.jsx
    Premium.jsx
    PremiumWelcome.jsx
    Privacy.jsx
    ProfileDynamics.jsx
    ProfileEdit.jsx
    ProfileNotifications.jsx
    ProfileSetup.jsx
    ReferralLink.jsx                        /r/:code redirect
    Rooms.jsx                               Quadra group chat rooms
    Saved.jsx                               Saved / bookmarked profiles
    Settings.jsx
    Stats.jsx                               Platform statistics
    Support.jsx
    Terms.jsx
    Typing.jsx                              Typing directory
    TypingChat.jsx                          Free adaptive typing chat
    TypistProfile.jsx                       Typing directory
    Unsubscribe.jsx                         Signed-out one-click unsubscribe confirmation
    Updates.jsx
    UserProfile.jsx                         Public profile view
  App.css
  App.jsx
  BootGate.jsx                              Waits for auth before rendering routes
  index.css
  main.jsx
supabase/
  migrations/             Schema, in filename order (the source of truth; see Supabase setup)
  avatars.sql             Storage bucket policies (still live)
  stats.sql               Stats table (superseded by migrations) and the cron schedule (still live)
  schema.sql, rls_reset.sql, blocks.sql, push_subscriptions.sql, swipes_schema.sql, get_admin_stats.sql
                          Historical hand-run files, superseded by migrations; do not run
  PRODUCTION_ONLY_OBJECTS.md  Objects that exist in production but not in migrations
  functions/              Edge functions (see Edge functions below)
    chat-socionics/
    compute-stats/
    create-checkout-session/
    create-portal-session/
    daily-ai-usage/
    daily-digest/
    delete-account/
    discord-notify/
    email-unsubscribe/
    mailerlite-webhook/
    notify-abandoned-signup/
    notify-new-dual/
    notify-reengagement/
    onboarding-typing-analyse/
    onboarding-typing-confirm/
    onboarding-typing-turn/
    seed-room-prompt/
    send-push/
    send-referral-emails/
    send-room-push/
    stripe-webhook/
```

## Routes

| Path | Description |
|---|---|
| `/` | Landing page |
| `/onboarding` | Signup flow, purpose, then self-select a type or a starting guess |
| `/auth` | Sign in: email OTP, Google or Discord; honours `?redirect=` |
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
| `/typing/chat` | Free adaptive typing chat, signup and retake |
| `/typing/:slug` | Individual typist profile |
| `/r/:code` | Referral link redirect |
| `/boards`, `/boards/:slug`, `/boards/:slug/:postId` | Founder boards |
| `/unsubscribe` | Signed-out marketing-email unsubscribe |
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

- **Cool off**: 7 day mutual pause. Feed hidden, messaging disabled, conversation preserved. Lifts automatically. Either party can lift early.
- **Block & report**: permanent. Reason required (spam, inappropriate content, or other). Reports visible to founder in admin dashboard.

## Build phases

- **Phase 0** ✅ Infrastructure, React scaffold, Supabase schema, Netlify deploy
- **Phase 1** ✅ Type onboarding questionnaire
- **Phase 2** ✅ Auth + profile creation
- **Phase 3** ✅ Matching feed with relation filtering
- **Phase 4** ✅ Messaging + realtime
- **Phase 5** ✅ Launch, socion.app live, repo public
- **Phase 5+** ✅ OAuth and OTP auth, block/report, admin dashboard, push notifications, reply threading, typing indicators, PWA manifest, Discord integration, account deletion, premium subscriptions, quadra group chat rooms, swipe-deck UI, emoji reactions, GIF picker, image attachments, typing directory, saved profiles, settings page, platform stats, network visualisation, AI Socionics Q&A, profile views, archive/unmatch, theme system, updates feed

## Related

- [socionicsinsight.com](https://socionicsinsight.com), reference site, type profiles, and relation pages
- [spencerstern.com](https://spencerstern.com)
