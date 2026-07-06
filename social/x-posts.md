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

_#11-15 stay Draft for now: the Buffer plan caps scheduled posts at 10, and
#2-10 already fill that cap through 24 Jul 2026. Move these up once earlier
posts clear (go from Queued to sent) and slots free up._

## Upcoming (new changelog entries not yet turned into posts)

_Add a row here whenever a new CHANGELOG.md entry is worth posting; move it
up to Backlog once drafted._

| Date | Changelog entry | Notes |
|------|------------------|-------|
| | | |
