# Design changes since the last handoff (v3)

Apply these on top of the existing build. Where the app already implements something
(backend, login, analytics, inbox, notifications, Mixpanel stream), keep your version —
only the design and behaviour below are new.

## 1. Brand refresh
- Every block, the Prospect Viewer and the Dashboard are on the dusk palette from the
  new homepage: paper `#ECE7F2`, card `#F8F5FB`, ink `#1A1611`, deep purple `#41186F`,
  brand violet `#5C28A4`, periwinkle `#9385E6`. Type: Geist (display), Geist Mono (labels).
- Product mockups use a hard frame: `2px solid #1A1611` + `6px 6px 0 #1A1611` offset on
  light surfaces; on dark surfaces the offset is violet `#5C28A4`.
- Blocks repaint by position: each block reads a `surface` prop and derives its text colours
  from it (see `SURFACES` / `assignSurfaces` in `quely-page-plans.js`). Never hardcode
  white or ink text inside a block.

## 2. Default page (protected — see CLAUDE.md)
- Hero, Space tabs (Discussion / Docs & assets / Decisions / Activity) rebuilt from real
  product screenshots; fixed-height panel.
- Orbit section: "Suggested prompts" as full-width white cards; answers show no Sources row.
- Lenses: one full-width panel matching the product. Filter pills, per-row hover actions
  (Push to tool · Schedule meeting · Dismiss), push modal with 8 tools (GitHub Issues is
  the only "Soon"), schedule modal. Interactivity cues are CSS-driven, one per affordance,
  and clear independently (filter → row → actions).
- Footer uses `assets/quely-logo-dark.svg` (white wordmark). Line: "Keep the full context
  of every task in one place."
- Orbit mascot everywhere is `assets/quely-orbit-pet.png` (transparent, trimmed).

## 3. Custom pages — five-section structure
Every personalized page is: Hero → Problem → How Quely solves it → Pre-footer CTA → Footer.
`BLOCK_SETS` in `quely-page-plans.js` holds the default set per problem. Exactly one CTA
per page, always last. Old generic sections never render between blocks.

## 4. Block library (19 active blocks)
Removed from the library: Cost Of Hunting, Decision Timeline, Outcome, Hero Scatter,
Sprint Review. All copy was reviewed and rewritten block by block — treat the copy in each
`Block *.dc.html` DEMO object as final.

## 5. Page Builder — NEW (`Quely Page Builder.dc.html`)
- Pick prospect + problem → rules assemble the page.
- Block list: reorder (up/down), remove, click to edit eyebrow/headline/body (blank =
  block default). **Add block** opens the library; clicking a block adds it **at the end**.
- **Regenerate** rebuilds from the rules after an inline confirm (browser dialogs are
  blocked in some embeds — keep it inline).
- Live preview scales to its column width, never cropped.
- **Publish** creates the prospect link. The plan is saved with `custom: true`,
  `blockKeys` (order) and `copy` (per-block overrides).

## 6. Viewer contract changes
- If `pagePlan.custom` is true, render `pagePlan.blockKeys` in that exact order — do not
  re-derive from the rules.
- Per-prospect `pagePlan.copy[blockKey]` wins over Library copy edits.
- Mounting and suppression both come from `ownedSections(blockKeys)`.

## 7. Mixpanel
Event names are fixed in `enablement-store.js` (`MIXPANEL_EVENTS`). Emit server-side.
Includes *Question Started* (first keystroke) and *Question Submitted*.
