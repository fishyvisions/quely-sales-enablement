# Quely Sales Enablement — Engineering Handoff

**For:** the engineer (or Claude Code) building the production version
**From:** a working browser-only prototype, complete and reviewable
**Status of the prototype:** design-complete. All rendering, block composition and AI generation logic exists and works. Nothing is persisted beyond the browser.

---

## 1. What this is

A per-prospect sales enablement tool with two sides:

| Side | File | Who uses it |
|---|---|---|
| **Prospect Viewer** | `Quely Prospect Viewer.dc.html` | The prospect. One link, one tailored page. |
| **Sales Dashboard** | `Quely Sales Dashboard.dc.html` | The rep. Creates links, sees engagement. |

A rep enters a prospect's role, primary problem and call notes. AI selects from a library of approved, pre-designed blocks and composes a page for that prospect. The rep reviews it, then generates a unique link. Engagement flows back to the dashboard.

**Two modes, and the distinction is load-bearing:**

- **Standard** (default) — the frozen, approved generic page. Byte-for-byte unchanged. Protected by a regression tripwire (§7).
- **Advanced** — the generated, per-prospect page.

---

## 2. Build this first (the four gaps)

Everything else in this document is already built. These four are not:

1. **A real backend** — prospect records, tokens, events, notifications. Today: `localStorage`, so a link only works in the browser that created it. **This is the blocker for any real use.**
2. **Knowledge-base ingestion** — §5.
3. **Production AI generation** — §6. The prototype calls a browser AI helper; production needs a server-side call against the knowledge base.
4. **Mixpanel wiring** — §8. One function.

---

## 3. Architecture — three layers

Do not collapse these. The separation is why the output stays on-brand.

### Layer 1 — Content library (`quely-content-library.js`)
~45 tagged content blocks distilled from Quely's Information Library. Each carries `topic[]`, `role[]`, a type (`problem` / `capability` / `usecase` / `proof` / `objection` / `role` / `cta` / `statement`) and a best-fit demo. Exports `assemble({role, topic})`.

### Layer 2 — Visual block library (`Block *.dc.html`, 24 files)
Designed, animated, approved page sections. **These contain the approved copy.** AI selects and populates them; it never designs a new section.

Categories: heroes (5) · mechanism/demo blocks · role and process blocks · CTAs (5).

### Layer 3 — PagePlan (`quely-page-plans.js`)
Decides *which* blocks appear, in *what order*, for a given prospect. Contains:

- **Four narrative families** — `fragmentation`, `decisions`, `risks`, `capacity` (capacity is dormant, see §9). Each family holds a complete scenario: work item, discussion, decisions, links, activity, Orbit Q&A, lens items, proof, CTA.
- **`TOPIC_FAMILY`** — maps each problem topic to one family.
- **`BLOCK_SETS`** — maps each topic to an ordered list of block keys.
- **`OWNS` + `ownedSections(blockKeys)`** — which page beats each block owns. **Critical:** the viewer derives *both* mounting and suppression from this one map, computed from live block keys, never from persisted plan fields. That is what guarantees one beat is only ever told once, including on links created before a schema change.
- **`buildPagePlan({role, topic, company, name})`** — returns the plan.

### The rendering contract

```
buildPagePlan()  →  { blockKeys, blockOrder, sections, ... }
                 →  ownedSections(blockKeys)  →  which inline sections stand down
                 →  viewer mounts blocks in plan order; CTA blocks always last
```

Rules the viewer enforces, worth preserving:
- A **hero block** suppresses the page's own hero *and* problem section.
- **CTA blocks are terminal** — rendered after every inline section, structurally, not by ordering luck.
- **Exactly one CTA per page.**
- Stale block keys are filtered against the live registry, so a removed block can't crash a stored plan.

---

## 4. Data model

```
Prospect {
  token            // URL-safe, e.g. "northgate-lena"
  name, company, email, role
  advanced         // boolean — which mode
  focusRole, focusTopic
  pagePlan         // the generated plan (JSON)
  genNotes         // the rep's call notes the plan came from
  visits[]         // timestamps
  firstOpened, lastOpened
  sectionMs{}      // dwell time per section
  events[]         // { type, meta, ts }
  questions[]      // { text, section, ts }
  ctaClicked
}
```

`enablement-store.js` is the full interface. **Reimplement it server-side with the same method names** and the viewer/dashboard work unchanged: `createProspect`, `getProspect`, `listProspects`, `recordVisit`, `addSectionTime`, `recordEvent`, `addQuestion`, `getNotifications`, `latestToken`.

**Link format:** `?p=<token>`. The prototype also accepts a token via storage handoff because the preview environment strips query strings — production should use the query string only.

---

## 5. Knowledge-base ingestion

**Goal:** widen what the generator *knows* without widening what it *says*.

**Sources:** the Quely website, help-centre/Crisp articles, product and marketing material. Optionally custom integrations holding product info.

**Pipeline:**
1. Fetch from an **allow-list** of pages/sections — not a whole-domain crawl.
2. Chunk into passages.
3. Tag each passage against the existing taxonomy: `topic`, `role`, capability.
4. Store with `source_url`, `fetched_at`, `hash`.
5. Re-run on a schedule; expire stale passages rather than letting them age silently.

**Non-negotiable guardrails — these are the answer to "what if it says something wrong":**

