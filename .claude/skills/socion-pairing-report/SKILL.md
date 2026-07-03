---
name: socion-pairing-report
description: Use this skill whenever Spencer asks to produce a Socion for Teams pairing report, combine two individual Socion types into a co-founder pairing analysis, or write up a relation between two already-typed people for the Teams pilot. Triggers include: "pairing report for [name] and [name]", "Teams pilot report", "combine [name]'s and [name]'s types", or a request to analyse a co-founder pair. Do not use this for single-person reports — see /socion-typing-report for that.
---

# Socion for Teams — Pairing Report Production Guide (Pilot Phase)

## Overview

This skill covers production of **Socion for Teams pairing reports**: combining two already-typed individuals into a single report analysing their working relationship, for the Teams pilot defined in the "Socion for Teams" pilot-phase plan. It assumes both people have already been typed individually — this skill does not re-derive type from a questionnaire; it consumes two finished type results and adds a relation layer on top.

**This is a pilot-phase process. No new code, Supabase tables, or Stripe products exist for this — see the Positioning Note at the end before doing anything commercial.**

**Key distinctions from the individual typing report:**

| | Pairing report (Teams) | Individual typing report (Socion) |
|---|---|---|
| Subjects | Two people + their relation | One person |
| Input | Two confirmed types (from /socion-typing-report or equivalent manual typing) | A 12Q questionnaire submission |
| New analysis | Relation lookup + working-relationship framing | Functional analysis from scratch |
| Length | Longer than a single report — two profiles plus relation analysis | ~1,500–2,500 words |
| Billing | Stern Consulting Stripe account (GBP), one-off, pilot pricing | Socion Stripe account (USD) |
| Delivery | PDF to both participants, informal pilot tracking | PDF + email + Socion profile update |
| Supabase | No write — pilot tracking is a spreadsheet | Profile row updated |

These are commercially separate products. Never describe a pairing report as a Socion Premium feature or bundle it with a subscription — it is billed per-report through Stern Consulting.

---

## Step 1 — Gather Inputs

Before starting, confirm you have, for each person:

- Full name and the type acronym they were typed as (e.g. `ILE`, `LSI`)
- The confidence level from their individual typing (carry this forward — do not re-derive it)
- Enough of their individual report's Model A summary (leading + creative function) to draw from — you do not need their full four-position stack, only leading and creative

Also confirm:
- This is a **co-founder / working-relationship** context, not romantic — every section of the report must be reframed accordingly, even where the underlying functional description overlaps with what a typing report would say for a partner match
- Whether this pair is one of the 2–3 pilot pairs and whether pilot pricing (free or nominal discount) applies

If either person hasn't been independently typed yet, stop and route them through `/socion-typing-report` (or manual typing) first. Do not type someone for the first time inside a pairing report.

---

## Step 2 — Relation Lookup

**This is the step most likely to produce a wrong report if rushed. Do not derive the relation from memory.**

1. Look up the relation for this pair using the canonical `MATRIX[typeA][typeB]` convention, verified against the data files in `sstern42/socionics-core` — not from memory, not from a mental model of "what type X and type Y usually are to each other."
2. Establish a consistent, documented convention for which person is `typeA` and which is `typeB` before indexing (e.g. alphabetical by acronym). Several intertype relations are **asymmetric** (Supervisor/Supervisee, Benefactor/Beneficiary) — indexing `[A][B]` vs `[B][A]` can give a different relation. Confirm which direction applies to which person before writing anything into the report.
3. If the relation returned is asymmetric, name explicitly in your own working notes who is in which role — this drives the friction-points framing in Step 3 (the "supervisee" side of a Supervision relation experiences the friction differently from the "supervisor" side).
4. Cross-check: if you have any doubt about the direction, look the pair up both ways and confirm the result is consistent with the source data, not just with what "sounds right."

Do not proceed to Step 3 until the relation is confirmed against the source data, not memory.

---

## Step 3 — Reframe for a Working Relationship

The underlying Model A relation dynamics are the same regardless of context, but the report register is not. When drafting content, actively reframe away from romantic/dating language:

- "Strengths" are about collaboration, division of labour, and complementary blind spots — not chemistry or attraction
- "Friction points" are about decision-making clashes, communication style mismatches, and stress-response incompatibility under deadline or funding pressure — not relationship conflict
- "Guidance" is practical and operational: how to structure roles, what to delegate to whom, what to watch for in high-stakes moments (fundraising, disagreements over direction, crunch periods)

If the underlying typing-report material for either person leans on romantic-context framing, do not carry that language into the pairing report — restate it in working-relationship terms.

---

## Step 4 — Report Structure

### Header
Both full names, both type acronyms (with SI name), and the relation label between them (e.g. "Dual", "Mirror", "Supervision — [Name A] supervises [Name B]" if asymmetric).

### Section 1 — Function Stack Summary (per person)
For each person: leading function and creative function only, one short paragraph each, grounded in their individual typing (not the full four-position breakdown from the individual report).

### Section 2 — Predicted Strengths
3–5 bullets. What this pairing is likely to do well together, grounded in the specific relation and both people's leading/creative functions — not generic relation-type boilerplate.

### Section 3 — Predicted Friction Points
3–5 bullets. Where this pairing is likely to clash or miscommunicate, specific to the relation direction and the individuals' vulnerable-function pressure points if known. If the relation is asymmetric, note which side feels which friction.

### Section 4 — Practical Working-Together Guidance
One short paragraph. Concrete, actionable — role division, communication habits, what to check in on periodically. Not a restatement of Sections 2–3.

