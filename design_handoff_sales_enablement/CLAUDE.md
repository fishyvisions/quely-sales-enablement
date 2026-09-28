# Project rules — Quely sales enablement

## PROTECTED: the default prospect page
The STANDARD (non-customized) experience in `Quely Prospect Viewer.dc.html` is approved and frozen. It renders whenever a prospect record has no PagePlan.

Rules for all future work:
1. **Never modify** `sc-if value="{{ standard }}"` branches, the default fallback values in the viewer's logic class (hero/problem/CTA defaults, `LENSES`, `ANSWERS`, the fixed six capability cards), or the three original Reddit posts — unless the user explicitly approves a default-page change.
2. Visual-component / content-library / generator work touches ONLY: `sc-if advanced` branches, `quely-page-plans.js`, `quely-content-library.js`, the dashboard, and NEW advanced-only sections.
3. New narrative visuals are built as **new advanced-only blocks** beside existing sections — never by replacing a shared shell.
4. Any proposed change to shared shells, shared styling, or shared interaction logic (section frames, Orbit panel mechanics, Space tab chrome, motion system) affects BOTH modes — **flag it to the user and get approval before implementing**.
5. `default-page-check.js` is the regression tripwire. It runs on every standard-mode load of the viewer and verifies the default fingerprints (hero headline, 9 logo chips, 3 Reddit posts, checkout scenario, tabs, Orbit/Lens content, 6 capability cards, CTA, all sections). After ANY viewer edit, load the viewer with no token and confirm `[DEFAULT-PAGE-CHECK] PASS` in the console / `window.__defaultPageCheck.pass === true`. Update its fingerprints only with explicit user approval.
6. The capacity-planning family is dormant (`INACTIVE_FAMILIES` in `quely-page-plans.js`) — do not delete its content; restore only on request.
