# Quely Sales Enablement — Handoff Package (v2)

Everything Claude Code needs to build the production version.

## Start here

**Read `HANDOFF.md` first.** It is the spec: architecture, the four gaps to build, guardrails, environment gotchas, and a suggested build order.

**Then read `CLAUDE.md`.** It holds the protection rules for the approved default page — those are non-negotiable.

## What changed since v1

The v1 package contained 5 files. This one contains the full system:

- **24 visual blocks** (`Block *.dc.html`) — the approved, designed page sections
- **`quely-page-plans.js`** — narrative families, the block registry, `buildPagePlan()`, and the `OWNS` map that keeps one page beat told once
- **`quely-content-library.js`** — ~45 tagged content blocks
- **`Quely Content Library.dc.html`** — browsable catalogue of every block
- **`default-page-check.js`** — regression tripwire for the frozen default page
- **AI generation** in the dashboard (`generateAI()`), producing a bespoke PagePlan from a rep's call notes
- **Mixpanel taxonomy** wired through a single `sendToMixpanel()` seam in `enablement-store.js`

## Contents

| File | What |
|---|---|
| `HANDOFF.md` | **The spec — read first** |
| `CLAUDE.md` | Default-page protection rules |
| `Quely Prospect Viewer.dc.html` | Prospect-facing page (standard + generated modes) |
| `Quely Sales Dashboard.dc.html` | Rep dashboard, link creation, AI generation |
| `Quely Content Library.dc.html` | Block catalogue |
| `Block *.dc.html` (24) | The approved visual blocks |
| `quely-page-plans.js` | Families, block registry, `buildPagePlan`, `OWNS` |
| `quely-content-library.js` | Tagged content blocks |
| `enablement-store.js` | Data + analytics interface — **reimplement server-side, same method names** |
| `default-page-check.js` | Default-page tripwire |
| `support.js` | DC runtime (prototype only) |
| `assets/`, `fonts/` | Logos, product images, Inter |

## The four things to build

Everything else already works. These do not exist:

1. **A real backend** — today all data is in `localStorage`, so a link only works in the browser that created it. This blocks any real use.
2. **Knowledge-base ingestion** — with the guardrails in `HANDOFF.md` §5.
3. **Server-side AI generation** with retrieval over that knowledge base.
4. **Mixpanel wiring** — one function.

## Two rules worth stating up front

- **The default page is frozen.** Verify `[DEFAULT-PAGE-CHECK] PASS` after any viewer change.
- **The rep reviews and edits every generated page before the link is sent.** Do not remove that gate.