### Footer Disclaimer
Match existing brand voice — non-hyperbolic, no overclaiming. Use or closely paraphrase:

> Generated from the Socion intertype relations model. Not a substitute for an honest conversation.

Expect the finished report to run longer than a standard single-person typing report (two profiles plus relation analysis) — do not compress it to individual-report length at the cost of the relation analysis.

---

## Step 5 — PDF Production

Use weasyprint via Python, same production path as `/socion-typing-report`. Adapt branding for the Teams context:

- Cover brand line reads `Socion for Teams · Pairing Report` (not the consumer `Socion · Typing Report` line)
- Cover shows both names and both type acronyms, plus the relation label
- Use a split top accent bar showing both people's quadra colours side by side (reuse the quadra colour table from `/socion-typing-report`), rather than a single accent colour — this is a two-person report and should read as one visually

```html
<div class="cover">
  <div class="cover-accent-split">
    <span style="background: [QUADRA_COLOUR_A]"></span>
    <span style="background: [QUADRA_COLOUR_B]"></span>
  </div>
  <div class="cover-brand">Socion for Teams &middot; Pairing Report</div>
  <div class="cover-type">[TYPE_A] + [TYPE_B] &middot; [RELATION_LABEL]</div>
  <div class="cover-name">Prepared for [NAME_A] &amp; [NAME_B] &middot; [DATE]</div>
</div>
```

Reuse the base CSS from `/socion-typing-report` (Inter font, `--text`/`--muted`/`--rule` variables, `.function-stack`, `blockquote`, `h2` rule styling) and add a `.cover-accent-split` rule (two flex children, each `flex: 1`, `height: 4pt`) in place of the single `border-bottom: 3pt solid var(--accent)` used for individual reports.

Same visual QA as existing typing reports: render to PNG at 100dpi (`pdftoppm -png -r 100`) and verify text extraction with `pypdf`'s `PdfReader` before delivery.

Install if needed: `pip install weasyprint --break-system-packages`

---

## Step 6 — Delivery

Send from spencer.stern@gmail.com. Subject line: `Your Socion for Teams pairing report — [Name A] & [Name B]`.

Because this is pilot phase, the email must do two things the individual-report email doesn't: state the pilot framing plainly, and ask for structured feedback (this is the phase's success criterion, not optional).

```
Hi [Name A] and [Name B],

Your pairing report is attached, covering [Type A] and [Type B] and how the [Relation label] dynamic tends to play out.

This is one of a small number of pilot reports for Socion for Teams, a new pairing-analysis offering we're testing before deciding whether to build it out further. [Pricing line: this one's on the house / at a nominal rate, in exchange for your honest feedback.]

Two things would help a lot:
1. Where did it feel accurate, and where did it miss?
2. Would this have been useful to have before you started working together?

A few sentences on either is plenty. No pressure to be diplomatic about it.

Spencer
```

No em dashes. Sentence case. No hashtags.

---

## Step 7 — Post-delivery Admin (Pilot Phase — No Infrastructure)

**No Supabase write.** This phase has no pairing-report table and no automated tracking — do not invent one. Log informally to a spreadsheet (or the existing client tracker if that's more convenient) with at minimum:

- Pair names and types
- Relation label (and direction, if asymmetric)
- `report_delivered_at`
- `price_charged` (0 or nominal — record what was actually agreed, framed as pilot)
- `feedback_received` (Y/N)
- `feedback_notes` — accuracy and usefulness, verbatim where possible
- `pilot_pair_number` (1, 2, or 3 of the pilot)

### Feedback chase (if no response within ~10 days)

```
Hi [Name A] / [Name B],

Following up on the pairing report from last week — even a couple of lines on what landed and what didn't would be really useful for us as we decide whether to take this further.

Spencer
```

Do not schedule a testimonial-request follow-up for pilot pairs — the pilot's goal is structured feedback for the go/no-go decision, not a public testimonial. Revisit testimonials once (if) this moves past pilot.

---

## Reference — Intertype Relation Names

Use this only to recognise and correctly label a relation returned by the `sstern42/socionics-core` lookup — never to derive the relation itself from these names or from memory of "who typically pairs with whom."

| Relation | Symmetric? |
|---|---|
| Identity | Symmetric |
| Dual | Symmetric |
| Activity | Symmetric |
| Mirror | Symmetric |
| Semi-Duality | Symmetric |
| Kindred | Symmetric |
| Business | Symmetric |
| Super-Ego | Symmetric |
| Quasi-Identity | Symmetric |
| Conflict | Symmetric |
| Supervision (Supervisor / Supervisee) | **Asymmetric** — direction matters |
| Benefit (Benefactor / Beneficiary) | **Asymmetric** — direction matters |

For the two asymmetric relations, always state in the report header which person is in which role (e.g. "Supervision — Alex supervises Jordan"), sourced from the confirmed `MATRIX[typeA][typeB]` lookup, not assumed from type order.

---

## Positioning Note

Socion for Teams is a **pilot-phase, no-infrastructure offering**. Billed through the **Stern Consulting** Stripe account (GBP), one-off per report, no subscription — kept deliberately separate from Socion's consumer Stripe account (USD). Do not mention Socion Premium, bundling, or subscription pricing anywhere in a pairing report or delivery email. Pilot pairs are known contacts selected for feedback, not cold outreach, and pilot pricing (free or nominal) must be explicitly framed to participants as a pilot, not as the eventual commercial rate. No public landing page exists yet — the early-access concept stays a concept until pilot feedback justifies building it.
