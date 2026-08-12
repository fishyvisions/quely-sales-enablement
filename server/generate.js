/* Per-prospect page generation (HANDOFF §6).
 *
 * A rep enters a prospect's role, primary problem (topic) and call notes; this
 * produces a PagePlan — the tailored composition the Prospect Viewer renders in
 * "Advanced" mode. The narrative FAMILY (chosen from the topic) is the guardrail
 * that keeps output on-brand; the plan is built from the approved content in
 * quely-page-plans.js.
 *
 * Two modes:
 *   - Smart templates (default, no key): the family plan, personalized with the
 *     prospect's company/role. Reliable and fully on-brand.
 *   - Real AI (when ANTHROPIC_API_KEY is set): the model reads the call notes and
 *     rewrites bespoke lines INSIDE the approved structure. Not yet wired — the
 *     module is structured so the AI call slots in here later. Falls back to
 *     templates until then.
 *
 * The rep always reviews/edits before the link is issued (the gate that matters).
 */
'use strict';

const PP = require('./quely-page-plans');

// Active problem topics (grouped by family), for the dashboard's problem picker.
// Labels are the rep-facing wording; the plan itself uses approved block copy.
const TOPICS = [
  // fragmentation
  { slug: 'context-fragmentation', label: 'Context scattered across tools', family: 'fragmentation' },
  { slug: 'work-before-work',      label: 'Work before the real work',       family: 'fragmentation' },
  { slug: 'conflicting-info',      label: 'Conflicting sources of truth',    family: 'fragmentation' },
  { slug: 'human-search-engine',   label: 'Being the human search engine',   family: 'fragmentation' },
  { slug: 'repeated-translation',  label: 'Re-explaining the same context',  family: 'fragmentation' },
  // decisions
  { slug: 'decision-traceability', label: "Decisions aren't traceable",      family: 'decisions' },
  { slug: 'unexplained-change',    label: 'Unexplained changes',             family: 'decisions' },
  { slug: 'knowledge-loss',        label: 'Knowledge walks out the door',    family: 'decisions' },
  { slug: 'onboarding',            label: 'Slow onboarding / ramp-up',       family: 'decisions' },
  { slug: 'ceremony-loss',         label: 'Context lost between meetings',   family: 'decisions' },
  // risks
  { slug: 'risk-dependencies',     label: 'Hidden risks & dependencies',     family: 'risks' },
  { slug: 'status-chasing',        label: 'Chasing status updates',          family: 'risks' },
  { slug: 'distributed-async',     label: 'Distributed / async teams',       family: 'risks' }
];

const ROLES = [
  { slug: 'eng-leader', label: 'Engineering leader' },
  { slug: 'pm',         label: 'Product manager' },
  { slug: 'exec',       label: 'Executive / VP' },
  { slug: 'ops',        label: 'Delivery / program manager' },
  { slug: 'ic',         label: 'Individual contributor' }
];

const AI_ENABLED = !!process.env.ANTHROPIC_API_KEY;

function topicLabel(slug) {
  const t = TOPICS.find((x) => x.slug === slug);
  return t ? t.label : slug;
}

/* Build the tailored plan. `notes` are the rep's call notes — kept on the
   prospect (genNotes) and, once AI is wired, fed to the model. */
function generatePlan(opts) {
  opts = opts || {};
  const topic = opts.topic || 'context-fragmentation';
  const plan = PP.buildPagePlan({
    topic: topic,
    role: opts.role || 'eng-leader',
    company: opts.company || '',
    name: opts.name || ''
  });
  // Carry the rep-facing topic label onto the plan (nicer than the family label).
  plan.topicLabel = topicLabel(topic);
  if (plan.hero) {
    plan.hero.eyebrow = opts.company
      ? ('For ' + opts.company + ' · ' + plan.topicLabel)
      : ('For teams facing ' + plan.topicLabel.toLowerCase());
  }
  plan.generatedBy = AI_ENABLED ? 'ai' : 'template';
  return plan;
}

module.exports = {
  TOPICS,
  ROLES,
  aiEnabled: AI_ENABLED,
  topicLabel,
  familyFor: PP.familyFor,
  activeFamilyKeys: PP.activeFamilyKeys,
  generatePlan
};
