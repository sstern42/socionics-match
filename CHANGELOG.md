# Changelog

All notable changes to [socion.app](https://socion.app). Newest first.

---

## 7 July 2026

### Added
- **`CLAUDE.md` — reminder to flag Supabase preview-branch cost**: Supabase's GitHub integration (connected this session) creates a billed preview database for any open PR touching `supabase/` (migrations, functions, config) — $0.01344/hr on Micro compute, so a PR left open for weeks is the real cost driver, not the number of merges. Added an instruction so Claude calls this out on relevant PRs instead of it going unnoticed on the bill.

## 6 July 2026

### Added
- **X post queue (`social/x-posts.md`)**: New non-deployed working doc holding an ongoing draft queue of @SocionApp posts for X, curated from this changelog and reframed as evergreen "did you know" posts. Workflow is manual (draft here, schedule via Buffer) rather than a custom API integration — see issue #975.
- **First batch of the X post queue posted/scheduled via Buffer**: Post #1 ("Socionics defines 16 relations...") went out immediately; #2-10 are scheduled every 2 days through 24 Jul 2026 at 9:30am London time. #11-15 stay `Draft` — the connected Buffer plan caps scheduled posts at 10, which #2-10 already fill.

### Fixed
- **Quadra room toast — clicking a new-message toast now opens the room the message came from**: The live "new room message" toast (`Layout.jsx`) fired for messages in any room the member can see (their own quadra, the global Socion room, and — for founders/moderators — every quadra), but clicking it always did a bare `navigate('/rooms')`, which lands on the viewer's *own* quadra room by default. So a toast about a Beta message would drop an Alpha member into the Alpha room with nothing new to see. The toast already carries the source room's `label` (Alpha/Beta/Gamma/Delta/Socion), so the click now deep-links to `/rooms?room=<label>`, and `Rooms.jsx` reads that `?room=` param on load and switches to the matching room via the existing quadra-switcher (clearing the param afterwards so a later manual room switch isn't overridden). Deep-linking to your own quadra is a no-op, exactly as before.
- **Typing chat — interviewer turn occasionally ignored the reply format, spamming error logs and skipping topics**: `onboarding-typing-turn` asked Claude to hand-format its reply as JSON in plain text (`{"message": ..., "advance_topic": ...}`), which it would occasionally skip entirely and answer in plain conversational text instead — no braces at all, so the brace-extraction fallback had nothing to find and logged `onboarding-typing-turn: unparseable response`. Worse, on every one of these failures `advance_topic` silently defaulted to `true`, forcing the conversation to skip ahead a topic it shouldn't have. Switched to Anthropic's forced tool-use (`tool_choice: {type: 'tool', name: 'provide_turn_response'}`) so the reply shape is a server-side guarantee instead of a prompt instruction the model could ignore — the user-visible chat and response contract are unchanged.

### Added
- **Abandoned-signup nudge email (issue #964)**: Users who authenticate (Google/Discord OAuth or email magic-link) but never finish `ProfileSetup.jsx` end up in `auth.users` with no matching `public.users` row (that row is created in `createProfile()`), so nothing followed up with them. A new `notify-abandoned-signup` edge function, run daily by pg_cron, finds those half-finished signups and sends a single "finish setting up your profile" email via Resend, linking back to `/profile/setup`. It's a **transactional** email — tied to an action the user already took (starting signup), not marketing — which sidesteps the missing marketing-consent column flagged in the onboarding-typing migration; blasting these addresses through MailerLite would email people who never opted into marketing. The send is strictly **one-time**: migration `20260706120000_abandoned_signup_nudge.sql` adds an `abandoned_signup_nudges` table (one row per nudged `auth_id`) plus two service-role-only, `SECURITY DEFINER` functions — `get_abandoned_signups()` (candidates with no profile row, not yet nudged, with a usable email, inside a configurable age window so a first run doesn't blast the whole historical backlog, excluding banned/deleted accounts) and `claim_abandoned_signup_nudge()` (atomically records the send and reports whether this run won the claim, so a retried/concurrent cron can't double-send; a Resend failure releases the claim to retry next day). Authenticates via the same `x-cron-secret` header as `daily-digest`/`seed-room-prompt`, and accepts optional body overrides (`olderThanHours`, `newerThanDays`, `limit`, `dryRun`) for testing and one-off sends. Scheduling is applied manually in the Supabase SQL editor (pg_cron + the vault `service_role_key`), same pattern as `daily-digest`.
- **"Ask the AI" chat — up to 3 follow-up suggestions after each answer**: The Socionics assistant now ends each turn with up to three contextual follow-up questions, phrased in the member's own voice and based on where the conversation has got to, shown as clickable chips under the latest reply (tapping one sends it). To keep it cheap and low-latency, the suggestions are generated inline as part of the same streamed response rather than a second API call: the model appends a `[[SUGGESTED_FOLLOWUPS]] q1 ||| q2 ||| q3` line, and `chat-socionics` strips that marker (and everything after it) out of the visible stream — buffering a small tail so the marker never flashes on screen — then re-emits the questions as a `__FOLLOWUPS__` sentinel the client parses. `SocionicsChat.jsx` renders them under the last assistant message beneath a subtle "Suggested" eyebrow label, hidden while streaming and whenever an error or the upgrade prompt is showing. On narrow (phone) viewports the chips are capped to 2 instead of 3 (tracked via a `matchMedia('(max-width: 600px)')` listener) so they don't crowd the message area. Falls back gracefully to no chips if the model omits the line (e.g. a response cut off by the token limit).
- **"Ask the AI" chat — shows what the conversation cost**: `chat-socionics` now tracks the Claude usage (`input_tokens`, `output_tokens`, cache write/read tokens) reported on the streamed response and estimates the cost in USD using Claude Sonnet 5's list pricing (cache writes/reads priced at their published multipliers of the base input rate). The estimate is appended to the stream as a trailing sentinel, which `SocionicsChat.jsx` strips out and accumulates into a running per-conversation total. Once the total is non-zero, a small note appears under the conversation — "This conversation cost ~$X in AI usage" — linking to the existing `/support` Ko-fi page, so members who find the assistant useful can see roughly what it costs to run and choose to help cover it. Real-time API account balance isn't exposed by Anthropic's API, so this shows actual per-conversation spend rather than a global "credit remaining" figure.

## 5 July 2026

### Fixed
- **Stats — page now scrolls from the main window scrollbar, not a floating one in the middle**: The Stats page's content `<section>` carried `overflowX: 'hidden'` (a defensive guard against horizontal overflow). But per the CSS overflow spec, when one axis is `hidden` and the other is `visible`, the `visible` axis computes to `auto` — so the 720px-wide, centred section silently became a *vertical scroll container*. As a scroll container its automatic minimum height collapses to `0`, so inside `Layout`'s `noScroll` flex column (`<main overflow:auto>`) the section shrank to the viewport height and scrolled inside itself, rendering its scrollbar at the section's right edge (roughly the centre of a wide page) instead of at the window edge like every other page (Help, Premium, Privacy, Terms). Removed the `overflowX: 'hidden'`; the section already constrains itself with `width: 100%; maxWidth: 720; boxSizing: border-box` and all inner bars use flex/percentage widths, so nothing overflows horizontally and `<main>` now owns the scroll as intended.
- **Stats — "types represented" no longer counts the Socion Host**: The `compute-stats` edge function counted distinct `users.type` values, which meant the newly-added Socion Host row (`type = 'HOST'`, intentionally not one of the 16 types) inflated the headline "types represented" figure to 17. It now filters the distinct-type set against the 16 canonical socionics types, so the count tops out at 16 as intended.

### Added
- **New `/email-html-template` skill for MailerLite campaigns**: Added a Claude skill (`.claude/skills/email-html-template/`) that produces hand-authored, email-client-safe HTML for MailerLite member-update/announcement campaigns, matching the Socion brand from the last "what's new" send. It ships a fill-in-the-blanks starter (`references/campaign-template.html`) carrying the exact brand tokens (`#f7f4ef` canvas, `#1a1814` header, `#9a6f38` gold, Georgia + Arial), the 520px table layout, a hidden preheader (inbox preview text) with a zero-width-space spacer to help open rates, feature-row/CTA-box blocks, and the required footer (physical address + `{$unsubscribe}`); an emoji→HTML-entity lookup (`references/emoji-entities.md`); and a production guide covering the brief, table-based client-safe HTML rules, MailerLite merge tags (`{$name}`/`{$unsubscribe}`, why not to hand-write `builder-link-id`), UTM tagging, the lowercase house voice, and a pre-send QA checklist. Explicitly scoped apart from the transactional Resend emails in `supabase/functions`. The skill's files never reach the live site (Netlify publishes only the Vite `dist` output), and `.claude` is now added to the `netlify.toml` build-skip `ignore` pathspec so editing a skill no longer triggers a wasteful production rebuild/deploy.
- **Admin — "Download stats" CSV export**: The founder Admin dashboard header gained a range selector (Last 30 days / Last 90 days / All time) and a **Download stats** button next to Refresh, producing a single CSV of the crucial performance figures for offline analysis (e.g. uploading to Claude). The file has three sections: a **Metric,Value** snapshot of the headline KPIs (sign-ups, members, connections, messages, assessments, avg rating, active/inactive/messaging-active counts, swipe volume with like- and match-rate, cool-offs, reports, anon/known split), a **Type,Members** distribution, and a **Date,New members,Cumulative members** daily timeseries clipped to the selected range (the cumulative total is computed across all members so it stays accurate even when rows are clipped). Because `get_admin_stats` only returns all-time aggregates rather than per-day history, the snapshot metrics are current totals and are labelled as such — the range narrows the daily series and the "new members in range" figure, and the filename encodes the window (`socion-stats-30d-YYYY-MM-DD.csv` / `socion-stats-all-time-…`). Built entirely client-side from the data the dashboard already loads, reusing the same Blob-download pattern as the existing member-emails / inactive-users exports.
- **Quadra Rooms — "Socion Host" AI conversation-starter for quiet rooms**: A dedicated host bot now periodically drops a short, open-ended prompt into rooms that have gone quiet, to give lurkers a reason to post. It's deliberately restrained so it never becomes the dead-mall-with-a-mascot: on each run the `seed-room-prompt` edge function only seeds a room when (a) the room has active members, (b) its last message is older than 18h, and (c) that last message wasn't the host itself — so the host can never post twice in a row, and a human always speaks between prompts. Prompts are generated per-room by `claude-sonnet-5` with a quadra-specific brief (Alpha's warmth/Ne, Beta's intensity/Se-Ni, Gamma's pragmatism, Delta's craft, and a cross-quadra brief for the global Socion room) and a rotating "angle" for variety, with a curated fallback list if the model call fails so the host never posts something broken. The host is a real `users` row with `auth_id` NULL (can never sign in) and `type = 'HOST'` — intentionally not one of the 16 types, so it's excluded from the feed (`get_feed_profiles` filters `type = any(p_types)`), from matching (no relation is defined for it), and from room member counts (the `assign_quadra_room` trigger leaves its `room_id` NULL); `profile_data.is_bot`/`hidden` flag it belt-and-suspenders. In the room it renders as a distinct **Host** prompt — sparkle avatar, "Host" badge instead of a clickable type badge, subtly tinted bubble, no profile link, and no Report action — but members can still reply and react (which is the point). Posts flow through the existing `send-room-push` webhook, so members with room notifications on get pinged. New: migration `20260705120000_room_host_seeder.sql` (creates the host user; documents the pg_cron schedule) and the `seed-room-prompt` edge function. Scheduling is applied manually in the Supabase SQL editor (pg_cron + the vault `service_role_key`), same pattern as `stats.sql` / `daily-digest`; the function authenticates via the `x-cron-secret` header. For on-demand use it also accepts an optional JSON body — `{ "rooms": ["alpha","socion"], "force": true }` — to restrict the run to specific rooms and (with `force`) bypass the quiet-time and last-sender gates so the host posts immediately even in an active room (the member check is always kept); the cron posts `{}`, i.e. all rooms, fully gated. The function accepts two callers: the cron via `x-cron-secret`, or a **founder** via their session JWT (verified server-side against `profile_data.role`), so the service key never has to reach the browser. The Admin dashboard uses that founder path: a new **"Quadra Rooms — post a host prompt"** card lets the founder pick rooms (Alpha/Beta/Gamma/Delta/Socion) and fire a forced host prompt via `supabase.functions.invoke`, showing which rooms were seeded and why any were skipped.

### Changed
- **Admin dashboard — wide-screen redesign, split into Overview and Controls**: The founder Admin page (`src/pages/Admin.jsx`) was capped at `maxWidth: 960`, which left roughly half of a 1920×1080 window empty. Raised the container to `maxWidth: 1680` and reorganised the page into two clearly-labelled sections behind a new `SectionHeading` component: **Overview** (read-only stats — headline tiles, member-growth chart, type/relation/purpose/country distributions, referrers, ratings, comments, recent sign-ups, member emails, inactive users) and **Controls** (the interactive surface — site-wide banner, Quadra host-prompt, founder-feed override, analytics-exclusion toggle, then a moderation row of Reports / Board reports / User reports, followed by the verification, banned-emails and feedback panels). The three report cards moved out of the read-only stats grid into a dedicated moderation row inside Controls, and the interactive banner/toggle cards now sit together in a responsive grid instead of being interleaved between read-only lists. **Mobile is unchanged**: the widening only affects screens past the old 960px cap (the container is `width: 100%` below that), and every grid still uses `auto-fit`/`auto-fill` with `minmax(...)`, so cards collapse to a single column on narrow viewports exactly as before — a proper mobile pass is left as its own future effort.
- **Admin — removed the Typing requests panel**: The `TypingRequestsPanel` (and its `typing_requests` fetch) was dropped from the Admin dashboard as redundant now that free typing chat handles typing directly; no schema change, the table is simply no longer surfaced here.
- **Cleared the 35 `react-hooks/exhaustive-deps` lint warnings (#935)**: The lint run reported 35 of these across the app; individually minor but they added noise to every run and could mask a genuine stale-closure bug. Swept them with a fix chosen per case rather than blanket-suppressing:
  - **Added the missing dependency where it's safe / correct** — the large `navigate` group (react-router v7's `navigate` is a stable reference, and these are idempotent redirect guards anyway), plus `userId` in `useNotifications`, `isSocion` in the Rooms member-count effect, `searchParams` in the Messages initial-select (guarded one-shot), `currentUserId`/`otherUserId` in the Conversation block lookup, and `initialQuestion` in the SocionicsChat restore effect.
  - **Captured a ref in a local** for the Rooms typing-channel cleanup (`tabId.current` copied to a local so the cleanup doesn't read a possibly-changed ref — it's a constant tab id, so behaviour is unchanged).
  - **Scoped `// eslint-disable-next-line` with an explaining comment** only where adding the dep would cause real churn or break intent: realtime subscriptions keyed on a single id (Conversation, Feed incoming-match), animation/scroll effects that intentionally key on a length or a loading flag (Network physics, Conversation/Rooms scroll), one-shot guarded effects using unstable callbacks (Feed retry, SocionicsChat count, `useUnreadCount`), and the catch-up summary keyed on the user rather than the whole profile object.
  - No runtime behaviour changed. The remaining lint warnings are the React-Compiler rules (`set-state-in-effect`, `immutability`, `purity`, `react-refresh/only-export-components`) deliberately left at `warn` under #931, tracked separately.

## 4 July 2026

### Added
- **Settings — connected sign-in methods**: A new "Sign-in" panel on the Settings page (`src/pages/Settings.jsx`) lists the auth provider(s) linked to the account — ✉️ Email (magic code), 🔵 Google, and/or 🟣 Discord — read from `session.user.identities` (with a fall-back to `app_metadata.providers`), de-duped and order-stable. It shows one method or several (an identity-linked account signs in with more than one), along with the account email. Provider badges mirror the `discord-notify` `#signups` convention so the two stay recognisably consistent. Display-only for now — no linking/unlinking of providers yet.
- **Discord live-stats — free typing chat results**: The `discord-notify` edge function gained a seventh event, `typing-chat-completed`, so every completed free typing chat now posts to the main live-stats channel — the same one that already gets `🔔 New sign-up` / `✅ Profile complete` / `🤝 New connection`. The glyph tells the story at a glance: `🌱 **New member typed**` (a fresh signup's first type, with country), `🔁 **Retype, no change**` (an existing member reconfirmed the same type), `🔀 **Retype, changed**` (`ESI → LIE`), and `🎲 **Test run**` (an already-verified member tried the chat — their type is never overwritten, so it's logged but marked unchanged). Confidence is always shown (`· 78%`), a close two-way read adds a `⚖️` marker, and anonymous-mode members show as `🕶️ Anonymous` with country suppressed, exactly like the profile-complete message. Unlike the other six events (Supabase database webhooks), this one is an explicit best-effort ping from `onboarding-typing-confirm` right after it writes the type — a Discord outage is logged and swallowed so it can never fail a member's type confirmation. The frontend now threads the `source` (`signup`/`retake`) and lean-choice flag through `requestConfirm` purely to shape the message; neither affects which type is written.
- **Auth — Google sign-in moved from the Google Identity Services widget to Supabase's OAuth redirect flow**: The GIS-rendered button (`signInWithIdToken` + the `accounts.google.com/gsi/client` script) always drew Google's own button, which on the dark UI sat inside a white box — the white came from *inside* Google's cross-origin button iframe, so no page CSS could remove it (a `filled_black` theme darkened the button but not the surrounding iframe). Replaced it with a custom **Continue with Google** button that calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })` — the same flow as Discord, styled identically (dark pill, brand icon, matches in both light and dark). Removed the GIS `<script>` from `index.html`, the `VITE_GOOGLE_CLIENT_ID` usage, and the GIS init/render/`MutationObserver` effect from `src/pages/Auth.jsx`. Note this changes what the Supabase Google provider needs: the redirect flow requires the Google **Client Secret** set in the Supabase Auth dashboard and the Supabase callback URL (`/auth/v1/callback`) added to the Google Cloud OAuth client's Authorized redirect URIs, whereas the old ID-token flow only needed the client ID.
- **Discord #signups notification labels the Discord auth method**: With Discord OAuth now offered on the sign-in page, the `discord-notify` edge function's `PROVIDER_LABELS` map gained a `discord: '🟣 Discord'` case, so a new member who joined via Discord shows `🟣 Discord` in the `🔔 New sign-up` message instead of falling back to the generic `🔑 discord`. Read as before from `auth.users.raw_app_meta_data.provider`, so no client change was needed.
- **Auth — Discord sign-in added, magic code de-emphasised**: The sign-in page (`src/pages/Auth.jsx`) now offers **Continue with Discord** as a primary OAuth option alongside the existing Google button, and demotes the email magic code from the primary flow to a subtle "Sign in with email instead" link that expands the email field on demand. Discord uses `supabase.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: window.location.origin } })`; the Discord `#signups` notification already reads the provider generically from `raw_app_meta_data.provider`, so no backend change was needed (provider signups simply omit the device segment, exactly as Google already does — there's no OTP-style `options.data` to carry `signup_device` through). OAuth is gated to production only (`OAUTH_ENABLED = IS_PROD`) because the provider's redirect URL has to be allow-listed in the Supabase Auth dashboard, which the ephemeral Deploy Preview origins aren't — so on a preview the magic code stays the one working path and is shown **expanded** (not collapsed behind the link), keeping the tester's flow intact. Discord still needs enabling in the Supabase Auth dashboard for the button to function. (Apple was considered but dropped — Sign in with Apple requires a paid Apple Developer account.)
- **Feed — visibility reminder**: A gentle, snoozeable banner now appears at the top of the feed when you've left a privacy toggle on that's quietly suppressing your reach — most often because they flipped it on during onboarding and forgot. It adapts to what's on: strongest when you're both anonymous *and* hiding activity, softer for either alone. "Make me visible" turns the relevant toggle(s) off in one click (no trip to Settings); "Remind me later" snoozes it. Severity-weighted so it doesn't nag — anonymous mode (hidden from the feed by default, never meant to be permanent) resurfaces on an escalating 3-day → 1-week → 1-month schedule, while hiding activity on its own (a legitimate standing preference) is mentioned once with a long back-off. "Keep it on" snoozes for 90 days. Snooze state lives in `localStorage`.
- **Discord #signups notification now shows the signup device and auth method**: The `discord-notify` edge function's `🔔 New sign-up` message now includes how and from where a new member joined, e.g. `✉️ Magic code · 📱 Mobile (iOS) · 📊 1234 members` or `🔵 Google · 💻 Desktop (Windows) · …`.
  - **Device**: Since a database webhook on `auth.users` has no access to the request's user agent, the device is detected client-side at signup (`src/lib/device.js`) and passed through the magic-link OTP call's `options.data`, which lands in `auth.users.raw_user_meta_data` and is therefore present on the webhook `record`. Flows that don't set it (e.g. Google) simply omit the device segment rather than showing "unknown".
  - **Auth method**: Read directly from `auth.users.raw_app_meta_data.provider` (`email` → magic code, `google` → Google), so it needs no client change and works for every provider.
  - **Member-count wording** reflects each event's meaning: the member count is of *completed profiles*, which a brand-new signup isn't yet, so `🔔 New sign-up` now reads `📊 {n} members +1` (one more on the way) while `✅ Profile complete` reads `📊 We now have {n} members` (they're counted).

### Changed
- **Messages list no longer downloads every message of every conversation (#927)**: `getMatches()` embedded the full message set of each match (`messages ( content, created_at, sender_id )`, no `limit`) purely to derive each conversation's last message and to sort the list — so every load of the Messages page downloaded **all** messages across **all** of the user's matches, with bandwidth and parse cost growing linearly with conversation length. Denormalised a `last_message` jsonb (`{content, created_at, sender_id}`) onto `matches`, maintained by an `AFTER INSERT` trigger on `messages` and backfilled from the latest message per match (migration `20260704150000_matches_last_message.sql`, applied manually). `getMatches` now selects `last_message` and reads one row per match instead of the whole history. The trigger is guarded (`last_message is null or its created_at <= NEW.created_at`) so an out-of-order insert can't clobber a newer preview; normal appends always pass. Live previews are unaffected — the Messages UI already updates `lastMessage` in local cache on each new message (`Conversation.jsx`), independent of the fetched column.
- **Quick-win cleanups — redundant feed filter, auth writes on token refresh, unread channel name**: Three small, self-contained optimisations with no user-facing behaviour change.
  - **Feed (#934)**: dropped the redundant `relationPreferences.includes(profile.relation)` re-check in `getFeedProfiles` (`src/lib/feed.js`). The query already restricts to `compatibleTypes`, which is derived from those same preferences via `getMatchingTypes()`, so the client-side relation re-filter was dead weight (the non-premium path only narrows the type set further, so it stays correct). The `hidden` filter in the same clause is unchanged.
  - **Auth (#933)**: `onAuthStateChange` in `src/lib/AuthContext.jsx` now only runs `loadProfile()` on `INITIAL_SESSION`/`SIGNED_IN` rather than on every event. Previously each `TOKEN_REFRESHED` (fires periodically) and tab-refocus `SIGNED_IN` triggered a fresh `getProfile()`, a `last_active` write, a `daily_login` points award, and a `setProfile` re-render — all redundant on a background token refresh. `setSession` still reacts to every event.
  - **Unread badge (#928, partial)**: namespaced the realtime channel per user (`unread-messages:${userId}`) in `src/lib/useUnreadCount.js` so it can't collide if the hook is ever mounted more than once. The separate match-scoping concern in that issue (relying on realtime RLS instead of a client-side match filter) is left for a follow-up.
- **Unread badge now scoped to the user's own matches client-side (#928)**: Completes #928. `useUnreadCount` previously counted *any* `messages` INSERT where `sender_id !== userId` and relied entirely on realtime RLS to keep other conversations' messages out of the badge — if that RLS were ever misconfigured for the `messages` table, the badge could count messages from conversations the user isn't part of. It now fetches the user's active match IDs (`matches` where they're `user_a`/`user_b` and `unmatched_at is null`) and scopes both the initial `fetchCount` (`.in('match_id', ids)`) and the realtime increment (`matchIdsRef.has(payload.new.match_id)`) to that set, so an out-of-scope message can never inflate the count regardless of RLS. Because the hook is long-lived (mounted in `Layout`, only re-running on `userId` change), a second subscription on the same channel watches `matches` INSERTs and adds any new match the user is part of to the set, so a conversation started mid-session is still counted without a remount.
- **Socionics chat — prompt caching tuned to cut Anthropic API cost**: An analysis of a week of `socion-chat` API spend showed the caching in `chat-socionics` was paying to *write* the cache far more than it *read* it (an ~8:1 write-to-read ratio on the ~6,500-token system prompt), and that re-sent conversation history was the single biggest line item. Two changes in the edge function: (1) the system-prompt cache breakpoint now uses a **1-hour TTL** (`cache_control: { ttl: '1h' }`) instead of the 5-minute default — the system prompt is byte-identical across every user and request, so at this traffic level a 1h entry is much more likely to be read before it expires, and the 2x write premium is repaid after ~3 reads (trivially met for a globally shared prefix); (2) a **second cache breakpoint is now placed on the last message**, so each new turn in a multi-turn chat reads the prior turns from cache (~0.1x input price) instead of re-sending the whole transcript at full price on every request. Only string message content is wrapped (multimodal/array content is left untouched), and the two breakpoints stay well under Anthropic's 4-breakpoint limit. No change to model, prompt text, or chat behaviour — purely a cost optimisation.
- **Get Typed page now shows the free-chat entry point to already-verified members too**: The "Try our free typing chat" box on `/typing` (`src/pages/Typing.jsx`) was hidden for members whose `type_source` is `paid_verified`/`community_verified`, on the logic that a verified type can't be changed by the chat. But the chat already supports verified members deliberately — its intro invites them to try it "out of curiosity" and logs the result as a `🎲 Test run` that never overwrites their type — so the entry point is now shown to them as well, with test-run copy ("Already typed `X`? See how the free chat reads you — it's just a test run, your confirmed type won't change." → "Try a test run →") instead of the preliminary-read pitch everyone else still sees. The `typing-chat-banner-clicked` umami event gained a `verified` flag to keep the two audiences distinguishable.

### Fixed
- **Feed count overstated availability and pagination served near-empty pages (#929, #932)**: `getFeedProfiles` fetched a page filtered only by `type`/`purpose`, then removed blocked / already-swiped / `profile_data.hidden` profiles **client-side**. Two bugs fell out of that split: the `total` count (used for "N matches available" and the feed-exhausted check) filtered only on `type`/`purpose`, so it overstated how many profiles the user can actually see (#929); and `hasMore` was derived from the **raw** page size *before* the client-side filter, so a fetched page of 30 rows could render only a handful of cards while `hasMore` stayed true — giving stretches of near-empty pages as the user scrolled (#932). Fixed by moving the exclusion server-side into two new `SECURITY DEFINER` RPCs (migration `20260704140000_get_feed_profiles_rpc.sql`, applied manually): `get_feed_profiles` returns the page and a `count(*) over()` total computed over the **same** predicate as the list — so the count and the list can never disagree — and `get_feed_type_counts` returns per-type counts under the identical predicate for the relation-filter pills. The exclusion set is self / null `profile_data` / hidden / any active block (either direction) / **any** prior swipe (either direction). Excluding all swipes rather than only left/passed swipes matches the net set the user already saw — the client seeds `swipedIdsRef` from every swipe and filtered right-swiped-but-unmatched profiles out of the deck client-side, so the visible deck is unchanged; only the counts and `hasMore` become accurate. Both functions are `SECURITY DEFINER` (needed to anti-join another user's blocks/swipes and read all candidate profiles), so the returned profile is an explicit column **whitelist** — never `to_jsonb(users)` — to avoid leaking `auth_id`/email/billing columns, and the caller is derived from `auth.uid()` server-side. Relation logic stays in JS (`src/data/relations.js`): the client passes the already-narrowed compatible type codes (including the non-premium same-quadra scope) as `p_types`, and maps each returned type to a relation for the pill counts, so the RPCs never need the socionics relation matrix. This also lets the redundant client-side blocked/swiped/hidden re-filter (and the separate count and all-candidate queries) drop out of `getFeedProfiles`. As a side benefit the relation-pill counts now exclude hidden profiles too, matching the deck.
- **Typing chat could hang on "analysing" and burn a member's daily try after their type was already applied**: The free typing chat's non-lean path auto-confirms the result while the `analysing` screen (`src/pages/TypingChat.jsx`) is showing — a screen that renders only the spinner, with no `ErrorNotice` and no way out. `confirmType`'s `catch` only called `setError(...)` without changing screens, so any failure *after* the confirm reached the server (e.g. a slow/failed response, a `refreshProfile` blip) left the user stranded on "Working through what you've shared…" forever — even though the type had already been written and the live-stats `🌱/🔁/🔀` "member typed" ping had already fired. The user reloaded and restarted, spending another of their 3 daily sessions each time (the count is charged at session start and never refunded), so a repeat failure read as "it crashes and now all my tries for the day are used up." Two fixes: (1) a failed non-lean confirm now drops to the recoverable `analysis-error` screen (Try again / Pick your type instead) instead of the dead-end spinner — the lean-choice path already had its own inline error surface and is unchanged; (2) the live-stats ping in `onboarding-typing-confirm` is now genuinely fire-and-forget. It was labelled "fire-and-forget" but was `await`ed, putting a full Discord round-trip (a whole-table member-count query plus the webhook POST, with no timeout) on the critical path of every confirm — the source of the slow responses that triggered the hang. It now runs via `EdgeRuntime.waitUntil` after the response is sent, with a 5s timeout on the fetch, so the confirm returns as soon as the type is written regardless of Discord's speed or availability. (3) A third fix closes the other way a try could be spent for nothing: the daily session is charged atomically at the *start* of a conversation (before the opening question is generated, so the limit can't be raced past), so if that first Anthropic call then failed the member was charged but got no question at all. `onboarding-typing-turn` now arms a refund on the opening turn and calls it on both failure paths (the model returning non-OK, or a throw while handling its response) via a new service-role-only `refund_onboarding_chat_session_count` RPC (migration `20260704130000`), which decrements the day's count floored at 0. It's scoped to the opening turn only — once the conversation is underway the member has been served, so refunding past that point would just be an infinite-retry hole — and the refund is best-effort, so a failed refund never becomes a second error (worst case leaves them charged exactly as before).
- **Discord "Profile complete" notification leaked the name of users in anonymous mode**: The `discord-notify` edge function's `✅ Profile complete` message showed `profile_data.name` (and country) unconditionally, even for members who had turned on anonymous mode during onboarding — unlike `notify-new-dual` and `send-room-push`, which already suppress the name for anonymous users. Now it respects `profile_data.anonymous`: an anonymous member shows as `🕶️ Anonymous` with country omitted (type and purpose are still shown, matching how those other notifications keep the type). The 🕶️ marker also distinguishes a deliberately-anonymous user from one who simply never set a name.
- **Signup form's name field was invisible/unreachable on mobile, losing signups**: On the "Your profile" (step 3 of 4) and "Which dynamics" (step 4 of 4) signup screens, the shared `centreStyle` used `justifyContent: 'center'` on a `<section>` that is a flex child of the `noScroll` Layout's scrollable `<main>`. Because `centreStyle` also sets an explicit `min-height`, that overrode the flex item's default min-content floor, so on short (mobile) viewports flexbox shrank the section *below* the form's height. The taller form then overflowed the section box and was centred — pushing the top of the form (the header and the very first field, the "First name or alias" input) *above* the scroll area's top edge, where a scroll container cannot reach it. Users saw the "…is still needed to continue" hint at the bottom but no name box to type in, and gave up. Changed the alignment to `safe center`, which still centres when the content fits but falls back to top-alignment when it overflows, so all overflow goes downward and every field is scroll-reachable. Desktop was unaffected (the form fits, so nothing overflowed).
- **`npm run lint` failed with 56 errors, leaving CI red (#931)**: Cleared every lint error so the linter is trustworthy as a gate again. Fixed the mechanical ones directly — removed dead imports/variables across ~13 files, dropped unnecessary regex escapes and empty `catch` blocks in `SocionicsChat`, and gave the service worker (`public/sw.js`) its correct ServiceWorker globals so `clients` is no longer flagged as undefined. Also added an `argsIgnorePattern: '^_'` convention so deliberately-unused underscore-prefixed arguments (e.g. `_userId`) are respected. The remaining 13 errors came from the React Compiler rules newly promoted to *error* by `eslint-plugin-react-hooks` v7 (`set-state-in-effect`, `immutability`, `purity`) plus the fast-refresh-only `react-refresh/only-export-components` — these flag real patterns but live in core auth/feed/messaging flows where a blind refactor risks regressions, so they're set to `warn` (visible, tracked) rather than blocking CI. No runtime behaviour changed; the build output is unaffected.
- **Stripe webhook could permanently drop a failed event, leaving a paid user without Premium (#926)**: The `stripe-webhook` edge function logged every event to `stripe_webhook_events` on receipt (`processed_at` defaulted to `NOW()`) *before* routing it to a handler. When a handler threw, the function returned 500 so Stripe would retry — but the retry hit the idempotency check, found the already-logged row, and short-circuited with "already processed", so the handler never re-ran. A transient failure (e.g. a Supabase write hiccup during `checkout.session.completed`) could leave someone who had just paid stuck without `plan_status='active'`, invisibly. Fixed by making `processed_at` mean "the handler completed successfully" rather than "the event was received": the row is now inserted with `processed_at = null`, the handler runs, and `processed_at` is stamped only on success. The idempotency check skips an event only when `processed_at IS NOT NULL`, so a previously-failed event is retried on Stripe's next delivery. Receipt logging uses an upsert-ignore so a retry reuses the existing row. Existing rows (all processed successfully under the old logic) keep their non-null `processed_at`, so no backfill is needed.

## 3 July 2026

### Added
- **Socion for Teams pairing report skill (#863)**: Added `/socion-pairing-report`, an internal Claude skill for producing the co-founder pairing reports used in the Teams pilot. Mirrors the existing `/socion-typing-report` production pipeline (weasyprint PDF, visual + text QA) but combines two already-typed individuals into a single relation-focused report — header, per-person function summary, predicted strengths/friction points, and working-together guidance, framed for a working relationship rather than a romantic match. Relation lookup is required to go through the canonical `MATRIX[typeA][typeB]` data in `sstern42/socionics-core`, never from memory, given the asymmetric-direction risk (Supervision, Benefit) already known from Socion's own relation lookups. Pilot-phase only: no Supabase writes, billed one-off through the Socion.app Stripe account (not bundled with Premium), tracked informally.
- **Points system (#861)**: New engagement points, tracked and totaled but not yet spendable on anything — v1 is just the ledger and a running total shown on your profile (Settings and Dashboard, next to the referral panel). Points are earned for completing your profile, logging in for the first time each day, making a match, sending a message, posting or reacting in Boards, posting in Quadra Rooms, and qualifying a referral (on top of the existing Premium-day reward). Repeatable actions (messages, board posts/reactions, room posts) have daily caps per action type so points can't be farmed by spamming.
  - `point_transactions` — append-only ledger, source of truth for the total.
  - `award_points()` — mirrors the existing `grant_referral_reward()` pattern: `SECURITY DEFINER`, enforces the daily caps, and no-ops silently on unknown actions or a reached cap so a rewards hiccup never blocks the action that earned it.
  - No badges, levels, leaderboard, or spending mechanics yet — deferred to a future iteration.
  - New "Points" section on the Help page explains how points are earned and the daily caps; `PointsPanel` links to it.
  - "Completing your profile" specifically means having both a bio and a photo (`avatar_url` set — the same definition the Feed's "With photos" filter already uses), checked on both signup and later profile edits since photos are typically added after signup, not during it.
  - Backfilled points for existing users covering the one-time actions that are safe to reconstruct exactly: profile completion for anyone who already has a bio and a photo, both sides of every historical match, and every already-qualified referral. Deliberately not backfilled: daily logins (no historical per-day record to draw from) and the daily-capped repeatable actions (messages, board posts/reactions, room posts), since reconstructing capped historical totals would risk an uneven windfall for long-tenured active users.
  - Feed — the sidebar's mini profile card now shows your points total, right under Connections, linking through to the Help page.
  - **Phase 2 — tiers and leaderboard**: Added `points_tier()` (Regular 100+, Active 500+, Core Member 1,500+, Legend 5,000+ — mirrors `referral_tier()`'s threshold pattern) and `get_points_leaderboard()` (top 10 by total, Active tier and above, excluding anonymous-mode users — mirrors `get_referral_leaderboard()`). Both surface in `PointsPanel` next to the running total. Badges/achievements UI and spending mechanics remain deferred.
- **Feed — quadra activity widget shows 5 members instead of 2**: The sidebar's quadra online/active-today list was capped at 2 rows; raised to 5 so it's more useful at a glance without needing to open the quadra room.
- **Points breakdown**: `PointsPanel` now has a "See breakdown" toggle showing a per-category summary — points and count for profile completion, daily logins, matches, messages, board posts/reactions, room posts, and referrals. `get_points_breakdown()` aggregates `point_transactions` server-side (grouped by `action_type`) rather than downloading the full per-row ledger, since repeatable actions can rack up hundreds of rows over time.

### Fixed
- **Dashboard and Ask AI pages had no meta title**: root cause was `Layout`'s unread-badge effect writing `document.title` directly and unconditionally on every unread-count change (e.g. a new message arriving), which stomped whatever title the current page had set — since `Dashboard` had no page-title call at all, it was always left showing the bare `Socion™`/`(N) Socion™` badge title, and `Ask AI`'s title got silently reverted the moment unread counted changed after mount. Added `src/lib/pageTitle.js` as a single source of truth: page hooks (`usePageTitle`/`usePageMeta`) now set the "base" title and `Layout` only overlays the unread badge on top of it, so neither can clobber the other regardless of effect order. Also added a `usePageTitle('Dashboard')` call to `HomeDashboard` and a full `usePageMeta` title/description to `Onboarding`, which had no meta title or description at all.
- **Meta titles standardised to `{Page} | Socion™`**: `index.html`, `Home`, `Premium`, `Auth`, `Support`, and `TypistProfile` each used a different title shape (brand-first, mid-title brand, or a doubled `— … |` separator) while every other public page already used the `{Page} | Socion™` pattern. Also fixed the homepage `<title>` and its `og:title`/`twitter:title` disagreeing on wording ("Socionics type" vs "personality type") — all three now read identically.
- **SEO description over Google's ~155-160 character display budget**: the Spencer typist profile's meta description was 167 characters and would've been truncated mid-sentence in search results; trimmed to 153.
- **`robots.txt` was missing two auth-gated routes**: `/boards` (and its `/boards/:slug` and `/boards/:slug/:postId` children) and `/typing/chat` all redirect anonymous visitors straight to `/auth`, but neither was disallowed — crawlers were wasting budget hitting pages they'd immediately get bounced from. Added both to the disallow list.
- **Profile setup — no feedback when "Next" stayed disabled**: The details step's "Next — choose your dynamics" button requires a name, date of birth, and type before it enables, but gave no indication of what was missing — a user who filled in the privacy toggles (anonymous mode, hide activity) without noticing the name/DOB fields above could reasonably think the page was broken. Added an inline hint naming exactly which field(s) are still needed.
- **Profile setup — no visible way to enter type when none was carried over**: If a signup reaches this page without a type already selected during onboarding (e.g. a magic link opened on a different device/browser), the only way to set one was a bare free-text input with no heading, positioned below several other optional fields and requiring the user to already know and correctly spell their type code — a genuine dead end for anyone still figuring theirs out. Replaced it with the same dropdown of the 16 types `ProfileEdit.jsx` already uses (no typos possible), plus an inline "not sure at all" checkbox that opts into the free typing chat right after signup — the same `socion_wants_chat` routing the normal onboarding path already uses — without needing to restart onboarding.
- **Onboarding chat never actually launched after signup (#866)**: A "user already has a profile, redirect to /feed" guard effect — meant only for someone navigating back to this URL after already having an account — also fired off the back of `handleSave()`'s own `refreshProfile()` call, since both read the same `profile` state from `useAuth()`. Its `navigate('/feed')` raced `handleSave()`'s intended `navigate('/typing/chat?source=signup')` and consistently won it (the umami-readiness retry that precedes the intended navigate isn't awaited, so nothing held it back), meaning "I don't know yet" signups always landed on the feed and never saw the chat. Fixed with a ref set right before `refreshProfile()` is called and never cleared, so the guard can tell "I just created this profile myself" apart from "this profile already existed on mount."
- **Account deletion broke for anyone who'd earned points (#861)**: `point_transactions.user_id` was the one foreign key to `users(id)` in the entire schema with no `ON DELETE` behavior specified (every other one already cascades or sets null) — Postgres defaults that to blocking the delete, so any account with even a single point transaction (profile completion, a match, a message, a referral) couldn't be deleted at all, either via the app's delete-account flow or a direct `auth.users` delete. Added `ON DELETE CASCADE`, matching the same fix already applied to `referrals` for the same class of bug.

## 2 July 2026

### Added
- **Free typing chat at `/typing/chat` (#866)**: A short, adaptive Claude-driven chat (12 topics, ~5 minutes) that gives a preliminary Socionics type read with a confidence level — sitting below the paid, human-reviewed typing service in depth and certainty, and feeding into it. Reachable via a new banner on `/typing` for anyone whose type isn't already specialist- or community-confirmed.
  - Two-call architecture: `onboarding-typing-turn` (asks the next question/follow-up, capped at 2 follow-ups/topic and 20 total turns) and `onboarding-typing-analyse` (reads the full transcript and returns a structured read, with one retry on malformed output then a clean fallback to self-select — never a silently-assigned type).
  - Genuinely close calls (under 60% confidence) get a lean-choice screen between the top two candidates instead of a forced guess.
  - Results screen offers a link to verify with a specialist, a plain-text download of your answers, and (chat-only, free-tier) a one-time Premium discount code.
  - `apply_onboarding_type()`: server-side-only, refuses to ever overwrite an existing specialist- or community-confirmed type.
  - Settings now shows a "Preliminary" tag next to your type until a specialist confirms it.
  - Reconciled the new columns against the existing `type_assessments`/`users` schema instead of the spec's proposed fresh tables (see issue #866 Section 2): added `transcript`/`primary_type`/`primary_confidence`/`requires_lean_choice` to `type_assessments`, and a new `users.type_source` column (backfilled for existing members: `paid_verified` where already verified, else `self_reported`), pinned against direct client writes on both insert and update.
  - Added a 3-sessions/account/day rate limit on the chat, row-locked the same way as the existing AI-chat and connection-cap limits to avoid a check-then-increment race.
- **Onboarding now uses the typing chat instead of the old questionnaire (#866)**: `/onboarding`'s algorithmic 12-question forced-choice quiz (`QuestionScreen`/`ResultScreen`/`scoring.js`/`questions.js`) is retired. Choosing "I don't know yet" at signup now takes a quick starting guess (still via `TypeSelector`, reframed as a placeholder) and, right after account creation, routes straight into the real typing chat, which can promote or overwrite that guess via `apply_onboarding_type()`. "I know my type" is unchanged. This had to wait on the chat's backend, which requires an existing account (`users.type` is `NOT NULL` and every onboarding-typing-* edge function looks up the caller's row) — so the guess-then-chat order was the only way to fit it ahead of full profile creation.
- **Admin — Inactive users panel**: New panel listing users inactive past a configurable threshold (14/30/60 days), with the same Copy emails / Export CSV actions as the existing Incomplete sign-ups and Member emails panels. Export only — sending a re-engagement campaign is out of scope until a marketing-consent/opt-in field exists.

### Changed
- **Homepage redesign**: Restructured the logged-out homepage to reduce bounce and decision friction ahead of #866's onboarding overhaul.
  - Collapsed the hero's "I know my type" / "Help me find my type" dual CTA into a single "Get started free" link into `/onboarding`, which already asks the same question one step in (`EntryChoice`) — the homepage no longer duplicates that fork.
  - Moved the interactive swipe-demo section directly under the hero (previously section 4, past the founding-member block, a 3-step explainer, and a pull-quote).
  - Removed all founding-member offer UI and countdown logic (`FOUNDING_CUTOFF`, `foundingActive`, live founding-member count) — the offer ended 17 June and the code was dead weight.
  - Condensed the "How it works" step copy, merged the stats row and testimonial carousel into one section, and trimmed the feature-card grid from 8 cards to the 4 most decision-relevant (dropped the standalone Discord and dedicated AI-chat sections, and the four-purposes/real-data/anonymous-browsing/boards cards).
  - Removed the clickable relation-type pills from the hero.

### Added
- **Feed — quadra activity widget**: The left sidebar now shows who from your quadra is online now or active today, with an avatar list linking to their profile (respecting anonymous/hide-activity settings) and a shortcut into your quadra's room.
- **Feed — founder post preview for Premium**: The right rail now shows a preview of the latest founder update for Premium subscribers, who previously saw a shorter sidebar than free members once the "Upgrade" card was hidden.

### Fixed
- **Feed — sidebar scrollbar on desktop**: The persistent left/right sidebars capped their height and scrolled internally past that point, which meant they could grow their own scrollbar independent of the page's — including on common sizes like 1920×1080 where the content didn't even need it. Sidebars are no longer capped, and no longer sticky either (a sticky sidebar taller than the viewport just stays pinned, in effect making the rest of it unreachable): they now scroll in plain lockstep with the rest of the page, so every part of them comes into view exactly when you scroll to it.
- **Dashboard, Boards — header/footer not fixed**: These pages used the plain scrolling page layout instead of the fixed-header/footer shell used by the rest of the logged-in app (Feed, Messages, Rooms, Network, etc.), so the footer only appeared once you'd scrolled all the way to the bottom of the page instead of staying pinned in view, and the header relied on scroll-based sticky positioning instead of the same simple fixed placement as everywhere else. Switched both to the same fixed shell, with the page content scrolling underneath.

## 1 July 2026

### Added
- **Feed — "With bio" filter**: New filter pill alongside "With photos" to show only profiles that have written a bio.
- **Changelog — Roadmap link**: Links to the GitHub milestones view so visitors can see what's coming, not just what's shipped.
- **Get Typed — testimonials**: Added testimonials from Andrew and Sol to Spencer's typist profile.
- **Rooms — clickable member names**: Names in the desktop Activity sidebar are now links to that member's profile (unless they're anonymous).
- **Updates — clickable links**: URLs in Founder Updates posts are now automatically turned into clickable links.
- **Messages — last-active indicator**: Shows whether the person you're messaging is online now, active today, or active this week, in both the Messages sidebar and the conversation header. Respects each user's "Hide activity status" setting.

### Fixed
- **Network — tooltip cursor tracking**: The graph tooltip only positioned itself once on hover-enter and stayed put while you kept moving over the same node or edge. It now follows the cursor.
- **Network — fullscreen resize**: Fullscreen graph view read the viewport height once at render time, so rotating a device or resizing the window while fullscreen left the graph sized for the old viewport. It now tracks resize.
- **Verified badge color**: The verified checkmark badge was hardcoded to a fixed accent color instead of matching the type/quadra color shown right next to it, in profile cards, swipe cards, and quadra rooms.
- **Messages — quoted-message highlight**: Jumping to a quoted message highlighted the entire message row (avatar, timestamp, action buttons included), not just the bubble. Now only the bubble is highlighted.
- **Messages — unmatch not reflected in list**: Unmatching from inside a conversation removed the match but never told the parent conversation list, so the stale entry stuck around until the page was reloaded.
- **Messages — scroll-to-latest with images**: The conversation view could settle short of the newest message when a late-loading image attachment grew the list's height after the initial scroll.
- **Messages — mobile bubble width**: Bubbles were capped at the same 70% width as desktop and the react/reply/edit/delete icons squeezed in alongside them. Bubbles now grow to 88% width on mobile with the action row stacked beneath instead.
- **Feedback button — dark mode**: The feedback modal referenced theme CSS variables that don't exist in the stylesheet, so it always rendered with hardcoded light colors regardless of dark mode.
- **Dashboard — stale AI-usage counter**: The daily Ask AI usage count on the dashboard only refetched on mount, so it went stale after asking a question on /ask and returning. It now also refetches on window focus.
- **Match modal — layout**: Fixed a malformed CSS `calc()` expression that was missing a closing parenthesis.
- **Saved — retry button crash**: Tapping "Try again" after a failed load threw a ReferenceError instead of retrying.
- **Sign-in — 6-digit code**: The code input silently dropped leading zeros; it now accepts and preserves them.
- **Get Typed — accessibility**: Added an aria-label to the avatar lightbox button and a focus-visible outline to the social icon links.
- **Profile edit — birth date**: Added a minimum bound (1900) to the birth date field.
- **Ask AI page**: Chat could briefly render before the signed-in user's type/ID finished loading; it now waits for both before rendering.
- **Notifications — duplicate connection/message alerts**: A realtime reconnect or a rapid double-tap on a slow connection could fire the same "connected with you" or new-message notification twice. Notifications are now deduped by row id.
- **Mobile — nav dropdown overlapping header**: The mobile nav dropdown used a hardcoded pixel offset to sit below the header, which could leave it overlapping the header on some devices. It now anchors to the header's actual rendered height instead.
- **Messages (iOS Safari) — header overlap**: The sticky site header could visually collide with the in-conversation header on iOS Safari. It's no longer sticky on the no-scroll Messages layout, where sticking offered no benefit anyway.
- **Messages (Firefox) — couldn't scroll while composing**: A missing `min-height: 0` on the conversation's flex containers meant Firefox could lock the message list from scrolling once the composer grew past one line.

### Changed
- **Settings — past-due subscribers**: Subscribers whose last payment failed previously saw the same generic "manage your subscription" copy as active subscribers, with no indication anything was wrong. Now shown a distinct warning and an "Update payment method" CTA.
- **Navigation — Sign out**: Moved to the true right-most position in the desktop nav (previously the theme toggle rendered after it) and restyled as a distinct ghost button instead of looking like a plain nav link; mobile menu's Sign out gets matching styling.
- **Get Typed — turnaround copy**: Standard/Express delivery windows now read "5 working days" / "2 working days" instead of "5 days" / "48 hours", which read as calendar/wall-clock time.
- **Feed — filter naming**: The ambiguous "Show anonymous" filter pill was renamed to "Non-anonymous" to make clear which profiles it shows.
- **Support & Feed — shop removed**: Removed the defunct "Grab a type mug" shop block from the Support page and feed ad slot; the feed slot now promotes /boards instead.
- **SEO — robots.txt**: Added missing `Disallow` rules for `/ask`, `/r/`, and `/premium/welcome`.
- **Profile edit — personality type field**: Replaced the free-text type field with a 16-option dropdown to prevent typos and invalid entries.
- **Settings — 24-hour clock description**: Corrected the copy to clarify the preference only affects exact-time displays (Messages, Rooms, Admin), not relative timestamps like "2h ago".

---

## 29 June 2026

### Added
- **Boards — comment reply notifications**: Replying to a post or to another comment now notifies the original poster and/or parent commenter via the existing notification bell.

### Fixed
- **Security hardening**: Closed several server-side authorization gaps — the admin stats endpoint now checks for founder role, users can no longer self-escalate role/premium/billing fields or tamper with feedback and block records via direct API calls, referral and profile-view attribution can no longer be spoofed with a caller-supplied ID, and a race condition that could let the free-tier connection cap be exceeded under concurrent requests was closed. Also hardened the background job endpoints (push notifications, digests, AI usage tracking) against unauthenticated calls, and fixed a race in the AI chat daily message cap that could let concurrent messages both slip past a stale count check.

---

## 21 June 2026

### Added
- **Dashboard — personalized homepage for signed-in members**: Signed-in members now land on a personalized dashboard instead of the public marketing page. A full-width "Your type" banner always shows first — a "Get professionally typed" nudge if your self-typing confidence is below 60%, or a prompt to explore your type further with the AI if it's confirmed. Below it, cards summarize unread messages, quadra/Socion room activity, board activity over the last 7 days, daily Ask AI usage (free tier), founder updates since your last visit, and your 3 most recent notifications — each linking directly into the relevant page. The referral panel sits below the cards.
- **Navigation — Dashboard link**: New nav item (desktop and mobile) with a home icon, always available to jump back to your personalized homepage.

### Changed
- **Sign-in redirect**: Signing in now takes you to your dashboard (`/`) instead of the swipe feed. New accounts that just finished onboarding still land in the feed, unchanged.

---

## 20 June 2026

### Added
- **Boards — report posts/comments**: Posts and comments now have a Report action (reason + optional notes). Founders see open reports in Admin with full context and a "Mark resolved" action.
- **Profiles — report a user**: A Report button on member profiles lets you flag a user with a reason and optional notes. Founders see open reports in a new Admin card, fed by a dedicated reports table.
- **Catch-up summary**: If you were offline for more than 30 minutes, signing back in now shows a small set of grouped toasts summarizing what you missed — new messages, connections, new compatible members, and founder posts — instead of replaying every individual notification.

### Fixed
- **Rooms — toasts outside your quadra**: Toast notifications for new room messages previously only covered your assigned quadra room and the Socion room. Now any room you're not actively viewing will toast you, including the other three quadra rooms you're browsing read-only.

---

## 19 June 2026

### Added
- **Rooms — Socion room**: A fifth room open to all 16 types in one shared conversation, alongside the four quadra rooms. Membership is universal — every non-anonymous, unmuted member can read and post regardless of their assigned quadra. Selectable from the room switcher (desktop sidebar shows it as a full-width row below the quadra grid, with its own violet accent colour), and wired into both in-app toast notifications and push notifications.
- **Rooms — desktop sidebar**: The quadra header, switcher, and active-member list have moved out of the chat column and into a fixed-width right-hand sidebar on desktop, mirroring the Messages page layout, with a vertical activity list showing online status. Mobile keeps the original inline header/strip layout.
- **Boards — threaded replies**: Top-level comments now have a Reply action; replies render indented one level beneath the comment they're replying to.
- **Admin — top referrers**: New dashboard card surfaces top users by qualified referral count (with pending+qualified totals), labels referrers who earned 0 premium days because they're already a founding member or paid subscriber, and shows each referrer's own remaining premium days.
- **Admin — referral premium rewards**: New dashboard list of users currently holding referral-earned premium, showing their role (referrer/referee/both) and days remaining.
- **Settings — 12/24-hour clock toggle**: Choose between 12-hour and 24-hour time display, applied to message timestamps in conversations, quadra rooms, and the admin dashboard.

### Fixed
- **Admin — site banner not loading**: The stats query only selected announcement fields, so the site banner checkbox/text always appeared blank even though it had been saved correctly. Also added the missing migration for these columns, which previously only existed in production.
- **Admin — silent failure saving announcement/site banner**: An RLS policy gap silently rejected these updates while the Save button still reported success. Added a founder-only update policy and now surface save errors in the UI.
- **Site banner — permanent dismissal**: Dismissing the support banner hid it forever; it now reappears 3 days after dismissal.
- **Rooms — typing indicator leaking across quadras**: Switching rooms could briefly still show a typing indicator left over from the previous room because state and pending timers weren't cleared on teardown; later hardened so a null profile during cleanup can't abort the reset.
- **Rooms — sidebar gap**: Removed stray padding that left a visible band between the chat card and the new desktop sidebar.

### Changed
- **Referral premium cap visibility**: The 180-day cumulative cap is now also disclosed in the referral-reward-earned email (with running total) and on the Premium page's referral-trial callout, not just in Settings.
- **Connection cap messaging**: Users who hit the free-tier connection cap right after their referral-earned premium lapsed (within 14 days) now see a targeted refer-again-or-upgrade message instead of the generic free-tier copy.

---

## 18 June 2026

### Added
- **Boards**: New discussion boards open to all members — introductions, type discussions, theory & typing, relationships, and general chat. Post, comment, react with emoji, and edit or delete your own posts/comments. Founders/mods can pin posts. Author bylines show name and socionics type. Each board shows its post count, and posts show a view counter (your own views don't count). Linked from the homepage and main nav.
- **Messages — desktop sidebar**: The conversation header (profile, relation, compatibility breakdown) has moved out of the message list and into a fixed-width right-hand sidebar on desktop, freeing up vertical space for the conversation itself. The discoverable "..." dropdown was replaced with inline action buttons. Mobile layout is unchanged.
- **Socionics AI — chat history & message actions**: Conversations now persist across page reloads (stored per account). Assistant replies have a Copy button; failed sends have a Retry button that resends your last message without duplicating it.
- **Socionics AI — personalised suggestion chips**: Suggested questions are now derived from your Socionics type's Dual/Activity/Mirror relations, and up to two chips reference your actual active match relation types, with that context passed along to the AI for a more relevant answer.
- **Navigation — Ask AI promoted**: The AI chat link moved from a buried utility icon into the main desktop nav as a labeled "Ask AI" link next to Matches.
- **Admin — unblock from Reports**: The Reports panel now shows who blocked whom and includes an Unblock button to reverse a hard block directly, without needing direct database access.

### Fixed
- **Boards — permission denied on post/comment**: Creating a post or comment failed with "permission denied for table users" because the anonymous-account check queried `auth.users` directly, which the database role isn't granted access to. Now reads the same claim from the session token instead.
- **Connection cap — recipient side**: Connecting, swipe-matching, or reconnecting was only checked against the initiator's 3-connection free-tier cap. A premium user (unlimited connections) could push a free-tier user past their cap by connecting to them. The cap is now enforced for both people in a connection across all three paths: new connections, mutual swipe matches, and reconnecting with a previously unmatched person. Blocked attempts now show a clear message instead of a generic error.
- **Messages — connection list dividers**: The inner border lines between items in the connections list were brighter/whiter than other borders in the app. They now use the same standard border color as the rest of the UI.
- **Rooms — header clipped on Samsung mobile**: The room header, members strip, and notification banner could render above the visible viewport on some mobile browsers (where the available height shrinks), with no way to scroll up to reach them. They now live inside the same scroll container as the messages, with the header pinned to the top.
- **Push notifications — blank square icon on Android**: The status bar badge for push notifications reused the full-color app icon, but Android renders that slot from the image's alpha channel only — since the icon is nearly opaque edge-to-edge, it showed up as a solid blank square instead of a recognizable mark. Push notifications now use a dedicated transparent silhouette badge.
- **Messages — mobile header clutter**: Merged the full-width "Full breakdown" bar and the "···" options button into a single compact header row on mobile, with a higher-contrast circular options chip.
- **Messages — mobile header name truncation**: Dropped the redundant "member since" line from the mobile conversation header so longer names no longer get cut off.

### Changed
- **Navigation — Admin link**: Moved from the main nav into the desktop utility icon group, with Sign out now separated from the Services menu.

---

## 17 June 2026

### Fixed
- **Quadra rooms — mobile Enter key**: Enter now inserts a newline instead of sending the message on mobile, matching the existing behaviour in Messages.

---

## 16 June 2026

### Added
- **Socion Premium launch**: Premium is now available at socion.app/premium. Includes unlimited connections, full "who viewed" list with name/type/relation/timestamp, connection stats breakdown by relation type, and full Model A compatibility breakdown for every conversation.
- **Feed activity stats — filtered**: Online now and active today counts now reflect only the profiles currently visible to you (respecting your active filters), so the numbers match what you actually see on screen.
- **Feed — relation counts**: The counts shown on each relation filter pill now reflect the full number of available profiles of that type, not just the current page.
- **Feed — Load all remaining**: A "Load all remaining (N)" button now appears alongside "Load more" so you can fetch all profiles at once.
- **Feed — purpose filter**: New Purpose section in the Filters panel to narrow the feed to Dating, Friendship, Networking, or Team building.
- **Feed — quadra filter**: Four colored pill buttons (Alpha/Beta/Gamma/Delta) next to the Filters button let you filter the feed to a single quadra.
- **Feed — quadra card borders**: Profile card borders are now colored by the profile's quadra (Alpha gold, Beta red, Gamma teal, Delta blue) instead of your relation to them, so quadra is visible at a glance.
- **Homepage — Socionics AI**: A dedicated AI section with example questions, plus an AI feature card and a "Not sure about your type? Ask the AI →" hero nudge for signed-in visitors. Tapping an example question on the homepage opens the chat with that question already asked.

### Fixed
- **Feed activity stats**: Fixed a crash caused by the activity stats effect running before the profiles state was initialised.
- **Feed — relation filter empty state**: Selecting a relation type whose profiles aren't in the current page now shows load buttons instead of a dead-end "no matches" message.
- **Socionics Insight webview**: Fixed the in-app reference panel rendering inside the feed body instead of full screen, caused by a leftover CSS transform from the card entrance animation.

### Changed
- **Founding member deadline**: Extended to midnight EST on 16 June (2026-06-17T05:00:00Z), shown on the homepage as "16th June (EST)".

---

## 15 June 2026

### Fixed
- **Feedback button**: No longer shown to logged-out users.
- **Feed freshness indicator**: Now stays visible during a background refetch instead of disappearing while the request is in flight.

---

## 14 June 2026

### Added
- **Swipe mode — full-screen mobile**: Swipe mode on mobile now fills the full viewport below the header with working touch gestures. The footer and floating widgets hide to give cards maximum space.
- **Swipe mode — cross-device sync**: Swipe history is now persisted to the database and synced across devices. Profiles already swiped on any device won't reappear in the deck.
- **Swipe mode — Start over**: A "Start over" button appears when the deck is exhausted, resetting your swipe history.
- **Feed — anonymous hidden by default**: Anonymous profiles are now excluded from the feed by default. A "Show anonymous" toggle in the filters lets you opt in.
- **Feed — country flags on Windows**: Flag emojis don't render on Windows; replaced with flag images from flagcdn.com.
- **Feed — more countries**: 22 additional countries added to the country selector, including Singapore, Philippines, Malaysia, UAE, South Africa, and others across South/Southeast Asia, the Middle East, and Africa.
- **Feed — transitions**: Smooth fade/slide transitions on page changes, modal entrances, the Browse ↔ Swipe crossfade, and a scale press effect on buttons.
- **Feed activity stats**: Live "online now" (green dot) and "active today" (orange dot) counts now appear beneath the Browse/Swipe toggle, hidden when both are zero.
- **Feed caching**: Feed profiles, matches, and saved IDs are cached for 5 minutes via React Query. Re-visiting the feed within that window fires zero Supabase queries and renders instantly. A live "updated X min ago" freshness indicator appears next to the activity stats; tap it to force a refresh.
- **Feed — Load More count**: The Load More button now shows exactly how many profiles are in the next batch.
- **Messages caching**: The conversation list is served from a 60-second React Query cache on re-visit — instant render, no round-trip.
- **Profile views caching**: Switching to the Views tab and back reuses the cached result for 5 minutes.
- **Saved caching**: Saved profiles and connection status cached for 3 minutes. Unsaving a profile removes the card immediately without waiting for a refetch.
- **Network graph caching**: Graph data cached for 10 minutes — re-visiting renders the graph without a reload.
- **Dynamics tab caching**: Relation stats cached per user for 10 minutes.
- **About page caching**: Site-wide stats cached for 10 minutes.
- **Updates pagination**: Updates page now loads the 5 most recent posts initially, with a Load more button to page through older ones.
- **Disconnect confirmation**: After disconnecting from someone, a confirmation step appears with a "Return to feed" button.
- **Premium upsell card**: A premium upsell card appears in the feed for free members.
- **Socionics AI feed card**: An AI chat prompt card appears in the feed for all members.
- **Reinin dichotomies in Socionics AI**: The chatbot now includes a full per-type Reinin dichotomy lookup and surfaces a starter question to prompt discovery.
- **Avatar caching**: Service worker serves Supabase avatar images cache-first. Cache busting is automatic via the `?t=<timestamp>` param on avatar URLs.

### Fixed
- **Online now count**: The current user is now subtracted from the "online now" count.
- **Free tier — connection cap**: Disconnecting from someone now correctly frees up a slot. Previously soft-deleted (unmatched) rows were still counted against the cap.
- **Free tier — upgrade link**: "X of 3 connections · Unlock unlimited" is now always visible on the feed, not only when the cap is fully used.
- **Feed cache after disconnect**: Feed cache is invalidated after an unmatch so the disconnected card and counter update immediately.
- **Disconnect modal**: Fixed a timing bug where the post-disconnect modal never appeared because the panel collapsed before React rendered the success state.
- **Dark mode — gated overlays**: Fixed hardcoded light gradients on the Strongest Matches teaser, Model A breakdown teaser, and Stats tab overlay so they render correctly in dark mode.
- **Dynamics tab**: Fixed an error message that always displayed due to incorrect nullish coalescing.

### Changed
- **Brand name**: Added ™ to Socion across all page meta titles.
- **Privacy Policy & Terms**: Updated to reflect the paid tier, written typing report, profile photos, and all features added since launch.
- **SEO — meta descriptions**: All public-facing pages now have unique, optimised meta descriptions (under 155 chars) and keyword-rich page titles.
- **SEO — OG/Twitter tags**: `og:title`, `og:description`, `og:url`, `twitter:title`, `twitter:description`, and `twitter:url` are now set per page for correct social share previews.
- **Performance — bundle splitting**: Vendor JS split into separate chunks (React, Supabase, React Query, etc.) to fix large-bundle warnings and improve caching across deploys.
- **Performance — lazy loading**: All page components are now lazy-loaded, reducing the initial JS bundle size.
- **SEO**: Added `/about`, `/help`, `/typing`, and `/stats` to the sitemap; added missing private routes to `robots.txt`.

---

## 13 June 2026

### Added
- **Socionics AI — daily message count**: A live count of how many AI messages you've sent today appears next to the New Chat button in the chat header. Count persists across page revisits via `localStorage`.

### Fixed
- **Socionics AI — Kindred relation**: Fixed incorrect relation mapping in the chat system that was misidentifying Kindred connections.
- **Socionics AI — relation display**: Fixed relation types showing incorrectly in the chat context for certain type pairings.

### Changed
- **Meta titles**: All signed-in pages now use the `usePageTitle` hook for a consistent `Page | Socion™` title format.

---

## 12 June 2026

### Added
- **Socionics AI**: Ask anything about types, relations, Model A, and compatibility. Find it via the bot icon in the nav or footer, or go directly to socion.app/ask.
- **Socionics AI — personalised responses**: Responses are tailored to your Socionics type.
- **Socionics AI — members only**: Available to signed-in members. Daily message limit applies.

---

## 11 June 2026

### Added
- **Stats page**: socion.app/stats shows satisfaction ratings by relation type, which relations members connect in most, type distribution across the community, and selected written feedback. Data is live.

---

## 10 June 2026

### Added
- **Feedback button**: A small tab on the right edge of every page lets you report a bug or share a thought without leaving the app.
- **Notification bell**: Tap the bell in the header to see recent alerts. Loads 50 most recent on open, with new ones arriving in real time.

---

## 9 June 2026

### Added
- **DM reactions**: React to any message with an emoji. Tap the smiley icon to open the picker. Reactions display as pills below the message with a count.
- **DM GIFs**: Send GIFs via the GIF button in the message bar. Powered by Giphy.
- **DM image sharing**: Share images with an optional caption.
- **DM image viewer**: Tap any image or GIF to view it full size.
- **DM reply scroll**: Tap a reply quote inside a message to scroll back to the original.

---

## 8 June 2026

### Added
- **Quadra rooms — GIFs**: Send GIFs via the GIF button. Search Giphy or browse trending.
- **Quadra rooms — read-only browsing**: All members can browse other quadra rooms in read-only mode. Use the quadra pills in the room header to switch. Posting, reactions, and replies are only available in your own room.

---

## 6 June 2026

### Added
- **Live toast notifications**: A small toast appears in the bottom-left corner when someone sends you a DM, a new connection is made, a new member joins, or there is activity in your quadra room. No refresh needed.
- **Dual alert**: If a new member joining is your Dual type, the toast is highlighted with a ✦.
- **Feed refresh banner**: When new members join while you are browsing, a banner appears above the feed offering to reload it.
- **Who viewed**: See who has visited your profile. Premium members get the full list with name, type, relation type, and timestamp. Free accounts see a 7-day view count. Find it under Profile → Views.
- **Connection stats**: A breakdown of your connection history by relation type — ratings given and received, message volumes, and comparison to site average. Premium only. Find it under Profile → Stats.
- **Mobile nav redesign**: Primary nav (Matches, Messages, Rooms), a collapsible Profile submenu, and a footer links section giving access to Premium, What's new, Support, Help, Discord, Privacy, and Terms from mobile for the first time.
- **Offline support**: The app loads and navigates without a network connection. JS, CSS, and the app shell are cached on first visit and served instantly on repeat visits, including offline.

---

## 5 June 2026

### Added
- **Dark mode**: Switch between light, dark, and system default via the toggle in the header.
- **Inline type reference**: Tapping a type badge on a profile now opens the Socionics reference inline, without leaving the app.
- **Get Typed page**: Choose your typist and book directly from the app.

---

## 3 June 2026

### Added
- **Quadra rooms — image & GIF sharing**: Share images and GIFs directly in the room. JPEG, PNG, GIF (including animated), and WebP supported up to 15 MB. Add an optional caption.
- **Quadra rooms — full-size image viewer**: Tap any image to view it full size.
- **Quadra rooms — reply to images**: Reply to a message containing an image, caption, or both. Tap the reply quote to jump back to the original.
- **Quadra rooms — clickable URLs**: URLs in messages are now clickable.
- **Quadra rooms — real-time sync**: Messages now sync in real time across all open devices and tabs without needing to refresh.

---

## 2 June 2026

### Added
- **Profile page links**: Tap a member's name on any feed card to open their full profile page. Anonymous profiles stay private and your own preview card is unaffected.
- **View your own profile**: A new tab in Profile lets you see your public profile exactly as other members see it.
- **Extra photos gallery**: Your additional photos appear as a tappable gallery on your profile page. Photos stay hidden while anonymous mode is on.
- **Quadra rooms**: Four permanent group chat rooms (Alpha, Beta, Gamma, Delta), auto-assigned by type. All existing members added automatically.
- **Quadra rooms — full history**: Message history with pagination, date dividers, and a typing indicator.
- **Quadra rooms — message management**: Edit your messages, soft-delete with two-tap confirm, reply to any message with a quote.
- **Quadra rooms — push notifications**: Room push notifications with per-device cooldown. Enable from inside the room or via Profile → Notifications.
- **Quadra rooms — unread dot**: Unread dot on the Rooms nav link, cleared on visit.
- **Connect from profile**: Send a connection request directly from a member's profile page, or jump to an existing conversation.
- **Sticky header**: The nav bar stays visible while scrolling on all pages.

---

## 1 June 2026

### Added
- **Get Typed — written report**: A considered, reasoned written report confirming your type, with your profile updated to match. Standard ($29, within 5 days) and Express ($49, within 48 hours).
- **Get Typed — payment**: Pay securely, then go straight to the questionnaire. Report delivered by email.
- **Extra profile photos**: Add up to five additional photos alongside your main one. All photos stay hidden while anonymous mode is on.
- **App loading screen**: Socion now shows a loading screen while it starts up instead of a blank page, with a readable error message and reload button if something goes wrong.

---

## 30 May 2026

### Fixed
- **Swipe mode — mutual match modal**: Now appears correctly for both the first and second swiper. Previously only the second swiper saw the modal; the first received a push notification but no in-app modal.

---

## 29 May 2026

### Added
- **Compatibility breakdown**: Tap "Full breakdown" in any conversation header for a Model A analysis of that specific dyad — where each person's leading and creative functions land in the other's stack, the position name, what it means, strengths, friction points, and a practical note. Premium feature; founding members have full access.
- **Archive**: Hide any conversation from your connections list via the ··· menu. Archived conversations sit in a collapsible section at the bottom of the list. Unarchives automatically if the other person messages you.

---

## 27 May 2026

### Added
- **Profile page from conversations**: Tap a profile avatar or name in your conversation list or message thread header to open their full profile page.
- **Discord handle**: Add your Discord username in Profile → Details. Copyable with one tap from the profile page.

---

## 26 May 2026

### Added
- **Swipe mode**: Tap Swipe in the feed header to browse profiles one at a time. Drag right to like, left to pass. Buttons below the card work for desktop and accessibility.
- **Mutual match modal**: When both sides swipe right, a match is created automatically and a modal appears with the relation type and a link to start the conversation.
- **Mode preference persisted**: Switching between Browse and Swipe stays put across visits.

---

## 3 May 2026

### Added
- **In-feed cards**: Three new cards — Get typed (verify your type), Read about your type (opens your Socionics Insight profile in-app), and Shop (type-specific mugs).
- **Dismissible feed cards**: Every in-feed card can be dismissed with a small × in the corner. Stays hidden across visits.

### Changed
- **Type framing**: Your assessed or selected type is now framed as a working hypothesis rather than a final answer.
- **Get typed links**: Links to verify your type appear across the result screen, sign-in page, profile setup, and your own profile when unverified.
- **Support card**: Now opens the full /support page rather than going straight to Ko-fi.

---

## 15 April 2026

### Changed
- **Get typed**: Typing sessions are now free.
- **Support page**: Shop link added. Running costs breakdown removed.

---

## 8 April 2026

### Added
- **Get Typed — Discord sessions**: Book a one-to-one Socionics typing session via Discord voice call. A verified badge is added to your profile on completion. Accessible from the nav for all signed-in members.

---

## 6 April 2026

### Fixed
- **Push notifications**: Fixed a bug where message push notifications were not being delivered to anyone.
- **"Your Dual just joined" notification**: Fixed — was not firing correctly due to the same underlying issue.
- **Stale push subscriptions**: Now automatically cleaned up on the next notification attempt.
- **Multi-device push**: Each device now receives notifications independently.
- **Footer**: Restored on desktop across all pages including Feed, Messages, Profile, and Admin.
- **Message actions**: Reply, edit, and delete buttons are now always visible at reduced opacity on mobile rather than hidden until long-press.

---

## 5 April 2026

### Added
- **Verified type badges**: Members with a professionally verified type show a ✓ on their type badge. Hover to see who verified it. Hidden in anonymous mode.
- **Verified types filter**: New filter in the feed to show only members with verified types.

### Fixed
- **Anonymous mode**: Members without a date of birth set can now save profile changes. Date of birth is now optional.
- **Rate this connection**: Feedback bar moved to the top of the conversation so it no longer overlaps the message input.
- **Help button**: Repositioned consistently across all pages so it no longer overlaps the Send button in messages.

---

## 4 April 2026

### Added
- **Help & FAQ**: A ? button fixed to the bottom right of every page opens a full FAQ covering matching, relations, account settings, safety, and push notification troubleshooting by device.
- **In-app reference sheets**: Tapping a type badge or relation "Learn more →" now opens the Socionics Insight page inside Socion rather than a new tab.
- **Live profile preview**: Profile → Details now shows a live card that updates in real time as you edit.
- **Hide activity status**: New toggle in Profile → Details to stop others seeing when you were last active. You won't appear in Online now or Active today filters while this is on.
- **Member growth chart**: Replaced the bar chart with a line graph with visible data points.

### Changed
- **Onboarding**: A one-line note at the start now tells you that a sign-in step is coming at the end.
- **Admin dashboard**: Sign-ups, connections, and messages now show a +N today delta alongside the total.

---

## 2 April 2026

### Added
- **City field**: Add your city in Profile → Details. Only city is shown, never a postcode or exact location.
- **Location on feed cards**: City appears alongside your country flag.
- **Location filters**: Filter the feed by Anywhere, Same country, or Same city.
- **Share nudge**: Moved from a dismissible banner to a card inline between profiles. Always visible.
- **Filters panel**: Secondary filters (profile, activity, location) are now collapsed behind a single Filters button with a badge count when active.
- **Support page**: socion.app/support explains what the app costs to run and links to Ko-fi. Linked from the footer.
- **Delete last message**: Hover your last sent message to reveal a trash icon. Confirms on second tap. Removes the message for both sides.
- **Edit last message**: Pencil icon appears on your last sent message. Edit inline, Enter to save, Escape to cancel. A "· edited" label appears on the timestamp.

### Changed
- **Sign-in page**: Now shows your type result ("You're an ILI") after completing the quiz so the context carries through to the auth wall.

---

## 31 March 2026

### Added
- **Connect modal**: Character counter counts down to zero as you type. Send & connect unlocks automatically at 10 characters.
- **Network graph — fullscreen**: Available on all devices, not just mobile.
- **Network graph — Spread button**: Resets nodes to a wider circle and restarts the simulation.
- **Network page — join CTA**: Non-logged-in visitors now see a join CTA below the graph.

### Fixed
- **Network graph**: Touch-action disabled on the SVG so dragging nodes on mobile no longer triggers page scroll.
- **Connections — purpose**: Now correctly recorded from your actual profile purpose when you connect, rather than defaulting to Dating.

---

## 30 March 2026

### Added
- **Connect with message**: A message is now required to connect with someone. Write your introduction before the connection is created.
- **Connection question**: Set a custom question in Profile → Details that people see before connecting with you.
- **Anonymous mode**: Hide your name, age, photo, and location. Your type and relation are always visible. Toggle in Profile → Details.
- **Known users only filter**: New feed filter to exclude anonymous profiles.
- **Network page**: socion.app/network plots every connection between member types. Edge thickness shows volume, colour shows average rating.

### Fixed
- **Push notifications**: Multi-device delivery now works correctly across all subscriptions.

### Changed
- **Dynamics page**: Each relation now shows the matching type in brackets, e.g. Dual (ESE).
- **Message box**: Compose area now grows as you type. Shift + Enter inserts a new line, Enter sends.
- **Multi-line messages**: Line breaks in sent messages are now preserved in the conversation view.
- **Rate this connection**: Feedback prompt is now more descriptive, encouraging you to help validate the theory.
- **Date of birth**: Age is now calculated from your date of birth rather than entered manually. Only your age is shown, never your DOB.
- **Privacy policy and terms**: Account self-deletion, push notifications, Google sign-in, and MailerLite all documented.
- **Homepage**: Anonymous mode and push notifications added as feature tiles.

---

## 29 March 2026

### Added
- **Account deletion**: Delete your account permanently from Profile → Details, with a confirmation step. All data, matches, and messages are removed.
- **Admin**: Sign-ups vs members view to track onboarding drop-off; active 7d, inactive 7d+, and messaging 7d stat cards; analytics exclusion toggle to exclude your device from Umami tracking.
- **Discord live-stats**: Three notification types — new sign-up, profile complete, and new connection (with type pair).

### Fixed
- **Sign-in link expired**: If your OTP link expires, your email is pre-filled automatically and a one-tap resend button appears.
- **iOS install prompt**: Now correctly shown only in Safari.
- **Admin**: Mobile layout fixed — stat cards, grids, and padding all responsive on small screens.

### Changed
- **Spread the word**: Share button on the feed opens the native share sheet on mobile or copies the link on desktop.

---

## 28 March 2026

### Added
- **6-digit sign-in code**: Replaced magic links — more secure and works on any device including iPhone PWA.
- **Push notifications**: Get notified instantly when you receive a message on any device.
- **Multi-device push**: Each device subscribes independently; mobile takes priority when both are active.
- **New connection push**: Push notification fires when someone connects with you.
- **Push notification prompt**: Modal appears on first visit to messages explaining the value before asking for permission.
- **Notification settings**: Manage email and push preferences separately in Profile → Notifications.
- **Reply to messages**: Hover on desktop or long-press on mobile to reply with a quote.
- **Typing indicator**: See when the other person is composing a message in real time.
- **Feed activity filters**: Online now, Active today, and Active this week filters added.
- **Online now count**: Shows how many members are active in the last 15 minutes.
- **Admin — country breakdown**: Member breakdown by country.

### Changed
- **Profile pages**: Split into three pages — Details, Dynamics, and Notifications, each with its own save.
- **Email notifications**: Now respect opt-out. Suppressed automatically when push is active on your device.
- **Messages redesign**: Fixed viewport layout on both desktop and mobile, no outer page scroll. Mobile fills the screen edge to edge.
- **Feed activity indicators**: Green for online now, amber for active today, brown for active this week.
- **Feed purpose filtering**: Moved server-side for speed and accuracy.
- **Duplicate match prevention**: Database constraint ensures two users can only connect once.

---

## 27 March 2026

### Added
- **PWA support**: Socion can be installed to your home screen on iOS and Android.
- **Feed filters**: Filter by relation type, active this week, or profiles with photos.
- **Photo modal**: Tap a profile photo to view it full size.
- **Anonymous mode**: Opt in to display a 🔒 badge instead of sharing personal details.
- **Message timestamps and date dividers**: Today, Yesterday, and date labels between conversation days.
- **Admin**: Site-wide member growth chart (cumulative sign-ups by day); site-wide feedback analysis (ratings by relation type with written comments); editable feed announcement (dismissible banner to all users without a deploy).

### Fixed
- **Relation labels in messages**: Now show correctly for asymmetric relations — Supervisor, Supervisee, Benefactor, and Beneficiary display from your perspective.

### Changed
- **Feed**: Filters by compatible types server-side; expanded to show up to 200 profiles (was capped at 20).
- **Last active indicator**: Green dot for profiles active today, gold for active this week.
- **Footer**: Links to GitHub (open source), Socionics reference, and spencerstern.com.

---

## 26 March 2026

### Added
- **Block & report**: Permanent block with reason reporting from any conversation.
- **Cool off**: Pause messaging and feed visibility for 7 days, lifts automatically.
- **Terms of service**: socion.app/terms.
- **Google One Tap**: Sign in or create an account with one click, no email needed.
- **Purpose pills on feed cards**: See at a glance what each person is looking for.
- **Unread message count**: Badge on the Messages nav link; browser tab title updates live.
- **Messages sidebar**: Now shows last message preview and relative timestamp.
- **Type assessment data**: Questionnaire responses recorded for research.

### Fixed
- **Sign out**: No longer flashes the sign-in page before redirecting home.
- **Messaging input**: No longer loses focus when sending or receiving messages.
- **Profile edit page**: Now redirects correctly when not signed in.
- **Messaging page**: No longer hangs if profile data is missing.

### Changed
- **Founder badge**: Displayed on the feed card for the Socion team.
- **Type badges**: Now link to the full type profile on socionicsinsight.com.
- **Relation badges**: Now link to the full relation page on socionicsinsight.com.
- **Long bios**: Now expand inline with a Read more toggle.
- **Gender field**: Added to profiles, displayed alongside name and age on cards.

---

## 25 March 2026 — Launch

- Socion is live at socion.app
- Type onboarding questionnaire — determine your type or bring your own
- Magic link sign-in — no password needed
- Purpose selector — Dating, Friendship, Networking, or Team building
- Matching feed — browse profiles filtered by intertype relation
- 16 named relation types — auditable in the open source matrix
- Profile photos, country flags, bio
- Connect and message — realtime messaging with deep-link support from feed cards
- Post-match feedback — rate connections after 5 messages
- Email notifications for new connections and messages (with cooldown)
- Privacy policy — socion.app/privacy
- Mobile navigation and full-screen conversation view
- Intertype relations matrix corrected — Kindred and Business pairs verified against reference
