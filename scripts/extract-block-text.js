/* One-off: pull each block's default eyebrow/headline/body copy from its source,
   so the dashboard editor can show real starting text and the picker real labels.
   Handles both authoring patterns: `key: '...'` in a DEMO/DEFAULT object, and
   `?? '...'` fallbacks in renderVals. Prints a JSON map keyed by slug. */
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'public', 'blocks');
const SLUGS = [
  'hero-collision', 'hero-thread', 'hero-bottleneck', 'hero-handoff',
  'cta-fragmentation', 'cta-decisions', 'cta-risks', 'cta-knowledge', 'cta-action',
  'relationship-map', 'orbit-lenses', 'multi-tool-space', 'space-anatomy',
  'before-after', 'how-it-works', 'decision-record', 'space-converge',
  'sprint-planning', 'sprint-review', 'team-roles'
];

// Grab the FIRST string literal assigned to `field` via either `field: '...'`
// or `field ?? '...'` / `?? "..."`. Non-greedy, tolerates escaped quotes.
function grab(src, field) {
  var pats = [
    new RegExp(field + "\\s*:\\s*'((?:\\\\.|[^'])*)'"),
    new RegExp(field + '\\s*:\\s*"((?:\\\\.|[^"])*)"'),
    new RegExp(field + "[^\\n]*\\?\\?\\s*'((?:\\\\.|[^'])*)'"),
    new RegExp(field + '[^\\n]*\\?\\?\\s*"((?:\\\\.|[^"])*)"')
  ];
  for (var i = 0; i < pats.length; i++) {
    var m = src.match(pats[i]);
    if (m) return m[1].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\u00b7/g, '·').replace(/\\u2019/g, '’').replace(/\\u2014/g, '—').replace(/\\u00d7/g, '×');
  }
  return '';
}

var out = {};
SLUGS.forEach(function (slug) {
  var src = fs.readFileSync(path.join(DIR, slug + '.html'), 'utf8');
  out[slug] = {
    eyebrow: grab(src, 'eyebrow'),
    headline: grab(src, 'headline'),
    body: grab(src, 'body')
  };
});
console.log(JSON.stringify(out, null, 2));
