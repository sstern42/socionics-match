---
name: email-html-template
description: Use this skill whenever Spencer asks to create, draft, or edit an HTML email for a MailerLite campaign — a Socion member update, feature-launch announcement, "what's new" roundup, or any marketing/newsletter send. Triggers include "write a MailerLite campaign", "email template for the new X feature", "draft the next member update email", "turn these changelog entries into an email", or "make an HTML email". Produces hand-authored, email-client-safe HTML that matches the Socion brand and pastes cleanly into MailerLite's custom-HTML editor. Not for the transactional Resend emails in supabase/functions — those are a different system with their own inline styles.
---

# Socion MailerLite Campaign Email Guide

## Overview

This skill produces **HTML email templates for MailerLite campaigns** — the
occasional member updates and feature announcements sent from Socion, signed by
Spencer. The output is a single self-contained HTML file that gets pasted into
MailerLite's **custom HTML** campaign editor.

The canonical starting point is `references/campaign-template.html` — a
ready-to-fill skeleton carrying the exact brand tokens, layout, header, footer,
and required compliance elements. **Start every new campaign by copying that
file and filling it in**, rather than writing HTML from scratch. Only depart
from its structure when the campaign genuinely calls for it.

This is deliberately **not** the same system as the transactional emails in
`supabase/functions/*/index.ts` (referral, daily-digest) that send through
Resend. Those are lightweight, dynamically generated in TypeScript, and delivered
one-off. MailerLite campaigns are hand-authored, sent to a list, and legally
require an unsubscribe link and a physical address. Do not mix the two.

---

## Step 1 — Confirm the brief

Before writing, pin down:

- **The campaign's purpose and the one action you want** (usually a single CTA —
  referral link, open a new feature, reply). Everything else is context.
- **The items to include** — for a "what's new" roundup these are often lifted
  from `CHANGELOG.md` / `src/pages/Changelog.jsx`, but rewritten into
  member-facing, benefit-led copy, not the engineering changelog voice.
