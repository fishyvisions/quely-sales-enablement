# Quely Sales Enablement — Architecture

Three layers, one rule: **each layer only knows about the layer below it.**
The page never contains content. Content never contains layout. The plan decides both.

```
  ┌─ Layer 3 ── PagePlan ────────── quely-page-plans.js + AI generator (dashboard)
  │              decides WHICH content, WHICH visuals, WHAT order
  ├─ Layer 2 ── Visual components ─ Block *.dc.html  (catalog: Quely Content Library)
  │              decides HOW a problem is shown
  └─ Layer 1 ── Content ─────────── quely-content-library.js
                 decides WHAT Quely says
```

The **Prospect Viewer** is not a layer. It is a renderer: it reads a PagePlan and
mounts blocks. It holds no narrative of its own (except the frozen standard page —
see `CLAUDE.md`).

---

## Layer 1 — Content

**File:** `quely-content-library.js` → `window.QuelyLibrary`

The Quely Information Library, cut into tagged, reusable blocks. No layout, no
colours, no component references. Just approved language.

**Unit contract**

```js
{ id, type, topic[], role[], title, body?, points?[], quote?, demo?, cta? }
// type:  problem | capability | usecase | proof | objection | role | cta | statement
// topic: canonical slugs — see TOPICS
// role:  canonical slugs — see ROLES; [] or ['any'] fits all
```

**Exports:** `TOPICS`, `ROLES`, `BLOCKS`, `byId(id)`, `assemble({role, topic})`, `score()`

**Rules**
- Copy is taken from the approved doc. No invented metrics or claims.
- Integration liveness stays neutral ("supported / referenced").
- Adding a new problem = adding tagged units here. Never in a block, never in the viewer.

---

## Layer 2 — Visual components

**Files:** `Block *.dc.html` — **Catalog:** `Quely Content Library.dc.html`

Each block answers *"what is the best way to show this?"* — one narrative beat, one
file, fully prop-driven, independently openable. Blocks are **dumb**: they never
read the store, the URL, the plan, or `QuelyLibrary`.

**Current blocks**

| Block | Beat | Used by |
|---|---|---|
| `Block Hero Thread` | hero: the reasoning frays away from the work | decisions, knowledge |
| `Block Decision Timeline` | problem: history scattered across tools | decisions, knowledge, meeting-outputs |
| `Block Decision Record` | mechanism: one searchable history, Orbit retrieves it | decisions, knowledge |
| `Block Outcome` | outcome: what changes for the team | all |

**Block contract**
- Every string, list, and label is a **prop** with a sensible default (`DEMO`), so the
  block renders standalone as a real section.
- Declared in `data-props` with `$preview` sizing; text props get `editor:"text"` so
  they are editable in place. Structured lists use `editor:null`.
- Self-contained: own background, own padding, own type scale. A page drops it in a
  bare `<section>` and adds nothing.
- Inline styles only. Full-width. No fixed heights.
- Reusable across families — never named for one prospect or one story.

**Adding a visual:** new `Block *.dc.html` → register in the catalog with its type tag
and "Used by" families → reference it from a PagePlan section. The viewer changes by
one `<dc-import>`, nothing else.

---

## Layer 3 — PagePlan

**Files:** `quely-page-plans.js` → `window.QuelyPagePlans`; AI generator in
`Quely Sales Dashboard.dc.html`

The only layer that makes decisions. It picks a **narrative family**, then configures
that family's data and chooses which sections appear.

**Families (V1):** `fragmentation`, `decisions`, `risks` — `capacity` is dormant via
`INACTIVE_FAMILIES` (content + interactive board retained; remove the key to restore).

**Plan contract**

```js
{
  family, familyLabel, topic, topicLabel, accent,
  prospect: { company, name, role },
  workItem: { name, id, tool },
  hero:    { eyebrow, headline, body, visual },
  problem: { headline, body, points[], visual },
  signals, signalsLabel,          // problem-visual chips
  space, orbit, lenses, lensSubject,   // demo scenario DATA (mechanics are fixed)
  capabilities[], capabilitiesTitle,
  proof: { title, posts[] },
  cta: { headline, body },
  sections:    { proof, space, orbit, lenses, capacity, features },  // optional rendering
  primaryDemo: 'orbit' | 'lenses' | 'capacity' | 'space',
  aiGenerated?: true
}
```

**Two ways a plan is produced**

1. **Deterministic** — `buildPagePlan({role, topic, company, name})`. Topic → family →
   configured data. Instant, predictable. The fallback.
2. **Live AI** — the dashboard sends the rep's call notes to Claude, which picks the
   family and writes bespoke `hero`, `problem`, `signals`, `workItem`, `orbit` Q&A,
   `cta`, and **`sections`**. The result is overlaid on the deterministic base so
   anything the AI omits still has approved content beneath it, then stored on the
   prospect record (`prospect.pagePlan`).

**Section selection is the point.** A plan includes only what helps this prospect.
A capacity page carries no Orbit or Lenses; a fragmentation page carries no capacity
board. Required/optional/omitted are **family defaults the AI may override** — a
shorter coherent page beats a padded one.

---

## Rendering

`Quely Prospect Viewer.dc.html` resolves, in order:

1. `prospect.pagePlan` (AI-generated) — wins outright
2. Advanced mode → `buildPagePlan()` from the rep's role + problem pickers
3. Neither → **the frozen standard page** (no plan is built)

Then for each section: `sc-if` on the plan's `sections` flag → mount the block with
plan data as props. `default-page-check.js` runs on every standard-mode load and
verifies the default fingerprints.

---

## Where work goes

| Change | Layer | File |
|---|---|---|
| New/edited Quely copy, a new problem statement | 1 | `quely-content-library.js` |
| A new way to *show* a problem | 2 | new `Block *.dc.html` + catalog entry |
| New narrative family, different section mix, demo scenario data | 3 | `quely-page-plans.js` |
| What the AI is allowed to generate | 3 | generator prompt in the dashboard |
| Mounting a block, section order | renderer | `Quely Prospect Viewer.dc.html` |

**Smells**
- A block reading `QuelyLibrary`, the store, or the URL → it belongs in Layer 3.
- Prospect-specific copy inside a block → it belongs in the plan.
- The viewer holding narrative copy → it belongs in the plan or a block.
- A family with a bespoke one-off block → generalise the block, or it isn't Layer 2.

---

## Open

- **Mixpanel taxonomy** — route the store's internal events through one `track()` seam,
  named to Evan's list (page created, link opened, section viewed/completed, demo
  started/completed, question submitted, CTA clicked, return visit, forwarded).
- **Handoff spec** — knowledge-base ingestion (website + help centre → Layer 1 schema),
  production AI generation against it, real backend + Mixpanel wiring.
