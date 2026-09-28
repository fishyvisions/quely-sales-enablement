/* Per-prospect page assembly (rule-based, no AI) — v3.
 *
 * A rep enters a prospect's role and primary problem. Built-in rules
 * (quely-page-plans.js: BLOCK_SETS) decide WHICH reusable blocks go on the page
 * and in what order (Hero → Problem → Solve → Pre-footer CTA). We never write a
 * block from scratch — we pick, order, and surface them; the rep edits the copy.
 *
 * Output (v3 shape the Page Builder + Viewer share):
 *   meta      — topic/role/company/name/family
 *   blocks    — ordered list: { key, slug, role, label, surface, fields, props }
 *               props carry the block's default copy + its assigned `surface`.
 *   blockKeys — the order, for the viewer's `custom` contract.
 *
 * On publish the builder stamps `custom:true` and the rep's `copy` overrides.
 * No API keys anywhere in this flow.
 */
'use strict';

const PP = require('./quely-page-plans');
const LIB = require('./block-library');

// Problem topics for the dashboard picker (aligned to BLOCK_SETS in the engine).
const TOPICS = [
  { slug: 'context-fragmentation', label: 'Context scattered across tools', family: 'fragmentation' },
  { slug: 'work-before-work',      label: 'Work before the real work',       family: 'fragmentation' },
  { slug: 'conflicting-info',      label: 'Conflicting sources of truth',    family: 'fragmentation' },
  { slug: 'human-search-engine',   label: 'Being the human search engine',   family: 'fragmentation' },
  { slug: 'repeated-translation',  label: 'Re-explaining the same context',  family: 'fragmentation' },
  { slug: 'decision-traceability', label: "Decisions aren't traceable",      family: 'decisions' },
  { slug: 'unexplained-change',    label: 'Unexplained changes',             family: 'decisions' },
  { slug: 'knowledge-loss',        label: 'Knowledge walks out the door',    family: 'decisions' },
  { slug: 'onboarding',            label: 'Slow onboarding / ramp-up',       family: 'decisions' },
  { slug: 'ceremony-loss',         label: 'Context lost between meetings',   family: 'decisions' },
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

function topicLabel(slug) {
  const t = TOPICS.find((x) => x.slug === slug);
  return t ? t.label : slug;
}

// Build one editable block entry: default copy from the block + its surface.
function blockEntry(key, surface) {
  const entry = LIB.get(key);
  if (!entry) return null;
  const props = Object.assign({ surface: surface }, entry.fields);
  return {
    key: entry.key, slug: entry.slug, role: entry.role, label: entry.label,
    surface: surface, fields: LIB.editableFields(entry), props: props
  };
}

/* Assemble the page from the rules. `notes` are kept on the prospect for
   reference; they do not drive generation (rules only, no AI). */
function assemblePlan(opts) {
  opts = opts || {};
  const topic = opts.topic || 'context-fragmentation';
  const role = opts.role || 'eng-leader';
  const company = opts.company || '';
  const name = opts.name || '';

  const base = PP.buildPagePlan({ topic: topic, role: role, company: company, name: name });

  // Rule-selected keys, resolved to real servable blocks (retired keys drop out).
  const keys = (base.blockKeys || []).map(LIB.resolveKey).filter(function (k) { return !!LIB.get(k); });
  const surfaces = PP.assignSurfaces(keys);
  const blocks = keys.map(function (k, i) { return blockEntry(k, surfaces[i]); }).filter(Boolean);

  return {
    version: 3,
    custom: false,
    generatedBy: 'rules',
    meta: {
      topic: topic, topicLabel: topicLabel(topic), role: role,
      company: company, name: name, family: base.family, familyLabel: base.familyLabel
    },
    blocks: blocks,
    blockKeys: blocks.map(function (b) { return b.key; })
  };
}

// Surface assignment exposed for the builder (recompute on reorder/add/remove).
function surfacesFor(keys) { return PP.assignSurfaces((keys || []).map(LIB.resolveKey)); }

module.exports = {
  TOPICS,
  ROLES,
  aiEnabled: false,
  topicLabel,
  blockLibrary: LIB.BLOCKS,
  familyFor: PP.familyFor,
  activeFamilyKeys: PP.activeFamilyKeys,
  assemblePlan,
  surfacesFor,
  generatePlan: assemblePlan // back-compat alias for /api/generate
};