- **The subject line and the preheader** — the subject is short, lowercase, em
  dashes fine (e.g. "boards, AI upgrades, referrals — here's what's new on
  Socion"). The **preheader** is the inbox preview text that renders *after* the
  subject; write it as a distinct ~85–100-character line that *extends* the
  subject rather than repeating it (a repeated subject wastes the slot). Together
  they're the whole open-rate pitch, so draft both deliberately.
- **The campaign slug** for UTM tracking (e.g. `june-whats-new`).

If Spencer hasn't said which items to feature, propose a shortlist from the
recent changelog and confirm before drafting the full email.

---

## Step 2 — Brand tokens (do not improvise colours or fonts)

The template is built on a fixed palette and two typefaces. Reuse them exactly.

| Token | Value | Used for |
|---|---|---|
| Canvas | `#f7f4ef` | Page background, footer, CTA-box fill |
| Card | `#ffffff` | Inner container background |
| Card border | `#ddd8ce` | Container + CTA-box border |
| Header / heading ink | `#1a1814` | Dark header bar, headlines, feature titles |
| Gold accent | `#9a6f38` | Links, button fill, "open →" actions |
| Muted gold | `#9a8a6a` | Eyebrows, kickers, section labels, footer links |
| Body text | `#3a3530` | Paragraph and feature-description text |
| Faint text | `#b0a898` | Legal / "why you're receiving this" text |
| Hairline | `#ede8df` | Dividers, footer top border |

- **Fonts:** `Georgia, serif` for the wordmark, headlines, and CTA headline;
  `Arial, sans-serif` for eyebrows, labels, body copy, and buttons. No web fonts
  — email clients can't be trusted to load them.
- **Container width:** `520px` (`.container`), centred on the `#f7f4ef` canvas.
- **Radius:** `6px` on the card, `3–4px` on buttons/CTA box.

Type scale in use: wordmark 22px Georgia; body headline 22px Georgia; CTA
headline 17px Georgia; body copy 15px Arial (lh 1.75); feature description 14px
Arial (lh 1.65); feature title 13px bold uppercase; eyebrows/labels 11–12px
uppercase with wide letter-spacing (0.1–0.12em).

---

## Step 3 — Structure

The email opens with a hidden **preheader** (inbox preview text) immediately
after `<body>`, before the visible card — a hidden `<div>` holding the preview
line, followed by a zero-width-space spacer block that stops the header/body copy
from bleeding into the preview. Fill in the preheader; leave the spacer as-is.

The visible email is then a stack of table sections inside the `520px` card, in
this order:

1. **Header** — dark `#1a1814` bar: `Socion™` wordmark + an uppercase kicker
   with the `{$name}` merge tag (e.g. `Member update · {$name}`).
2. **Body** (`.content` cell):
   - Eyebrow ("From Spencer") → Georgia headline → 1–2 intro paragraphs.
   - Divider → section label ("What's new") → **feature rows**.
   - Each feature row is a 2-column table: a 32px emoji cell + a title/description
     cell. Duplicate the block per item. Give the row class `feature-row` so the
     `@media` query stacks the two columns on mobile.
   - Divider → **CTA box** (tinted panel with eyebrow, headline, pitch, and a
     gold button) → sign-off ("Spencer" + Socion.app link).
3. **"Why you're receiving this"** — one faint sentence of list context.
4. **Footer** — Privacy · Terms · Discord links, the physical address line, and
   the `{$unsubscribe}` link.

Reorder or drop body blocks to fit the campaign (a single-announcement email may
have one feature row and no roundup label), but **never drop the header wordmark,
the address line, or `{$unsubscribe}`**.

---

## Step 4 — Email-client-safe HTML rules

Campaign HTML has to survive Outlook, Gmail, Apple Mail, and mobile clients.
Follow the constraints the template already encodes:

- **Tables for all layout.** No flexbox, no grid, no `<div>`-based columns.
  Nested `<table>` with `cellpadding="0" cellspacing="0" border="0"`.
- **Inline `style=` on every element** for anything visual. The one `<style>`
  block in `<head>` is limited to resets and the single `@media max-width:600px`
  responsive rule — because many clients strip `<head>` styles, nothing there
  may be load-bearing. Anything that must render lives inline.
- **Keep the MSO/webkit resets** at the top of the `<style>` block verbatim
  (`mso-table-lspace`, `-webkit-text-size-adjust`, `img { display:block }`, etc.).
- **Emoji as HTML entities**, never pasted Unicode — see
  `references/emoji-entities.md`. Same for typographic characters
  (`&mdash;`, `&middot;`, `&rarr;`, `&#8482;`, `&amp;`).
- **Dividers are a table row** with `border-top` + `font-size:0;line-height:0`,
  not `<hr>` (inconsistent across clients).
- **Buttons are a `<table>` wrapping an `<a>`** with the fill on the `<td>` and
  padding on the `<a>` — the "bulletproof button" pattern. No `<button>`.
- **No external images/CSS/JS.** If an image is ever added, host it and set
  explicit `width`/`height` and `alt`; assume it may be blocked by default.
- Spacing is done with `margin` on `<p>` and `margin-bottom` on section tables,
  not empty paragraphs.

---

## Step 5 — MailerLite specifics

- **Merge tags** use MailerLite's `{$...}` syntax:
  - `{$name}` — the subscriber's name (already in the header kicker).
  - `{$unsubscribe}` — **required** unsubscribe URL, in the footer. MailerLite
    rejects/flags campaigns without it.
  - `{$email}` — subscriber email, if ever needed.
- **`builder-link-id="…"` attributes:** MailerLite's drag-and-drop editor injects
  these for click tracking. **Do not hand-write or invent them** — omit them in
  authored HTML; MailerLite assigns them, and click tracking still works on
  plain `<a href>` pasted into the custom-HTML block.
- **Physical address is required** (anti-spam law). Keep the
  `Socion · Stern Consulting · London, UK` line in the footer.
- **UTM params** go on every campaign link:
  `?utm_source=mailerlite&utm_medium=email&utm_campaign=<slug>`.
- **Preheader is on you — MailerLite won't add one.** For a custom-HTML campaign
  MailerLite does *not* auto-insert preview text; whatever's in the template's
  hidden preheader block is exactly what shows in the inbox. So it must be filled
  in — if you leave the placeholder or delete the block, the client falls back to
  scraping the first visible text (the "Socion™ / Member update" header), which
  wastes the slot. Don't also fill MailerLite's separate preview-text field: keep
  the in-HTML preheader the single source of truth so the two can't conflict.
- **Authoring flow:** paste the finished HTML into a MailerLite campaign's
  *custom HTML* block. Send a **test email to yourself first** and check it on
  desktop and mobile before scheduling — MailerLite's preview and a real inbox
  don't always agree.

---

## Step 6 — Copy & voice

Match the register of the example campaign:

- **Body copy is lowercase and conversational** ("premium is still yours —
  permanently and free. no card, no subscription, nothing to do."). Headlines,
  feature titles, eyebrows, and labels use sentence case or ALL-CAPS labels as
  shown — but running prose stays lowercase.
- **Benefit-led, not changelog-voiced.** Say what the member gets, not what was
  refactored. Rewrite changelog entries; don't paste them.
- **Em dashes are welcome** here (unlike some other Socion docs). Keep the warm,
  plain-spoken tone. Signed "Spencer".
- Keep feature descriptions to 1–2 sentences. If it needs more, it's probably its
  own email.

---

## Step 7 — Preview & QA before handing off

1. **Render it to look at it.** Save the HTML and open it — send it to Spencer
   with `SendUserFile` (`display: render`) so he can eyeball layout and colour,
   or preview in a browser. The email is the deliverable; show it, don't just
   describe it.
2. **Checklist before it's ready to paste into MailerLite:**
   - `{$unsubscribe}` present in the footer, and the address line intact.
   - `{$name}` (or a safe fallback) in the header kicker.
   - Preheader filled in (not left as placeholder, not a copy of the subject),
     and the zero-width spacer block left intact after it.
   - Every CTA/link has the campaign's UTM params.
   - All emoji and special chars are HTML entities, not raw Unicode.
   - No `builder-link-id` attributes hand-added.
   - Loads with no external requests (no `<img src>` to a CDN, no web fonts).
   - Reads correctly at ≤600px (the `feature-row` cells stack).
3. **Deliver** the `.html` file. Note the subject line and the suggested UTM slug
   alongside it so Spencer can drop both straight into MailerLite.

---

## Reference files

- `references/campaign-template.html` — the fill-in-the-blanks starter. Copy this
  first for every new campaign.
- `references/emoji-entities.md` — emoji → HTML-entity lookup and the
  typographic entities used across campaigns.

## Housekeeping

Per repo `CLAUDE.md`, adding or changing this skill is a repo change — note it in
`CHANGELOG.md`. It is an internal authoring tool, not a visitor-facing product
change, so it does **not** need a `src/pages/Changelog.jsx` entry.
