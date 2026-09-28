/* Product analytics — Mixpanel (server-side).
 *
 * HANDOFF §8: the taxonomy is fixed and every call site routes through ONE
 * function. The handoff also recommends emitting server-side once a backend
 * exists (client-side tracking is ad-blockable and visible to prospects) — so
 * this lives here, not in the browser.
 *
 * Connect by setting MIXPANEL_TOKEN. Without it, events are logged to the
 * console so the app runs out-of-the-box (same pattern as server/email.js).
 *
 * Every event carries token, prospect and company, so prospect/company
 * segmentation works immediately.
 */
'use strict';

let mixpanelLib = null;
try { mixpanelLib = require('mixpanel'); } catch (_) { /* optional dependency */ }

const TOKEN = process.env.MIXPANEL_TOKEN || '';
let mp = null;
if (mixpanelLib && TOKEN) {
  mp = mixpanelLib.init(TOKEN);
}

// Canonical event names (HANDOFF §8 — MIXPANEL_EVENTS).
const EVENTS = {
  PAGE_CREATED: 'Prospect Page Created',
  LINK_OPENED: 'Link Opened',
  RETURN_VISIT: 'Return Visit',
  LINK_FORWARDED: 'Link Forwarded',
  SECTION_VIEWED: 'Section Viewed',
  SECTION_COMPLETED: 'Section Completed',
  SECTION_TIME_SPENT: 'Section Time Spent',
  DEMO_STARTED: 'Interactive Demo Started',
  DEMO_COMPLETED: 'Interactive Demo Completed',
  QUESTION_SUBMITTED: 'Question Submitted',
  QUESTION_STARTED: 'Question Started',
  CTA_CLICKED: 'CTA Clicked'
};

// Internal viewer event types → { name, props } (HANDOFF §8 — EVENT_MAP).
const EVENT_MAP = {
  orbit_demo: { name: EVENTS.DEMO_STARTED, props: { demo: 'Orbit' } },
  space_tab:  { name: EVENTS.DEMO_STARTED, props: { demo: 'Space' } },
  lens_view:  { name: EVENTS.DEMO_STARTED, props: { demo: 'Lens' } },
  lens_push:  { name: EVENTS.DEMO_COMPLETED, props: { demo: 'Lens' } },
  cta:        { name: EVENTS.CTA_CLICKED, props: {} },
  question_start: { name: EVENTS.QUESTION_STARTED, props: {} } // first keystroke in the ask box
};

// base identity props on every event
function base(p) {
  if (!p) return {};
  return { token: p.token, prospect: p.name || '', company: p.company || '' };
}

// the ONE function everything routes through
function send(name, props) {
  const payload = Object.assign({}, props);
  if (!mp) {
    console.log(`[analytics] (console mode) ${name} ${JSON.stringify(payload)}`);
    return;
  }
  try { mp.track(name, payload); }
  catch (err) { console.error(`[analytics] track failed: ${err.message}`); }
}

// ── semantic helpers (one per call site) ──────────────────────────────────
module.exports = {
  EVENTS,
  enabled: !!mp,

  pageCreated(p) { send(EVENTS.PAGE_CREATED, base(p)); },

  // recordVisit tells us whether this open was the first
  visit(p, isFirst) {
    send(isFirst ? EVENTS.LINK_OPENED : EVENTS.RETURN_VISIT, base(p));
  },

  sectionTime(p, sectionId, ms) {
    send(EVENTS.SECTION_TIME_SPENT, Object.assign(base(p), { section: sectionId, ms: ms }));
  },

  // maps an internal viewer event (orbit_demo / space_tab / lens_view / lens_push / cta)
  viewerEvent(p, type, meta) {
    const m = EVENT_MAP[type];
    if (!m) return; // untracked internal type
    send(m.name, Object.assign(base(p), m.props, meta ? { meta } : {}));
  },

  questionSubmitted(p, question) {
    send(EVENTS.QUESTION_SUBMITTED, Object.assign(base(p), {
      section: question.section, text: question.text
    }));
  }
};
