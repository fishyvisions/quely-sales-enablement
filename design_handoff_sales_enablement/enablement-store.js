/* Quely Sales Enablement — simulated backend (localStorage).
   Shared by Quely Prospect Viewer.dc.html and Quely Sales Dashboard.dc.html.
   In production this layer is a real DB + endpoints; here it lives in the browser
   so the whole loop (create link -> prospect views -> analytics + questions) works end-to-end.
*/
(function () {
  var KEY = 'quely_enablement_v1';

  // Canonical sections both surfaces agree on (order = story order).
  var SECTIONS = [
    { id: 'hero',     label: 'Intro' },
    { id: 'problem',  label: 'The problem' },
    { id: 'proof',    label: 'Real teams' },
    { id: 'spaces',   label: 'Spaces' },
    { id: 'orbit',    label: 'Orbit' },
    { id: 'features', label: 'Features' },
    { id: 'cta',      label: 'Book a demo' }
  ];

  var PAIN_ANGLES = ['Jira context', 'EM visibility', 'Orbit / AI', 'Customer context', 'Async discussion', 'Integrations'];

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { prospects: {}, order: [], notifications: [] };
  }
  function save(db) {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {}
  }
  function now() { return Date.now(); }

  function slug(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
  }
  function makeToken(name, company) {
    var base = (slug(company) || 'prospect') + '-' + (slug(name).split('-')[0] || 'x');
    var t = base, i = 2, db = load();
    while (db.prospects[t]) { t = base + '-' + i; i++; }
    return t;
  }

  function blankProspect(token, d) {
    return {
      token: token,
      name: d.name || '',
      company: d.company || '',
      email: d.email || '',
      role: d.role || '',
      pain: d.pain || '',
      focusRole: d.focusRole || '',
      focusTopic: d.focusTopic || '',
      advanced: !!d.advanced,
      blockIds: d.blockIds || [],
      pagePlan: d.pagePlan || null,   // AI-generated bespoke PagePlan (overrides topic→family)
      genNotes: d.genNotes || '',     // the sales-call notes the plan was generated from
      note: d.note || '',
      created: now(),
      visits: [],          // array of timestamps
      firstOpened: null,
      lastOpened: null,
      sectionMs: {},        // { sectionId: milliseconds }
      ctaClicked: false,
      events: [],           // { type, meta, ts }
      questions: []         // { text, section, ts }
    };
  }

  var API = {
    SECTIONS: SECTIONS,
    PAIN_ANGLES: PAIN_ANGLES,

    listProspects: function () {
      var db = load();
      return db.order.map(function (t) { return db.prospects[t]; }).filter(Boolean);
    },
    getProspect: function (token) {
      var db = load();
      if (token === 'latest') { return db.prospects[this.latestToken()] || null; }
      return db.prospects[token] || null;
    },
    /* Block copy overrides. Edited in the dashboard Library; applied by the viewer
       to every page that mounts the block. Keyed by block file basename. */
    getBlockCopy: function (name) {
      try { return JSON.parse(localStorage.getItem('quely_block_copy') || '{}')[name] || null; } catch (e) { return null; }
    },
    setBlockCopy: function (name, copy) {
      var all = {}; try { all = JSON.parse(localStorage.getItem('quely_block_copy') || '{}'); } catch (e) {}
      if (copy) all[name] = copy; else delete all[name];
      try { localStorage.setItem('quely_block_copy', JSON.stringify(all)); } catch (e) {}
      return all[name] || null;
    },
    latestToken: function () {
      var db = load();
      var all = db.order.map(function (t) { return db.prospects[t]; }).filter(Boolean);
      if (!all.length) return null;
      // prefer the most recently created AI-generated / advanced page; else newest overall
      var gen = all.filter(function (p) { return p.pagePlan && p.pagePlan.hero; });
      var pool = gen.length ? gen : all;
      pool.sort(function (a, b) { return (b.created || 0) - (a.created || 0); });
      return pool[0].token;
    },
    createProspect: function (d) {
      var db = load();
      var token = makeToken(d.name, d.company);
      db.prospects[token] = blankProspect(token, d);
      db.order.unshift(token);
      save(db);
      this.track('prospect_created', {
        token: token, prospect: d.name || '', company: d.company || '',
        advanced: !!d.advanced, aiGenerated: !!(d.pagePlan && d.pagePlan.aiGenerated),
        family: (d.pagePlan && d.pagePlan.family) || null,
        topic: d.focusTopic || null, role: d.focusRole || d.role || null
      });
      return db.prospects[token];
    },
    deleteProspect: function (token) {
      var db = load();
      delete db.prospects[token];
      db.order = db.order.filter(function (t) { return t !== token; });
      db.notifications = db.notifications.filter(function (n) { return n.token !== token; });
      save(db);
    },

    /* ============================================================
       ANALYTICS SEAM — the ONE place to wire Mixpanel.
       Everything the prototype records also passes through track(), named to
       the agreed Mixpanel taxonomy. To go live, implement sendToMixpanel()
       below (mixpanel.track(name, props)) — no call sites change.
       ============================================================ */
    MIXPANEL_EVENTS: {
      prospect_created:  'Prospect Page Created',
      link_opened:       'Link Opened',
      return_visit:      'Return Visit',
      link_forwarded:    'Link Forwarded',
      section_viewed:    'Section Viewed',
      section_completed: 'Section Completed',
      section_time:      'Section Time Spent',
      demo_started:      'Interactive Demo Started',
      demo_completed:    'Interactive Demo Completed',
      question_submitted:'Question Submitted',
      cta_clicked:       'CTA Clicked',
      question_started:  'Question Started'
    },
    /* internal event type -> { key, demo? } */
    EVENT_MAP: {
      orbit_demo:    { key: 'demo_started',   demo: 'Orbit' },
      space_tab:     { key: 'demo_started',   demo: 'Space' },
      lens_view:     { key: 'demo_started',   demo: 'Lenses' },
      capacity_demo: { key: 'demo_started',   demo: 'Capacity board' },
      timeline_event:{ key: 'demo_started',   demo: 'Decision timeline' },
      lens_push:     { key: 'demo_completed', demo: 'Lenses' },
      cta:           { key: 'cta_clicked' },
      question:      { key: 'question_submitted' },
      question_start: { key: 'question_started' },
    },
    track: function (key, props) {
      var name = this.MIXPANEL_EVENTS[key] || key;
      var payload = props || {};
      // prototype: buffer + log so coverage is provable without a backend
      try {
        var db = load();
        db.analytics = db.analytics || [];
        db.analytics.push({ key: key, name: name, props: payload, ts: now() });
        if (db.analytics.length > 500) db.analytics = db.analytics.slice(-500);
        save(db);
      } catch (e) {}
      if (typeof window !== 'undefined' && window.__quelyTrackLog) console.log('[track]', name, payload);
      this.sendToMixpanel(name, payload);
    },
    /* PRODUCTION HOOK — replace the body with: mixpanel.track(name, props) */
    sendToMixpanel: function (name, props) { /* no-op in prototype */ },
    analyticsLog: function () { var db = load(); return (db.analytics || []).slice(); },

    // --- tracking (called by the viewer) ---
    recordVisit: function (token) {
      var db = load(); var p = db.prospects[token]; if (!p) return;
      var t = now();
      p.visits.push(t);
      var isFirst = !p.firstOpened;
      if (isFirst) {
        p.firstOpened = t;
        db.notifications.unshift({ type: 'view', token: token, name: p.name, company: p.company, ts: t });
      }
      p.lastOpened = t;
      save(db);
      var base = { token: token, prospect: p.name, company: p.company, advanced: !!p.advanced, visit: p.visits.length };
      this.track(isFirst ? 'link_opened' : 'return_visit', base);
    },
    addSectionTime: function (token, sectionId, ms) {
      if (!ms || ms < 0) return;
      var db = load(); var p = db.prospects[token]; if (!p) return;
      var seen = !!p.sectionMs[sectionId];
      p.sectionMs[sectionId] = (p.sectionMs[sectionId] || 0) + ms;
      save(db);
      if (!seen) this.track('section_viewed', { token: token, section: sectionId, prospect: p.name });
      this.track('section_time', { token: token, section: sectionId, ms: p.sectionMs[sectionId], prospect: p.name });
    },
    recordEvent: function (token, type, meta) {
      var db = load(); var p = db.prospects[token]; if (!p) return;
      p.events.push({ type: type, meta: meta || null, ts: now() });
      if (type === 'cta') p.ctaClicked = true;
      save(db);
      var m = this.EVENT_MAP[type];
      if (m) {
        var props = { token: token, prospect: p.name, company: p.company };
        if (m.demo) props.demo = m.demo;
        if (meta) { for (var k in meta) if (Object.prototype.hasOwnProperty.call(meta, k)) props[k] = meta[k]; }
        this.track(m.key, props);
      }
    },
    addQuestion: function (token, q) {
      var db = load(); var p = db.prospects[token]; if (!p) return null;
      var item = { text: q.text || '', section: q.section || '', ts: now() };
      p.questions.push(item);
      db.notifications.unshift({ type: 'question', token: token, name: p.name, company: p.company, text: item.text, section: item.section, ts: item.ts });
      save(db);
      this.track('question_submitted', { token: token, prospect: p.name, company: p.company, section: item.section, length: item.text.length });
      return item;
    },

    // --- notifications (mock "email to seller") ---
    getNotifications: function () { return load().notifications; },
    clearNotifications: function () { var db = load(); db.notifications = []; save(db); },

    // --- derived helpers ---
    totalMs: function (p) {
      var s = 0; for (var k in p.sectionMs) s += p.sectionMs[k]; return s;
    },
    mostViewedSection: function (p) {
      var best = null, bestMs = -1;
      SECTIONS.forEach(function (sec) {
        var ms = p.sectionMs[sec.id] || 0;
        if (ms > bestMs) { bestMs = ms; best = sec; }
      });
      return bestMs > 0 ? best : null;
    },
    dropOffSection: function (p) {
      // last section that received any dwell
      var last = null;
      SECTIONS.forEach(function (sec) { if ((p.sectionMs[sec.id] || 0) > 0) last = sec; });
      return last;
    },
    status: function (p) { return p.firstOpened ? 'Viewed' : 'Not opened'; },

    // demo helper: wipe everything
    reset: function () { save({ prospects: {}, order: [], notifications: [] }); }
  };

  window.QuelyEnablement = API;
})();
