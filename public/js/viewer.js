/* Quely Prospect Viewer — client behaviour (v3).
 *
 * Standard mode: the frozen, approved default page (verified by
 * default-page-check.js). Advanced/custom mode: a page assembled from the design
 * blocks (see applyPlan). The token comes from the /v/<token> URL; personalization
 * + tracking go through the API.
 */
(function () {
  'use strict';

  var parts = location.pathname.split('/').filter(Boolean);
  var token = parts[0] === 'v' && parts[1] ? decodeURIComponent(parts[1]) : null;

  var tracking = false;
  var prospect = null;
  var current = 'hero';

  // ── tiny API layer (fire-and-forget tracking) ────────────────────────────
  function post(path, body) {
    try {
      return fetch(path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}), keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }
  function beacon(path, body) {
    try {
      var blob = new Blob([JSON.stringify(body || {})], { type: 'application/json' });
      if (navigator.sendBeacon && navigator.sendBeacon(path, blob)) return;
    } catch (e) {}
    post(path, body);
  }
  function recordEvent(type, meta) { if (tracking) post('/api/v/' + encodeURIComponent(token) + '/event', { type: type, meta: meta || null }); }

  // ── Orbit answer engine (canned-smart) ────────────────────────────────────
  var ANSWERS = [
    { keys: ['block', 'stuck', 'wait', 'depend'], text: "It's blocked on a payments dependency. The card-tokenization change owned by the Platform team has to land first, and that work is still in review, so checkout can't be finished until it merges." },
    { keys: ['chang', 'update', 'happen', 'latest', 'status', 'going on', 'new'], text: "Since last week: scope was narrowed to card checkout only, a payments dependency was flagged as the blocker, and CS raised that a customer is expecting this for their renewal. The ticket itself still just says “Fix checkout flow.”" },
    { keys: ['customer', 'renew', 'churn', 'account', 'client'], text: "A customer is expecting this fix before their upcoming renewal. CS logged it as a renewal risk, and it came up directly on the last customer call, which is why it got prioritized." },
    { keys: ['why', 'decid', 'reason', 'choose', 'chose', 'approach', 'scope'], text: "Scope was narrowed to card checkout only. In the Nov 18 planning session the team decided to cut the wallet/ACH paths for now to hit the renewal timeline, and to revisit them afterward." },
    { keys: ['next', 'todo', 'action', 'do now', 'should'], text: "Next steps: unblock the payments dependency with the Platform team, confirm the card-only scope with the customer via CS, then finish and QA the checkout flow. Owner on the dependency is still unassigned." },
    { keys: ['who', 'own', 'assign', 'responsible'], text: "The ticket is assigned to the checkout squad, but the blocking payments dependency has no owner yet. The renewal context is owned by CS, and the scope decision came from the Nov 18 planning group." }
  ];
  var ORBIT_FALLBACK = { text: "Here's what the Space shows on that: the work is “Fix checkout flow,” currently blocked on a payments dependency, scoped to card checkout only, and flagged as a renewal risk by CS. Ask about what's blocking it, what changed, why the scope was set, or what's next." };
  function answerFor(qtext) {
    var s = (qtext || '').toLowerCase();
    for (var i = 0; i < ANSWERS.length; i++) {
      var a = ANSWERS[i];
      for (var k = 0; k < a.keys.length; k++) { if (s.indexOf(a.keys[k]) !== -1) return a; }
    }
    return ORBIT_FALLBACK;
  }

  // Suggested prompts (full-width cards). Labels must include blocking/changed/scope/next.
  var SUGGESTIONS = [
    { label: "What's blocking this?", q: 'What is blocking this right now?' },
    { label: 'What changed recently?', q: 'What changed recently?' },
    { label: 'Why this scope?', q: 'Why did we decide on this scope?' },
    { label: "What's next?", q: 'What are the next steps?' }
  ];

  // ── Lenses (product-faithful; the marketing scenario) ─────────────────────
  var LENS_CATS = [
    { id: 'decisions', label: 'Decisions', color: '#16A34A', count: 1 },
    { id: 'actions', label: 'Action Items', color: '#2563EB', count: 17 },
    { id: 'risks', label: 'Risks', color: '#B91C1C', count: 10 },
    { id: 'opps', label: 'Opportunities', color: '#8B5CF6', count: 9 }
  ];
  var LENS_TOTAL = 37;
  var LENS_ITEMS = [
    { cat: 'decisions', when: '10 days ago', signals: 1, decided: true, text: "Ronma's main focus is now continuous weekly new customer acquisition via LinkedIn outreach, supported by a simple reporting dashboard." },
    { cat: 'actions', when: '10 days ago', signals: 4, text: "Onyi to review the performance of the first ‘How We Use Quely’ campaign and identify who engaged, then fix the remaining SendGrid email issues based on team and Ronma's feedback." },
    { cat: 'actions', when: '10 days ago', signals: 2, decided: true, text: "Ronma to continue refining outreach based on prospect responses, objections, and described workflows to move qualified interest toward Quely pilots." },
    { cat: 'risks', when: '10 days ago', signals: 2, text: "If the HubSpot form and SendGrid issues are not resolved, campaign replies may keep going unanswered." },
    { cat: 'opps', when: '10 days ago', signals: 3, text: "Repurposing the ‘How We Use Quely’ series for YouTube could compound reach without new production effort." }
  ];

  // Project-management tools for the push modal (GitHub Issues is the only "Soon").
  var PM_TOOLS = [
    { id: 'jira', label: 'Jira', logo: '/assets/logos/jira.svg' },
    { id: 'linear', label: 'Linear', logo: '/assets/logos/linear.svg' },
    { id: 'todoist', label: 'Todoist', logo: '/assets/logos/todoist.svg' },
    { id: 'azuredevops', label: 'Azure DevOps', logo: '/assets/logos/azuredevops.svg' },
    { id: 'wrike', label: 'Wrike', logo: '/assets/logos/wrike.png' },
    { id: 'monday', label: 'monday.com', logo: '/assets/logos/monday.svg' },
    { id: 'trello', label: 'Trello', logo: '/assets/logos/trello.svg' },
    { id: 'github', label: 'GitHub Issues', logo: '/assets/logos/github.svg', soon: true }
  ];

  // ── DOM refs / state ──────────────────────────────────────────────────────
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var orbitScroll = $('#orbitScroll');
  var orbitEmpty = $('#orbitEmpty');
  var orbitInput = $('#orbitInput');

  var state = {
    spaceTouched: false, orbitTouched: false, lensFilter: 'all',
    lensPick: 'Jira', dismissed: {}, done: {}
  };
  var pendingThink = 0;

  // ── Orbit suggested prompts ───────────────────────────────────────────────
  function renderChips() {
    var wrap = $('#orbitChips');
    if (!wrap) return;
    wrap.innerHTML = '';
    SUGGESTIONS.forEach(function (s, i) {
      var b = document.createElement('button');
      b.className = 'q-sugg';
      b.style.cssText = 'position:relative; display:flex; align-items:center; gap:12px; width:100%; background:#fff; border:1px solid #E5E7EB; border-radius:11px; color:#1F2937; padding:15px 17px; font-size:15px; font-weight:500; line-height:1.35; text-align:left; font-family:inherit; cursor:pointer; box-shadow:0 1px 2px rgba(3,7,18,.04);';
      var lbl = document.createElement('span');
      lbl.style.cssText = 'flex:1;';
      lbl.textContent = s.label;
      b.appendChild(lbl);
      var arr = document.createElement('i');
      arr.className = 'ph ph-arrow-up-right';
      arr.style.cssText = 'color:#9CA3AF; font-size:16px;';
      b.appendChild(arr);
      if (i === 0 && !state.orbitTouched) {
        var ping = document.createElement('span');
        ping.className = 'orbit-ping';
        ping.style.cssText = 'position:absolute; top:-5px; right:-5px; width:14px; height:14px; pointer-events:none;';
        ping.innerHTML = '<span style="position:absolute; inset:0; border-radius:50%; background:#8B5CF6; opacity:.75; animation:qping 1.6s cubic-bezier(0,0,.2,1) infinite;"></span><span style="position:absolute; inset:4px; border-radius:50%; background:#8B5CF6;"></span>';
        b.appendChild(ping);
      }
      b.addEventListener('click', function () { runOrbit(s.q); });
      wrap.appendChild(b);
    });
  }

  function addUserBubble(text) {
    if (orbitEmpty) orbitEmpty.style.display = 'none';
    var row = document.createElement('div');
    row.style.cssText = 'display:flex; justify-content:flex-end;';
    var bub = document.createElement('div');
    bub.style.cssText = 'max-width:80%; background:#5C28A4; color:#fff; font-size:15px; line-height:1.45; padding:13px 16px; border-radius:14px; border-bottom-right-radius:4px;';
    bub.textContent = text;
    row.appendChild(bub);
    orbitScroll.appendChild(row);
  }
  function addOrbitBubble(ans) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex; justify-content:flex-start; gap:10px;';
    var pet = document.createElement('img');
    pet.src = '/assets/quely-orbit-pet.png';
    pet.style.cssText = 'width:30px; height:30px; flex:none;';
    row.appendChild(pet);
    var bub = document.createElement('div');
    bub.style.cssText = 'max-width:88%; background:#F9FAFB; border:1px solid #E5E7EB; color:#1A1611; font-size:15px; line-height:1.5; padding:14px 17px; border-radius:14px; border-bottom-left-radius:4px; animation:qanswer .45s cubic-bezier(.2,0,0,1);';
    bub.appendChild(document.createTextNode(ans.text));
    // v3: answers show NO Sources row.
    row.appendChild(bub);
    orbitScroll.appendChild(row);
  }
  function showThinking(on) {
    var existing = $('#orbitThinking');
    if (on) {
      if (existing) return;
      var t = document.createElement('div');
      t.id = 'orbitThinking';
      t.style.cssText = 'display:flex; align-items:center; gap:10px; align-self:flex-start;';
      t.innerHTML = '<img src="/assets/quely-orbit-pet.png" style="width:30px; height:30px;">' +
        '<span style="display:inline-flex; align-items:center; gap:8px; background:#F5F6F8; border-radius:9999px; padding:9px 14px; font-size:13px; color:#4B5563;">Analyzing work item context' +
        '<span style="display:inline-flex; gap:3px;"><span style="width:6px;height:6px;border-radius:50%;background:#8B5CF6;animation:qdot 1.2s infinite;"></span><span style="width:6px;height:6px;border-radius:50%;background:#8B5CF6;animation:qdot 1.2s infinite .3s;"></span></span></span>';
      orbitScroll.appendChild(t);
    } else if (existing) { existing.remove(); }
  }
  function runOrbit(qtext) {
    qtext = (qtext || '').trim();
    if (!qtext) return;
    if (!state.orbitTouched) { state.orbitTouched = true; document.querySelectorAll('.orbit-ping').forEach(function (n) { n.remove(); }); }
    recordEvent('orbit_demo', { q: qtext });
    addUserBubble(qtext);
    orbitInput.value = '';
    pendingThink++;
    showThinking(true);
    var ans = answerFor(qtext);
    setTimeout(function () {
      pendingThink = Math.max(0, pendingThink - 1);
      if (pendingThink === 0) showThinking(false);
      addOrbitBubble(ans);
      requestAnimationFrame(function () { orbitScroll.scrollTop = orbitScroll.scrollHeight; });
    }, 850);
    requestAnimationFrame(function () { orbitScroll.scrollTop = orbitScroll.scrollHeight; });
  }

  // ── Orbit Actions toggle ──────────────────────────────────────────────────
  function initActions() {
    var t = $('#orbitActionsToggle'), body = $('#orbitActionsBody'), caret = $('#orbitActionsCaret');
    if (!t) return;
    t.addEventListener('click', function () {
      var open = body.style.display !== 'none' && body.style.display !== '';
      // toggle: treat current hidden as closed
      var isOpen = body.style.display === 'block';
      body.style.display = isOpen ? 'none' : 'block';
      if (caret) caret.className = isOpen ? 'ph ph-caret-down' : 'ph ph-caret-up';
      if (caret) caret.style.marginLeft = 'auto';
    });
  }

  // ── Space tabs ────────────────────────────────────────────────────────────
  function initSpace() {
    var tabs = document.querySelectorAll('[data-space-tab]');
    tabs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-space-tab');
        recordEvent('space_tab', { tab: id });
        if (!state.spaceTouched) { state.spaceTouched = true; document.querySelectorAll('.space-ping').forEach(function (n) { n.remove(); }); }
        tabs.forEach(function (b) {
          var on = b === btn;
          b.style.borderBottom = '2px solid ' + (on ? '#5C28A4' : 'transparent');
          b.style.color = on ? '#5C28A4' : '#6B7280';
        });
        document.querySelectorAll('[data-space-body]').forEach(function (body) {
          body.style.display = body.getAttribute('data-space-body') === id ? '' : 'none';
        });
      });
    });
  }

  // ── Lenses (pills + grouped list + push/schedule modals) ──────────────────
  function renderLensPills() {
    var wrap = $('#lensPills');
    if (!wrap) return;
    wrap.innerHTML = '';
    var pills = [{ id: 'all', label: 'All', color: '#8F5BD7', count: LENS_TOTAL }].concat(LENS_CATS);
    pills.forEach(function (p) {
      var on = state.lensFilter === p.id;
      var b = document.createElement('button');
      b.style.cssText = 'display:inline-flex; align-items:center; gap:7px; border-radius:9999px; padding:6px 13px; font-size:12.5px; font-weight:600; cursor:pointer; font-family:inherit;'
        + (on ? ' background:#F3EEFB; border:1.5px solid #8F5BD7; color:#4B1F88;' : ' background:#fff; border:1px solid #E5E7EB; color:#4B5563;');
      if (p.id !== 'all') b.innerHTML = '<span style="width:6px; height:6px; border-radius:50%; background:' + p.color + ';"></span>';
      b.appendChild(document.createTextNode(p.label + ' '));
      var c = document.createElement('b'); c.style.opacity = '.7'; c.textContent = p.count; b.appendChild(c);
      b.addEventListener('click', function () { state.lensFilter = p.id; renderLensPills(); renderLensList(); recordEvent('lens_view', { lens: p.id }); });
      wrap.appendChild(b);
    });
  }

  function renderLensList() {
    var list = $('#lensList');
    if (!list) return;
    list.innerHTML = '';
    LENS_CATS.forEach(function (cat) {
      if (state.lensFilter !== 'all' && state.lensFilter !== cat.id) return;
      var items = LENS_ITEMS.filter(function (it) { return it.cat === cat.id; });
      // group header (always show the category so the four labels are present)
      var head = document.createElement('div');
      head.style.cssText = 'display:flex; align-items:center; gap:8px; padding:14px 0 8px; font-size:17px; font-weight:800; color:#1A1611;';
      head.innerHTML = '<span style="width:8px; height:8px; border-radius:50%; background:' + cat.color + ';"></span>' + cat.label + ' <span style="font-size:13px; font-weight:700; color:#6B7280;">' + cat.count + '</span>';
      list.appendChild(head);
      items.forEach(function (it, idx) {
        var key = cat.id + '-' + idx;
        var row = document.createElement('div');
        row.setAttribute('data-lens-row', '');
        row.style.cssText = 'position:relative; border-radius:10px; padding:11px 13px; margin:0 -13px 4px;';
        var dismissed = !!state.dismissed[key];
        var done = state.done[key];
        row.innerHTML =
          '<div style="font-size:14px; line-height:1.5; color:' + (dismissed ? '#9CA3AF' : '#1F2937') + '; ' + (dismissed ? 'text-decoration:line-through;' : '') + ' padding-right:120px;">' + escapeHtml(it.text) + '</div>' +
          '<div style="display:flex; align-items:center; gap:8px; margin-top:6px; font-size:11.5px; color:#6B7280;">' +
            '<i class="ph ph-flag"></i><span>· ' + it.when + '</span>' +
            (it.decided ? '<span style="display:inline-flex; align-items:center; gap:4px; background:#DCFCE7; color:#15803D; border-radius:9999px; padding:1px 8px; font-weight:700;"><i class="ph-fill ph-check-circle"></i>Decided</span>' : '') +
            (dismissed ? '<span style="color:#9CA3AF;">Dismissed · click trash to undo</span>' : '') +
            '<span style="margin-left:auto; display:inline-flex; align-items:center; gap:4px;"><i class="ph ph-broadcast"></i>' + it.signals + '</span>' +
          '</div>';
        // per-row action bar (revealed on hover via CSS)
        var bar = document.createElement('div');
        bar.setAttribute('data-lens-bar', '');
        bar.style.cssText = 'display:none; position:absolute; top:8px; right:10px; align-items:center; gap:2px; background:#fff; border:1px solid #E5E7EB; border-radius:9999px; box-shadow:0 4px 12px rgba(3,7,18,.14); padding:2px;';
        var pushBtn = actionBtn('ph ph-arrow-square-out', 'Push to tool');
        pushBtn.addEventListener('click', function (e) { e.stopPropagation(); openPushModal(key); });
        var meetBtn = actionBtn('ph ph-calendar-plus', 'Schedule a meeting');
        meetBtn.addEventListener('click', function (e) { e.stopPropagation(); openSchedModal(it.text); });
        var trashBtn = actionBtn('ph ph-trash', 'Dismiss');
        trashBtn.querySelector('i').style.color = '#B91C1C';
        trashBtn.addEventListener('click', function (e) { e.stopPropagation(); state.dismissed[key] = !state.dismissed[key]; renderLensList(); });
        bar.appendChild(pushBtn); bar.appendChild(divider()); bar.appendChild(meetBtn); bar.appendChild(divider()); bar.appendChild(trashBtn);
        row.appendChild(bar);
        // completed chips
        if (done) {
          var chip = document.createElement('div');
          chip.style.cssText = 'display:inline-flex; align-items:center; gap:6px; margin-top:8px; background:#F0FDF4; border:1px solid #BBF7D0; color:#15803D; border-radius:9999px; padding:3px 10px; font-size:11.5px; font-weight:700;';
          chip.innerHTML = (done === 'meeting')
            ? '<i class="ph-fill ph-calendar-check"></i>Meeting scheduled'
            : '<i class="ph-fill ph-check-circle"></i>Created in ' + done;
          row.appendChild(chip);
        }
        list.appendChild(row);
      });
    });
  }
  function actionBtn(icon, title) {
    var b = document.createElement('span');
    b.setAttribute('data-lens-btn', '');
    b.title = title;
    b.style.cssText = 'display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:9999px; cursor:pointer;';
    b.innerHTML = '<i class="' + icon + '" style="font-size:17px; color:#374151;"></i>';
    return b;
  }
  function divider() { var d = document.createElement('span'); d.style.cssText = 'width:1px; height:18px; background:#E5E7EB;'; return d; }
  function escapeHtml(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // Push modal
  function renderToolRail() {
    var rail = $('#lensToolRail');
    if (!rail) return;
    rail.innerHTML = '';
    PM_TOOLS.forEach(function (t) {
      var on = state.lensPick === t.label;
      var row = document.createElement('button');
      row.style.cssText = 'display:flex; align-items:center; gap:9px; width:100%; text-align:left; font-family:inherit; font-size:13px; font-weight:' + (on ? '700' : '500') + '; color:' + (t.soon ? '#9CA3AF' : (on ? '#5C28A4' : '#374151')) + '; border:none; border-radius:8px; padding:8px 9px; cursor:' + (t.soon ? 'default' : 'pointer') + '; background:' + (on ? '#F3EEFB' : 'transparent') + ';';
      row.innerHTML = '<span style="width:16px; height:16px; background:url(\'' + t.logo + '\') center/contain no-repeat;' + (t.soon ? ' filter:grayscale(1); opacity:.5;' : '') + '"></span>'
        + '<span style="flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + t.label + '</span>'
        + (t.soon ? '<span style="font-size:8.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#6B7280; background:#F3F4F6; border-radius:9999px; padding:2px 6px;">Soon</span>'
                  : (on ? '<i class="ph-fill ph-check-circle" style="color:#15803D;"></i>' : ''));
      if (!t.soon) row.addEventListener('click', function () { state.lensPick = t.label; renderToolRail(); updatePushCreateLabel(); });
      rail.appendChild(row);
    });
  }
  function updatePushCreateLabel() {
    var b = $('#lensPushCreate');
    if (b) b.innerHTML = '<i class="ph-bold ph-plus"></i>Create in ' + state.lensPick;
  }
  function openPushModal(key) {
    state._pushKey = key;
    renderToolRail(); updatePushCreateLabel();
    var m = $('#lensPushModal'); if (m) m.style.display = 'block';
  }
  function openSchedModal(title) {
    var t = $('#lensSchedTitle'); if (t) t.textContent = title || 'Lens item';
    var m = $('#lensSchedModal'); if (m) m.style.display = 'block';
  }
  function initLensModals() {
    document.querySelectorAll('.lensModalScrim, .lensModalClose').forEach(function (el) {
      el.addEventListener('click', function () {
        var m = $('#lensPushModal'); if (m) m.style.display = 'none';
        var s = $('#lensSchedModal'); if (s) s.style.display = 'none';
      });
    });
    var create = $('#lensPushCreate');
    if (create) create.addEventListener('click', function () {
      if (state._pushKey) { state.done[state._pushKey] = state.lensPick; recordEvent('lens_push', { key: state._pushKey, kind: state.lensPick }); }
      var m = $('#lensPushModal'); if (m) m.style.display = 'none';
      renderLensList();
    });
    var sched = $('#lensSchedConfirm');
    if (sched) sched.addEventListener('click', function () {
      var m = $('#lensSchedModal'); if (m) m.style.display = 'none';
      recordEvent('lens_push', { kind: 'meeting' });
    });
  }

  // ── Ask a question panel ──────────────────────────────────────────────────
  function initQuestion() {
    var panel = $('#qPanel');
    var form = $('#qForm');
    var done = $('#qDone');
    var qStarted = false;
    function open() {
      $('#qText').value = '';
      $('#qSection').value = current || 'hero';
      qStarted = false;
      form.style.display = '';
      done.style.display = 'none';
      panel.style.display = 'flex';
    }
    function close() { panel.style.display = 'none'; }
    $('#qText').addEventListener('input', function () {
      if (qStarted || !$('#qText').value) return;
      qStarted = true;
      recordEvent('question_start');
    });
    var fab = $('#askFab'); if (fab) fab.addEventListener('click', open);
    var ctaAsk = $('#ctaAsk'); if (ctaAsk) ctaAsk.addEventListener('click', open);
    document.querySelectorAll('.qClose').forEach(function (b) { b.addEventListener('click', close); });
    panel.addEventListener('click', function (e) { if (e.target === panel) close(); });
    $('#qSubmit').addEventListener('click', function () {
      var text = ($('#qText').value || '').trim();
      if (!text) return;
      var section = $('#qSection').value;
      if (tracking) post('/api/v/' + encodeURIComponent(token) + '/question', { text: text, section: section });
      form.style.display = 'none';
      done.style.display = '';
    });
  }

  // ── CTA ───────────────────────────────────────────────────────────────────
  function initCTA() {
    ['#ctaBook', '#ctaBook2'].forEach(function (sel) {
      var el = $(sel); if (el) el.addEventListener('click', function () { recordEvent('cta'); });
    });
  }

  // ── scroll craft: progress bar + dwell tracking ───────────────────────────
  var pendingMs = {};
  function initScroll() {
    var supportsView = (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('animation-timeline: view()'));
    if (!supportsView) {
      var show = function (el) { el.style.opacity = '1'; el.style.transform = 'none'; };
      document.querySelectorAll('[data-reveal]').forEach(show);
      document.querySelectorAll('[data-stagger]').forEach(function (g) { [].forEach.call(g.children, show); });
    }
    function tick() {
      var doc = document.documentElement;
      var max = (doc.scrollHeight - window.innerHeight) || 1;
      var frac = Math.min(1, Math.max(0, window.scrollY / max));
      var bar = document.querySelector('[data-progress]');
      if (bar) bar.style.width = (frac * 100).toFixed(1) + '%';
      var mid = window.innerHeight / 2;
      var els = document.querySelectorAll('[data-section]');
      var cur = null;
      els.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top <= mid && r.bottom >= mid) cur = el.getAttribute('data-section');
      });
      if (cur) current = cur;
    }
    function dwell() { if (document.visibilityState !== 'visible') return; if (tracking && current) pendingMs[current] = (pendingMs[current] || 0) + 1000; }
    function flush(useBeacon) {
      if (!tracking) return;
      Object.keys(pendingMs).forEach(function (sec) {
        var ms = pendingMs[sec];
        if (ms > 0) {
          var path = '/api/v/' + encodeURIComponent(token) + '/section-time';
          var body = { sectionId: sec, ms: ms };
          if (useBeacon) beacon(path, body); else post(path, body);
          pendingMs[sec] = 0;
        }
      });
    }
    setInterval(tick, 120);
    setInterval(dwell, 1000);
    setInterval(function () { flush(false); }, 4000);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(true); });
    window.addEventListener('pagehide', function () { flush(true); });
    tick();
  }

  // ── personalize (light touch for standard: company on hero eyebrow) ───────
  function personalize(data) {
    var eyebrow = $('#heroEyebrow');
    if (eyebrow && data && data.found && data.company) {
      eyebrow.textContent = "Built for " + data.company + "'s product & engineering teams";
    }
    var askingAs = $('#askingAs');
    if (askingAs && data && data.found && data.name) {
      askingAs.textContent = 'Asking as ' + data.name + (data.company ? (' · ' + data.company) : '');
    }
  }

  // ── Advanced/custom page (v3) ─────────────────────────────────────────────
  // A custom page IS the blocks: hide every standard section and render the plan's
  // blocks in blockKeys order, each painted by its surface, then the footer.
  function applyPlan(plan) {
    if (!plan || !plan.blocks || !plan.blocks.length) return;
    var mount = (window.QuelyBlocks && window.QuelyBlocks.mountBlock) || null;
    if (!mount) return;
    ['#hero', '#problem', '#proof', '#spaces', '#orbit', '#features', '#cta', '#footer'].forEach(function (sel) {
      var el = $(sel); if (el) el.style.display = 'none';
    });
    var host = document.createElement('div');
    host.id = 'advancedPage';
    host.style.cssText = 'display:flex; flex-direction:column;';
    plan.blocks.forEach(function (b) {
      var sec = document.createElement('section');
      sec.setAttribute('data-block', b.slug);
      sec.setAttribute('data-section', b.key);
      sec.style.cssText = 'display:block;';
      sec.appendChild(mount(b.slug, b.props));
      host.appendChild(sec);
    });
    host.appendChild(buildFooter());
    var wrap = ($('#hero') && $('#hero').parentNode) || document.body;
    wrap.appendChild(host);
  }
  function buildFooter() {
    var f = document.createElement('footer');
    f.style.cssText = 'background:#1A1611; color:#ECE7F2; padding:64px 40px 40px; display:flex; flex-direction:column; align-items:center; text-align:center; gap:14px; font-family:\'Inter\',sans-serif;';
    f.innerHTML =
      '<img src="/assets/quely-logo-dark.svg" alt="Quely" style="height:32px;">' +
      '<div style="font-size:18px; font-weight:600; color:#ECE7F2; max-width:520px; line-height:1.4;">Your tools track the work. Quely connects the understanding.</div>' +
      '<div style="font-size:15px; color:rgba(236,231,242,.72); max-width:560px; line-height:1.5;">Keep the full context of every task in one place.</div>' +
      '<div style="margin-top:10px; display:flex; align-items:center; gap:18px; font-size:14px;">' +
        '<a href="https://quely.io" target="_blank" rel="noopener" style="color:#9385E6; text-decoration:none;">quely.io</a>' +
        '<a href="mailto:ronma@quely.io" style="color:#9385E6; text-decoration:none;">ronma@quely.io</a>' +
      '</div>' +
      '<div style="margin-top:18px; font-size:12px; letter-spacing:.14em; color:rgba(236,231,242,.4);">© QUELY 2026</div>';
    return f;
  }

  // ── boot ──────────────────────────────────────────────────────────────────
  function boot() {
    renderChips();
    renderLensPills();
    renderLensList();
    initSpace();
    initActions();
    initLensModals();
    initQuestion();
    initCTA();
    initScroll();
    if (orbitInput) {
      orbitInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); runOrbit(orbitInput.value); } });
    }
    var send = $('#orbitSend'); if (send) send.addEventListener('click', function () { runOrbit(orbitInput.value); });

    if (!token) {
      personalize({ found: false });
      armDefaultCheck();
      return;
    }
    fetch('/api/v/' + encodeURIComponent(token))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        prospect = data;
        tracking = !!(data && data.found);
        personalize(data);
        if (data && data.advanced && data.pagePlan && data.pagePlan.blocks) {
          applyPlan(data.pagePlan);
        } else {
          armDefaultCheck(); // standard page → run the regression tripwire
        }
        if (tracking) post('/api/v/' + encodeURIComponent(token) + '/visit');
      })
      .catch(function () { personalize({ found: false }); armDefaultCheck(); });
  }

  function armDefaultCheck() {
    if (typeof window.runDefaultPageCheck === 'function') { try { window.runDefaultPageCheck(); } catch (e) {} }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
