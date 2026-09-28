# Scope — Personalized Prospect Pages (rule-based, editable)

_Plain-English spec. No API keys. Assembles from the 20 existing blocks only —
never builds a block from scratch._

## Goal
A salesperson enters a prospect's problem and gets a tailored page **assembled
from the existing block library** using built-in rules. They can preview it,
edit every piece of copy, add/remove/reorder blocks, regenerate if they don't
like it, then publish a link to send to the prospect.

## The flow (rep side, in the dashboard)
1. **Enter details** — prospect name, company, role, and their **primary
   problem** (dropdown). Optional call notes (kept for reference only).
2. **Assemble** — rules pick which blocks go on the page, and in what order,
   based on the problem. (This is the existing rule engine — no AI, no key.)
3. **Preview** — the real assembled page renders on screen (not a summary).
4. **Edit copy** — a panel of labeled text boxes beside the preview ("Hero
   headline," "Hero text," "CTA headline," …). Editing a box updates the
   preview live. (Way B.)
5. **Add / remove / reorder blocks** — an **Add block** button opens the block
   library to insert any of the 20; each block on the page can be removed or
   dragged to reorder.
6. **Regenerate** — one button re-picks a fresh page from the rules. Shows a
   "this replaces your current page — sure?" confirm, because it discards
   current edits and ordering.
7. **Publish** — generates the prospect link (`/v/<token>`). Nothing is sent
   automatically; the rep copies the link and sends it themselves.

## What the rules do (decision logic)
- Map the chosen **problem** to a narrative family (already built).
- From that family, select a **hero block**, one or more **body blocks**, and a
  **CTA block**, in a sensible order (already built as the page plan).
- Fill each block's text with the family's tailored copy + the prospect's
  company/role (already built).
- Output = an **ordered list of blocks, each with its editable text values.**

## What's editable
- Every text value the blocks expose (headlines, body copy, eyebrows, CTA text).
- Block list: add (from library), remove, reorder.
- Not editable: the block's internal design/animation (by design — the blocks
  are the approved, reusable design system).

## The prospect's page (what gets published)
- Renders the rep's final block list, in order, with their edited copy.
- Keeps the **live Orbit demo** (chat + Space tabs + Lens rail + push-to-tool)
  as the interactive centerpiece.
- Standard (non-personalized) prospects keep the current frozen page, unchanged.

## Explicitly OUT of scope
- Real AI / `ANTHROPIC_API_KEY` / model-written copy. (Rules only.)
- Editing block visuals/layout.
- Auto-sending anything to prospects.

## Done when…
- Rep can go: enter problem → see assembled preview → edit any copy → add/
  remove/reorder blocks → regenerate → publish a working link — with no errors.
- The published `/v/<token>` page matches the preview exactly.
- No API keys required anywhere in this flow.
