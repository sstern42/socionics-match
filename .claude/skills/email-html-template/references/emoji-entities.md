# Emoji as HTML entities

Feature-row and inline emoji in Socion campaigns are written as **HTML numeric
entities**, not pasted Unicode characters (e.g. `&#128172;` not `💬`). Entities
survive MailerLite's editor, copy/paste, and encoding round-trips far more
reliably than raw multi-byte characters, which can silently corrupt to `?` or a
mojibake pair in some clients.

To convert a Unicode emoji to its entity: take the codepoint (hex) and write it
as `&#<decimal>;`. Codepoints above the BMP (most emoji) are a single entity.
Some emoji are a base glyph + the U+FE0F variation selector (`&#65039;`) — keep
both, in order, exactly as the source shows (e.g. the balance scale in the
example is `&#9878;&#65039;`).

## Emoji used in past campaigns

| Emoji | Entity | Meaning / used for |
|---|---|---|
| 💬 | `&#128172;` | Boards, discussion, chat |
| 🧠 | `&#129504;` | AI, Ask AI, smart features |
| 🎁 | `&#127873;` | Referrals, rewards, gifts |
| 🎯 | `&#127919;` | Filters, targeting, purpose |
| 💉 | `&#128137;` | (swipe mode — a loose fit; prefer a better glyph next time) |
| ⚖️ | `&#9878;&#65039;` | Fairness, limits, balance |

## Other useful glyphs

| Emoji | Entity | Meaning |
|---|---|---|
| ✨ | `&#10024;` | New, launch, delight |
| 🚀 | `&#128640;` | Launch, shipping, growth |
| 🔔 | `&#128276;` | Notifications, alerts |
| 🤝 | `&#129309;` | Connections, matches, partnerships |
| 📊 | `&#128202;` | Stats, data, insights |
| ❤️ | `&#10084;&#65039;` | Dating, relationships |
| 🔒 | `&#128274;` | Privacy, security |
| 📱 | `&#128241;` | Mobile |
| ⚙️ | `&#9881;&#65039;` | Settings |
| ✅ | `&#9989;` | Done, verified |

## Non-emoji typographic entities used in the template

| Char | Entity | Notes |
|---|---|---|
| ™ | `&#8482;` | On the "Socion™" wordmark |
| — | `&mdash;` | Em dash — used freely in body copy |
| · | `&middot;` | Separator in kickers and footer |
| → | `&rarr;` | Trailing arrow on buttons / links |
| & | `&amp;` | Always escape literal ampersands |
| (nbsp) | `&nbsp;` | Spacer cells, footer separators |
