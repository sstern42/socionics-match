# X (@SocionApp) post queue

Working doc for @SocionApp posts. Not part of the deployed site — this is a
content/ops file, not app code (any `.md` file is already excluded from
triggering a Netlify rebuild per `netlify.toml`, and Vite's `dist` build
never includes it either way).

**Workflow**: draft posts here → copy into [Buffer](https://buffer.com) (or
whichever scheduler) → set `Status` to `Queued` once it's scheduled, `Posted`
once it's gone out, `Skip` if we decide against it. Keep posted copies in
place (with the date it went out) so we don't repeat ourselves too soon.

Related: issue #975 (originally scoped a custom X-API integration; superseded
by this manual draft-then-schedule workflow, so no edge function / API keys
needed).

Voice: match the existing @SocionApp bio/pinned-post tone — direct, a little
wry, confident without hard-selling. No hashtag spam, no emoji unless it's
doing real work. Keep under 280 characters.

---

## Backlog (curated from CHANGELOG.md, reframed as evergreen "did you know"
posts rather than "we just shipped this" — most of these features are weeks
old)

| # | Status | Post | Source |
|---|--------|------|--------|
| 1 | Posted (6 Jul 2026) | Socionics defines 16 relations between the 16 types — not just compatible/incompatible. Duality, Activity, Mirror, Supervision... each a different flavor of ease or friction. We match you by which one you're stepping into, not a percentage score. | Core positioning / relations matrix |
| 2 | Queued (8 Jul 2026) | Our intertype relations matrix is open source. If you think we got a relation wrong, you can read the code and tell us. Most matching algorithms give you a black box; we give you a repo. | 25 Mar launch — "16 named relation types — auditable in the open source matrix" |
| 3 | Queued (10 Jul 2026) | Every match on Socion comes with a full Model A compatibility breakdown — not "you're 87% compatible" but *which* functions are doing the work. Premium shows it on every conversation. | 16 Jun — Socion Premium launch |
| 4 | Queued (12 Jul 2026) | Not sure of your type? Our free typing chat is a ~5 minute adaptive conversation (not a fixed quiz) that gives you a preliminary read with an honest confidence score — including telling you straight when it's a genuine toss-up between two types. | 2 Jul — Free typing chat at /typing/chat |
| 5 | Queued (14 Jul 2026) | Our "Ask the AI" chat shows what your conversation actually cost us in API usage, down to the cent. No hidden agenda — just an honest look at what it takes to run. | 6 Jul — "Ask the AI" cost transparency |
| 6 | Queued (16 Jul 2026) | Beyond 1:1 matching, Socion has 5 group rooms — one for each quadra (Alpha/Beta/Gamma/Delta) plus a shared Socion room open to all 16 types. Different quadras really do talk differently. Come see for yourself. | 19 Jun — Socion room; 18 Jun — quadra rooms |
| 7 | Queued (18 Jul 2026) | Boards: open discussion spaces on Socion for type theory, relationships, and general chat — no matching required. Come argue about whether you're really an LII. | 18 Jun — Boards launch |
| 8 | Queued (20 Jul 2026) | Beyond the base 16 types, socionics has Reinin dichotomies — deeper trait splits like Static/Dynamic and Positivist/Negativist that cut across the type boundaries. Our AI chat has a full per-type lookup if you want to go down that rabbit hole. | 14 Jun — Reinin dichotomies in Socionics AI |
| 9 | Queued (22 Jul 2026) | Curious how your connections map out? Socion has a network graph view of your matches and how they relate to each other — an actual social graph, not just a swipe history. | Network graph feature |
| 10 | Queued (24 Jul 2026) | Socion isn't just for dating. Pick your purpose — Dating, Friendship, Networking, or Team building — and the matching logic adjusts what it's actually optimising for. | 25 Mar launch — purpose selector |
| 11 | Draft | Most apps A/B test button colours to keep you swiping. We built Socion on a decades-old, falsifiable framework for why certain people click and others grate — socionics. You can disagree with the theory. You can't call it vibes. | Core positioning |
| 12 | Draft | Socion started in March 2026 as a matching feed filtered by intertype relation. A few months later: group rooms, boards, a free AI typing chat, and a compatibility breakdown most apps would charge you to fake having. | 25 Mar launch retrospective |
| 13 | Draft | Socionics isn't just romantic. We quietly run "Socion for Teams" pairing reports for co-founders — same relation math, reframed around working friction and complementary strengths instead of chemistry. | Socion for Teams pairing report skill |
| 14 | Draft | You can browse Socion anonymously and hide your activity status. We'd rather you feel safe exploring than inflate our "active users" number. | Anonymous mode / hide-activity settings |
| 15 | Draft | We don't gamify matching — but we do track points for things like completing your profile, chatting in Rooms, and referring people who stick around. A running total, not a growth-hacking treadmill. | 3 Jul — Points system |
| 16 | Draft | Socion has real dark mode — system-aware, not just an inverted colour filter bolted on top. Switch manually, or let your OS decide. | 5 Jun — Dark mode |
| 17 | Draft | Socion installs like a native app on iOS and Android, no App Store required. Offline support means it keeps working — and looking normal — even without a connection. | 27 Mar — PWA support; 6 Jun — Offline support |
| 18 | Draft | Every device you sign into gets its own independent push subscription. Message on your phone and your laptop won't double up on the notification — or miss it either. | 28 Mar — Multi-device push |
| 19 | Draft | You can self-report your type on Socion, or get it professionally verified. Verified members show a checkmark on their badge — hover it to see who verified them. | 5 Apr — Verified type badges |
| 20 | Draft | Prefer talking it through to filling out a form? Book a one-to-one Socionics typing session over a Discord voice call, right from the nav. | 8 Apr — Get Typed — Discord sessions |
| 21 | Draft | socion.app/stats runs on live data: satisfaction ratings by relation type, which relations members actually connect in most, and the community's real type distribution. Not projections. | 11 Jun — Stats page |
| 22 | Draft | After 5 messages, we ask you to rate the connection. That's not busywork — it's the actual data behind the satisfaction-by-relation numbers on our Stats page. | 29 Mar — Rate this connection; 11 Jun — Stats page |
| 23 | Draft | Premium shows you exactly who viewed your profile — name, type, relation, timestamp. Free accounts get a 7-day view count. Either way, no more wondering. | 6 Jun — Who viewed |
| 24 | Draft | Sometimes you just want a break, not a deletion. "Cool off" pauses your messaging and feed visibility for 7 days, then lifts automatically. | 26 Mar — Cool off |
| 25 | Draft | Prefer swiping to browsing? Drag right to like, left to pass, full-screen on mobile. A mutual match creates the connection immediately — no separate "accept" step. | 26 May — Swipe mode; 14 Jun — full-screen mobile |
| 26 | Draft | Anonymous mode hides your name, age, photo, and location. It never hides your type or relation — the whole point of Socion is knowing how you relate to someone, and that part has to stay visible to work. | 30 Mar — Anonymous mode |
| 27 | Draft | Step away from Socion for 30+ minutes and we won't replay every notification one by one when you're back — just a small grouped summary of what you missed. | 20 Jun — Catch-up summary |
| 28 | Draft | Your type on Socion is treated as a working hypothesis, not a life sentence. Self-report it, take the free chat, or get it professionally verified — and revisit it whenever you want. | 3 May — Type framing |
| 29 | Draft | Every typing session on Socion — quiz, chat, or professional review — feeds an actual research dataset on intertype relations. You're not just getting matched; you're stress-testing the theory. | 26 Mar — Type assessment data recorded for research |
| 30 | Draft | We run a public Discord with a live-stats channel — real-time pings for new sign-ups, profile completions, and new connections as they happen. No cherry-picked highlight reel. | 29 Mar — Discord live-stats |
| 31 | Draft | Each quadra has its own colour on Socion: Alpha gold, Beta red, Gamma teal, Delta blue. Learn them once and you can spot someone's quadra before you've even read their type. | 16 Jun — quadra card colours; 19 Jun — room accents |
| 32 | Draft | Sent a typo? Edit your last message inline, no delete-and-retype. Replying quotes the original line so context never gets lost in a long conversation. | 2 Apr — Edit/delete last message; 28 Mar — reply to messages |
| 33 | Draft | DMs and quadra rooms both show a real typing indicator, so you know someone's actually composing a reply — not just left you on read. | 28 Mar — DM typing indicator; 19 Jun — rooms typing indicator |
| 34 | Draft | Socion shows your city, never your exact location or a postcode. Enough to filter by "same city" without turning the app into a location tracker. | 2 Apr — City field / location filters |
| 35 | Draft | Want a professional written type report instead of self-typing? Standard delivery in 5 working days, Express in 2 — either way, a considered, reasoned report, not an algorithmic readout. | 1 Jun — Get Typed written report |
| 36 | Draft | Refer someone who actually sticks around and you both earn premium days, up to a real cap — not an infinite loophole. Check Settings for where your referral tier stands. | 19 Jun — Admin referral rewards / referral tiers |
| 37 | Draft | Every profile and conversation on Socion has a real block-and-report path, with a reason field founders actually read — not a mute button that just pretends the problem went away. | 26 Mar — Block & report |
| 38 | Draft | Filter the Socion feed by relation type, quadra, purpose, activity, verified type, location, or whether they've got a bio and photo. Browse exactly the slice of Socion you care about. | Feed filters, various dates |
| 39 | Draft | Tap any type badge or relation label in Socion and the full Socionics reference opens right inside the app — no tab-switching to look up what "Beneficiary" means. | 4 Apr — In-app reference sheets |
| 40 | Draft | Ask the AI isn't generic — its suggested questions are built from your own type's Dual/Activity/Mirror relations, and can reference your actual matches directly. | 18 Jun — Socionics AI personalised suggestion chips |

_#11 onward stay Draft for now: the Buffer plan caps scheduled posts at 10,
and #2-10 already fill that cap through 24 Jul 2026. The recurring "Buffer X
queue top-up" routine promotes the next Draft rows into Queued as earlier
posts clear (go from Queued to sent) and slots free up, and drafts fresh
entries from new CHANGELOG.md entries when the backlog is running low._

## Upcoming (new changelog entries not yet turned into posts)

_Add a row here whenever a new CHANGELOG.md entry is worth posting; move it
up to Backlog once drafted._

| Date | Changelog entry | Notes |
|------|------------------|-------|
| | | |