- **Allow-list only.** Pricing, careers and blog excluded by default.
- **Approved copy wins.** Block copy is authoritative. Ingested text may only *adapt a line inside an existing block's structure* — never introduce a section or a claim.
- **Provenance on every generated line.** Record which passage produced it, so a wrong claim is traceable.
- **Freshness.** Passages carry a date; stale ones drop out of the pool.
- **Human review before send.** The rep sees and edits the page before the link is issued. This gate must not be removed.
- **No invented metrics.** The prototype's copy contains none; keep it that way.

---

## 6. AI generation

**The prototype's flow (working, see `generateAI()` in the dashboard):**
1. Rep enters name, company, role, primary problem, call notes.
2. AI is given the notes plus the list of narrative families.
3. AI returns strict JSON: chosen `family`, a bespoke `workItem`, `hero`, `problem`, `signals`, the full `orbit` Q&A scenario, `cta`, and a `sections` map.
4. That overlays the family's base plan; the merged plan is stored on the prospect.
5. Rep reviews, then generates the link.

**For production, change three things:**
- Move the call **server-side** (keys, rate limits, auditability).
- Give the model **retrieval over the knowledge base**, not just the family list.
- Keep the **strict JSON contract** and validate it. Reject and retry rather than rendering a malformed plan.

**Keep:** the family choice as a guardrail. It is what stops the AI inventing unpredictable layouts.

---

## 7. The protected default page

`CLAUDE.md` at the project root holds the full rules. In short:

- The standard (non-Advanced) page is **frozen and approved**. Do not modify `sc-if value="{{ standard }}"` branches or the default fallback values.
- `default-page-check.js` is a regression tripwire. It runs on every standard-mode load and verifies fingerprints: hero headline, 9 logo chips, 3 Reddit posts, checkout scenario, tabs, Orbit/Lens content, 6 capability cards, CTA, all sections.
- **After any viewer change, load with no token and confirm `[DEFAULT-PAGE-CHECK] PASS`.**
- Changes to shared shells, styling or interaction logic affect **both** modes — flag before implementing.

---

## 8. Analytics — Mixpanel

The taxonomy is built and every call site already routes through one function.

**Event names** (`MIXPANEL_EVENTS` in `enablement-store.js`): Prospect Page Created · Link Opened · Return Visit · Link Forwarded · Section Viewed · Section Completed · Section Time Spent · Interactive Demo Started · Interactive Demo Completed · Question Submitted · Question Started · CTA Clicked

Internal events map onto these via `EVENT_MAP` — e.g. `orbit_demo` → *Interactive Demo Started* with `demo: 'Orbit'`; `lens_push` → *Interactive Demo Completed*.

**To connect, change one function:**

```js
// enablement-store.js — prototype
sendToMixpanel: function (name, props) { /* no-op */ }

// production
sendToMixpanel: function (name, props) { mixpanel.track(name, props); }
```

Every event already carries `token`, `prospect` and `company`, so prospect/company segmentation works immediately.

**Recommendation:** once the backend exists, emit these **server-side**. Client-side tracking is ad-blockable and visible to prospects.

---

## 9. Dormant, not deleted

The **capacity-planning** family is deactivated via `INACTIVE_FAMILIES` in `quely-page-plans.js`. Its content, scenario data and interactive capacity board remain in the codebase. Restore by removing the key — do not delete the content.

Four blocks were removed from the catalogue at the client's request (Decision Timeline, Hero Scatter, Cost Of Hunting, Outcome). The files still exist. `_backup_pre_runtime/` holds a pre-upgrade snapshot of all 32 core files.

---

## 10. Environment notes (real constraints, will cost you time)

Found the hard way in the prototype environment. Verify whether each still applies:

- **`href="#id"` does not scroll.** Native hash navigation is suppressed. The nav rail scrolls programmatically via `window.scrollTo` from a measured offset.
- **`style` attribute holes do not re-apply on re-render.** Animations are driven by CSS keyframes toggled by an attribute, not by React state.
- **Never bind a `ResizeObserver` to an element whose height your handler writes** — it loops and hangs the tab.
- **A horizontal SVG path has a zero-height bounding box**, so a percentage-based filter region collapses and clips it away entirely.
- **Mount blocks lazily.** All 24 at once starves the main thread; the catalogue mounts the first few eagerly and the rest on scroll.

---

## 11. Suggested build order

1. Backend + data model (§4) — unblocks everything.
2. Port `enablement-store.js` to the API, same method names.
3. Mixpanel (§8) — one function, immediate value.
4. Knowledge-base ingestion (§5) with guardrails.
5. Server-side AI generation with retrieval (§6).
6. Rep review/edit UI before link issue — the guardrail that matters most.

---

## Deliverables inventory

| File | What |
|---|---|
| `Quely Prospect Viewer.dc.html` | Prospect-facing page, both modes |
| `Quely Sales Dashboard.dc.html` | Rep-facing dashboard + AI generation |
| `Quely Content Library.dc.html` | Browsable block catalogue (19 registered) |
| `Block *.dc.html` (24) | The approved visual blocks |
| `quely-page-plans.js` | Families, block registry, `buildPagePlan`, `OWNS` |
| `quely-content-library.js` | ~45 tagged content blocks |
| `enablement-store.js` | Data + analytics interface (reimplement server-side) |
| `default-page-check.js` | Default-page regression tripwire |
| `CLAUDE.md` | Protection rules for the default page |
| `Quely Sales Deck.dc.html` | 9-slide buyer-facing deck |
| `Quely One-Pager.dc.html` | Letter one-pager, PDF-ready |
| `Quely Orbit Video.dc.html` | 9:16 Orbit explainer |
