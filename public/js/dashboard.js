/* Quely Sales Dashboard — client behaviour (v3 design).
 * Derived logic runs on prospect objects from the real API (polled every 1.5s).
 * Storage/notifications/email/analytics live server-side.
 */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  var SECCOLORS = { hero: '#9CA3AF', problem: '#9385E6', proof: '#6366F1', spaces: '#5C28A4', orbit: '#2A6FDB', features: '#16A34A', cta: '#D97706' };
  var PM_TOOL_LABELS = { jira: 'Jira', linear: 'Linear', monday: 'monday.com', wrike: 'Wrike', todoist: 'Todoist', trello: 'Trello', azuredevops: 'Azure DevOps', github: 'GitHub Issues', Jira: 'Jira' };
  function pushTargetLabel(kind) { if (kind === 'meeting') return 'Scheduled a meeting'; return 'Pushed to ' + (PM_TOOL_LABELS[kind] || kind || 'a tool'); }

  var state = {
    view: 'prospects', selToken: null, notifOpen: false, createdToken: null,
    sections: [], prospects: [], notifications: [],
    topics: [], blockLibrary: [], personalized: false,
    builder: null, libFilter: 'all', libSel: null
  };

  // ── format helpers ─────────────────────────────────────────────────────────
  function fmt(ms) {
    if (!ms || ms < 1000) return '0s';
    var s = Math.round(ms / 1000);
    if (s < 60) return s + 's';
    var m = Math.floor(s / 60), r = s % 60;
    return m + 'm ' + (r < 10 ? '0' + r : r) + 's';
  }
  function when(ts) {
    if (!ts) return '';
    var d = new Date(ts), now = new Date();
    var sameDay = d.toDateString() === now.toDateString();
    var t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return sameDay ? ('Today ' + t) : (d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + t);
  }
  function secLabel(id) { var s = state.sections.find(function (x) { return x.id === id; }); return s ? s.label : id; }
  function fileLink(token) { return '/v/' + encodeURIComponent(token); }
  function absLink(token) { return location.origin + '/v/' + encodeURIComponent(token); }
  function prettyLink(token) { return 'quely.io/share/' + token; }
  function initials(name) { var p = String(name || '').trim().split(/\s+/); return ((p[0] || ' ')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
  function totalMs(p) { var s = 0; for (var k in p.sectionMs) s += p.sectionMs[k]; return s; }
  function mostViewedSection(p) {
    var best = null, bestMs = -1;
    state.sections.forEach(function (sec) { var ms = p.sectionMs[sec.id] || 0; if (ms > bestMs) { bestMs = ms; best = sec; } });
    return bestMs > 0 ? best : null;
  }
  function statusStyle(viewed) {
    return 'display:inline-flex; align-items:center; font-size:12px; font-weight:600; padding:4px 11px; border-radius:9999px; ' +
      (viewed ? 'background:#DCFCE7; color:#12652F;' : 'background:#F3F4F6; color:#5C5345;');
  }
  // shared primitives
  var CARD = 'background:#fff; border:2px solid #1A1611; border-radius:0; box-shadow:5px 5px 0 #1A1611;';

  // ── data ────────────────────────────────────────────────────────────────
  function refresh() {
    return Promise.all([
      fetch('/api/prospects').then(handleAuth).then(function (r) { return r.json(); }),
      fetch('/api/notifications').then(handleAuth).then(function (r) { return r.json(); })
    ]).then(function (res) {
      var pdata = res[0], ndata = res[1];
      if (pdata) { state.sections = pdata.sections || []; state.prospects = pdata.prospects || []; }
      if (ndata) state.notifications = ndata.notifications || [];
      render();
    }).catch(function () {});
  }
  function handleAuth(r) { if (r.status === 401) { location.href = '/login'; throw new Error('auth'); } return r; }

  // ── render ────────────────────────────────────────────────────────────────
  function render() {
    document.querySelectorAll('.navbtn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-nav') === state.view);
    });
    var titles = { prospects: 'Prospects', analytics: 'Analytics', library: 'Block library', questions: 'Questions' };
    $('#viewTitle').textContent = titles[state.view] || 'Prospects';
    document.querySelectorAll('[data-view]').forEach(function (v) {
      v.style.display = v.getAttribute('data-view') === state.view ? '' : 'none';
    });
    var qCount = state.prospects.reduce(function (a, p) { return a + (p.questions ? p.questions.length : 0); }, 0);
    var badge = $('#qBadge');
    badge.textContent = qCount;
    badge.style.cssText = 'margin-left:auto; font-size:12px; font-weight:700; min-width:20px; height:20px; padding:0 6px; border-radius:9999px; display:inline-flex; align-items:center; justify-content:center; ' +
      (qCount ? 'background:#9385E6; color:#fff;' : 'background:rgba(255,255,255,.12); color:rgba(255,255,255,.5);');
    renderNotifications();
    if (state.view === 'prospects') { renderProspectList(); if (state.selToken) renderDetail(); }
    else if (state.view === 'analytics') renderAnalytics();
    else if (state.view === 'library') renderLibrary();
    else if (state.view === 'questions') renderQuestions();
  }

  function renderProspectList() {
    var wrap = $('#prospectList');
    if (!state.prospects.length) {
      wrap.innerHTML = '<div style="padding:40px; text-align:center; font-size:14px; color:#4B5563;">No prospects yet. Generate your first link above.</div>';
      return;
    }
    var col = 'grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,.7fr) minmax(0,.8fr) minmax(0,1.3fr) 24px;';
    wrap.innerHTML = state.prospects.map(function (p) {
      var viewed = !!p.firstOpened, mv = mostViewedSection(p);
      var rowStyle = 'display:grid; ' + col + ' gap:12px; align-items:center; padding:14px 20px; border-bottom:1px solid #F6F7F9; cursor:pointer; background:#fff;';
      return '<div class="prow" data-token="' + esc(p.token) + '" style="' + rowStyle + '">' +
        '<div style="min-width:0;"><div style="font-size:15px; font-weight:600; color:#111827; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + esc(p.name || '(no name)') + '</div><div style="font-size:13px; color:#4B5563; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + esc(p.company || '—') + '</div></div>' +
        '<div><span style="' + statusStyle(viewed) + '">' + (viewed ? 'Viewed' : 'Not opened') + '</span></div>' +
        '<div style="font-size:14px; color:#374151;">' + p.visits.length + '</div>' +
        '<div style="font-size:14px; color:#374151;">' + fmt(totalMs(p)) + '</div>' +
        '<div style="font-size:14px; color:#374151; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + esc(mv ? mv.label : '—') + '</div>' +
        '<div style="display:flex; align-items:center; gap:8px;">' +
          (p.questions.length ? '<i class="ph-fill ph-chat-teardrop-text" title="Asked a question" style="color:#8F5BD7; font-size:18px;"></i>' : '') +
          '<a class="openlink" href="' + fileLink(p.token) + '" target="_blank" rel="noopener" title="Open link" style="color:#4B5563; text-decoration:none;"><i class="ph ph-arrow-square-out" style="font-size:18px;"></i></a>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  // detail as a centered modal
  function renderDetail() {
    var selP = state.selToken ? state.prospects.find(function (p) { return p.token === state.selToken; }) : null;
    if (!selP) { $('#detailModal').style.display = 'none'; return; }
    var total = totalMs(selP) || 0, maxMs = 0;
    state.sections.forEach(function (s) { maxMs = Math.max(maxMs, selP.sectionMs[s.id] || 0); });
    var bars = state.sections.map(function (s) {
      var ms = selP.sectionMs[s.id] || 0;
      var pct = maxMs ? Math.max(ms > 0 ? 4 : 0, Math.round(ms / maxMs * 100)) : 0;
      return '<div style="display:flex; align-items:center; gap:10px;">' +
        '<div style="flex:none; width:92px; font-size:13px; color:#374151;">' + esc(s.label) + '</div>' +
        '<div style="flex:1; height:10px; background:#F3F4F6; border-radius:9999px; overflow:hidden;"><div style="height:100%; border-radius:9999px; background:' + (SECCOLORS[s.id] || '#9385E6') + '; width:' + pct + '%;"></div></div>' +
        '<div style="flex:none; width:54px; text-align:right; font-size:13px; color:#4B5563;">' + fmt(ms) + '</div></div>';
    }).join('');

    var evs = selP.events || [];
    var orbitQs = evs.filter(function (e) { return e.type === 'orbit_demo'; });
    var lensViews = evs.filter(function (e) { return e.type === 'lens_view'; });
    var lensPushes = evs.filter(function (e) { return e.type === 'lens_push'; });
    var tabEvs = evs.filter(function (e) { return e.type === 'space_tab'; });
    var uniq = function (arr) { return arr.filter(function (v, i) { return v && arr.indexOf(v) === i; }); };
    var cap = function (s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
    var tabNames = { disc: 'Discussion', docs: 'Docs & assets', dec: 'Decisions', act: 'Activity' };
    var interactions = [];
    if (orbitQs.length) interactions.push({ label: 'Asked Orbit · ' + orbitQs.length, icon: 'ph-fill ph-sparkle', detail: uniq(orbitQs.map(function (e) { return e.meta && e.meta.q; })).join('\n') });
    if (tabEvs.length) interactions.push({ label: 'Explored the Space', icon: 'ph-fill ph-kanban', detail: 'Tabs: ' + uniq(tabEvs.map(function (e) { return tabNames[e.meta && e.meta.tab] || (e.meta && e.meta.tab); })).join(', ') });
    if (lensViews.length) interactions.push({ label: 'Lenses: ' + uniq(lensViews.map(function (e) { return cap(e.meta && e.meta.lens); })).join(', '), icon: 'ph-fill ph-graph', detail: 'Opened ' + lensViews.length + ' lens view(s)' });
    if (lensPushes.length) interactions.push({ label: 'Pushed to tools · ' + lensPushes.length, icon: 'ph-fill ph-arrow-square-out', detail: lensPushes.map(function (e) { return pushTargetLabel(e.meta && e.meta.kind); }).join('\n') });

    var mv = mostViewedSection(selP), q0 = selP.questions[0], follow;
    if (!selP.firstOpened) follow = "Hasn't opened the link yet. Send a short nudge with the link again.";
    else if (q0) follow = 'Answer their question on ' + secLabel(q0.section) + ' first, then offer a live walkthrough.';
    else if (selP.ctaClicked) follow = 'Reached the CTA. Confirm the meeting and tailor it to ' + (mv ? mv.label : 'their focus') + '.';
    else if (mv) follow = 'Spent the most time on ' + mv.label + '. Lead your follow-up with that, offer to go deeper.';
    else follow = 'Opened but skimmed. Re-share with a one-line hook on the problem.';

    var sub = [selP.role, selP.company].filter(Boolean).join(' · ') || selP.email || '—';
    var viewed = !!selP.firstOpened;
    var tile = function (v, l) { return '<div style="flex:1; background:#F8F5FB; border:1px solid #D8D2E4; padding:12px 14px;"><div style="font-size:22px; font-weight:800;">' + esc(v) + '</div><div style="font-size:12px; color:#4B5563;">' + esc(l) + '</div></div>'; };
    var eyebrow = 'font-family:\'Geist Mono\',monospace; font-size:12px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:#5C5345; margin:20px 0 12px;';

    var html = '<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px; padding-right:26px;">' +
        '<div style="min-width:0;"><div style="font-size:18px; font-weight:700;">' + esc(selP.name || '(no name)') + '</div><div style="font-size:14px; color:#4B5563;">' + esc(sub) + '</div></div>' +
        '<span style="' + statusStyle(viewed) + '">' + (viewed ? 'Viewed' : 'Not opened') + '</span>' +
      '</div>' +
      '<div style="display:flex; gap:10px; margin:18px 0;">' + tile(selP.visits.length, 'Visits') + tile(fmt(total), 'Total time') + tile(selP.ctaClicked ? 'Yes' : 'No', 'Booked') + '</div>' +
      '<div style="' + eyebrow + '">Attention by section</div>' +
      '<div style="display:flex; flex-direction:column; gap:9px;">' + bars + '</div>';

    if (interactions.length) {
      html += '<div style="' + eyebrow + '">Interacted with</div><div style="display:flex; flex-wrap:wrap; gap:8px;">' +
        interactions.map(function (ix) { return '<span title="' + esc(ix.detail) + '" style="display:inline-flex; align-items:center; gap:7px; background:#F5EEFB; border:1px solid #C9C1F2; border-radius:9999px; padding:6px 12px; font-size:13px; font-weight:600; color:#5C28A4;"><i class="' + ix.icon + '" style="font-size:15px;"></i>' + esc(ix.label) + '</span>'; }).join('') + '</div>';
    }
    if (selP.questions.length) {
      html += '<div style="' + eyebrow + '">Questions</div><div style="display:flex; flex-direction:column; gap:10px;">' +
        selP.questions.map(function (q) { return '<div style="background:#F5EEFB; border-radius:10px; padding:12px 14px;"><div style="font-size:14px; line-height:1.4; color:#1A1611;">"' + esc(q.text) + '"</div><div style="font-size:12px; color:#5C28A4; margin-top:5px;">on ' + esc(secLabel(q.section)) + ' · ' + esc(when(q.ts)) + '</div></div>'; }).join('') + '</div>';
    }
    html += '<div style="margin-top:20px; background:#1A1611; border-radius:12px; padding:16px;">' +
        '<div style="display:flex; align-items:center; gap:8px; font-family:\'Geist Mono\',monospace; font-size:12px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:#C9C1F2; margin-bottom:8px;"><i class="ph-fill ph-sparkle"></i>Suggested follow-up</div>' +
        '<div style="font-size:14px; line-height:1.5; color:#fff;">' + esc(follow) + '</div></div>' +
      '<div style="margin-top:16px; display:flex; gap:10px;">' +
        '<a href="' + fileLink(selP.token) + '" target="_blank" rel="noopener" style="flex:1; text-decoration:none;"><span style="display:flex; align-items:center; justify-content:center; gap:8px; background:#fff; border:1px solid #D1D5DB; border-radius:9px; padding:10px; font-size:14px; font-weight:600; color:#1A1611;"><i class="ph ph-arrow-square-out"></i>Open link</span></a>' +
        '<button id="detailDelete" style="flex:none; background:#fff; border:2px solid #1A1611; border-radius:0; box-shadow:3px 3px 0 #1A1611; padding:10px 14px; font-size:14px; font-weight:600; color:#B91C1C; cursor:pointer;"><i class="ph ph-trash"></i></button>' +
      '</div>';
    $('#detailBody').innerHTML = html;
    $('#detailModal').style.display = 'flex';
    var del = $('#detailDelete');
    if (del) del.addEventListener('click', function () {
      fetch('/api/prospects/' + encodeURIComponent(selP.token), { method: 'DELETE' })
        .then(function () { state.selToken = null; $('#detailModal').style.display = 'none'; refresh(); });
    });
  }

  function renderAnalytics() {
    var list = state.prospects, sections = state.sections;
    var viewed = list.filter(function (p) { return !!p.firstOpened; });
    var secTotals = {}; sections.forEach(function (s) { secTotals[s.id] = 0; });
    list.forEach(function (p) { sections.forEach(function (s) { secTotals[s.id] += (p.sectionMs[s.id] || 0); }); });
    var maxSec = Math.max.apply(null, [1].concat(sections.map(function (s) { return secTotals[s.id]; })));
    var qCounts = {};
    list.forEach(function (p) { p.questions.forEach(function (q) { qCounts[q.section] = (qCounts[q.section] || 0) + 1; }); });
    var questionSections = Object.keys(qCounts).map(function (k) { return { label: secLabel(k), count: qCounts[k] }; }).sort(function (a, b) { return b.count - a.count; });
    var totalCta = list.filter(function (p) { return p.ctaClicked; }).length;
    var avgMs = viewed.length ? viewed.reduce(function (a, p) { return a + totalMs(p); }, 0) / viewed.length : 0;
    var dropLine;
    if (!viewed.length) dropLine = 'No views yet.';
    else { var reached = sections.filter(function (s) { return secTotals[s.id] > 0; }); var lastReached = reached.length ? reached[reached.length - 1] : null; dropLine = lastReached ? ('Most journeys reach “' + lastReached.label + '”. Sections after it get little attention — consider moving key points earlier.') : 'Prospects open but barely scroll.'; }
    var openRate = list.length ? Math.round(viewed.length / list.length * 100) + '%' : '0%';
    var ctaRate = viewed.length ? Math.round(totalCta / viewed.length * 100) + '%' : '0%';
    var statCards = [{ v: list.length, l: 'Prospects' }, { v: openRate, l: 'Open rate' }, { v: fmt(avgMs), l: 'Avg time / prospect' }, { v: ctaRate, l: 'Demo booked' }].map(function (c) {
      return '<div style="' + CARD + ' padding:18px 20px;"><div class="geist" style="font-size:28px; font-weight:800;">' + esc(c.v) + '</div><div style="font-size:13px; color:#5C5345;">' + esc(c.l) + '</div></div>';
    }).join('');
    var secBars = sections.map(function (s) {
      var pct = Math.round(secTotals[s.id] / maxSec * 100);
      return '<div style="display:flex; align-items:center; gap:12px;">' +
        '<div style="flex:none; width:104px; font-size:14px; color:#374151;">' + esc(s.label) + '</div>' +
        '<div style="flex:1; height:14px; background:#F3F4F6; border-radius:9999px; overflow:hidden;"><div style="height:100%; border-radius:9999px; background:' + (SECCOLORS[s.id] || '#9385E6') + '; width:' + pct + '%;"></div></div>' +
        '<div style="flex:none; width:60px; text-align:right; font-size:13px; color:#5C5345;">' + fmt(secTotals[s.id]) + '</div></div>';
    }).join('');
    var qList = questionSections.length ? questionSections.map(function (q) {
      return '<div style="display:flex; align-items:center; justify-content:space-between; padding:9px 0; border-bottom:1px solid #F6F7F9;"><span style="font-size:14px; color:#374151;">' + esc(q.label) + '</span><span style="font-size:14px; font-weight:700; color:#5C28A4;">' + q.count + '</span></div>';
    }).join('') : '<div style="padding:14px 0; font-size:13px; color:#5C5345;">No questions yet.</div>';
    $('#analyticsRoot').innerHTML =
      '<div style="display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:20px;">' + statCards + '</div>' +
      '<div style="display:grid; grid-template-columns:1.3fr 1fr; gap:16px;">' +
        '<div style="' + CARD + ' padding:22px 24px;"><div style="font-size:16px; font-weight:700; margin-bottom:16px;">Attention by section <span style="font-size:13px; font-weight:400; color:#5C5345;">· across all prospects</span></div><div style="display:flex; flex-direction:column; gap:12px;">' + secBars + '</div></div>' +
        '<div style="display:flex; flex-direction:column; gap:16px;">' +
          '<div style="' + CARD + ' padding:22px 24px;"><div style="font-size:16px; font-weight:700; margin-bottom:12px;">Most asked about</div>' + qList + '</div>' +
          '<div style="' + CARD + ' padding:22px 24px;"><div style="font-size:16px; font-weight:700; margin-bottom:10px;">Drop-off</div><div style="font-size:14px; line-height:1.5; color:#5C5345;">' + esc(dropLine) + '</div></div>' +
        '</div>' +
      '</div>';
  }

  function renderQuestions() {
    var questions = [];
    state.prospects.forEach(function (p) { p.questions.forEach(function (q) { questions.push({ name: p.name || '(no name)', company: p.company || '—', initials: initials(p.name), text: q.text, sectionLabel: secLabel(q.section), timeLabel: when(q.ts), fileLink: fileLink(p.token), ts: q.ts }); }); });
    questions.sort(function (a, b) { return b.ts - a.ts; });
    var root = $('#questionsRoot');
    if (!questions.length) { root.innerHTML = '<div style="background:#F8F5FB; border:2px dashed #1A1611; border-radius:0; padding:48px; text-align:center; color:#5C5345; font-size:14px;">No questions yet. They\'ll appear here the moment a prospect asks one.</div>'; return; }
    root.innerHTML = questions.map(function (q) {
      return '<div style="' + CARD + ' padding:18px 22px;">' +
        '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">' +
          '<div style="display:flex; align-items:center; gap:10px;"><span style="width:34px; height:34px; border-radius:50%; background:#F5EEFB; color:#5C28A4; font-size:14px; font-weight:700; display:flex; align-items:center; justify-content:center;">' + esc(q.initials) + '</span><div><div style="font-size:15px; font-weight:600;">' + esc(q.name) + '</div><div style="font-size:12px; color:#5C5345;">' + esc(q.company) + '</div></div></div>' +
          '<div style="font-size:12px; color:#5C5345;">' + esc(q.timeLabel) + '</div>' +
        '</div>' +
        '<div style="font-size:16px; line-height:1.45; color:#1A1611;">"' + esc(q.text) + '"</div>' +
        '<div style="margin-top:10px; display:flex; align-items:center; gap:10px;"><span style="font-size:12px; font-weight:600; color:#5C28A4; background:#F5EEFB; padding:4px 11px; border-radius:9999px;">' + esc(q.sectionLabel) + '</span><a href="' + q.fileLink + '" target="_blank" rel="noopener" style="font-size:12px; color:#5C5345;">Open their link →</a></div>' +
      '</div>';
    }).join('');
  }

  function renderNotifications() {
    $('#notifPanel').style.display = state.notifOpen ? 'block' : 'none';
    var badge = $('#notifBadge');
    if (state.notifications.length) { badge.style.display = 'flex'; badge.textContent = state.notifications.length; } else { badge.style.display = 'none'; }
    var listEl = $('#notifList');
    if (!state.notifications.length) { listEl.innerHTML = '<div style="padding:26px 18px; text-align:center; font-size:13px; color:#5C5345;">No activity yet.</div>'; return; }
    listEl.innerHTML = state.notifications.map(function (n) {
      var isQ = n.type === 'question';
      var icon = isQ ? 'ph-fill ph-chat-teardrop-text' : 'ph-fill ph-eye';
      var color = isQ ? '#9385E6' : '#16A34A';
      var text = isQ ? ((n.name || 'A prospect') + ' asked a question on ' + secLabel(n.section)) : ((n.name || 'A prospect') + (n.company ? (' · ' + n.company) : '') + ' opened your link');
      return '<div style="display:flex; gap:12px; padding:14px 18px; border-bottom:1px solid #F6F7F9;">' +
        '<i class="' + icon + '" style="font-size:20px; flex:none; margin-top:2px; color:' + color + ';"></i>' +
        '<div style="min-width:0;"><div style="font-size:14px; line-height:1.4; color:#1A1611;">' + esc(text) + '</div><div style="font-size:12px; color:#5C5345; margin-top:2px;">' + esc(when(n.ts)) + '</div></div>' +
      '</div>';
    }).join('');
  }

  // ── Library view (browse blocks + edit copy, saved locally) ────────────────
  var LIB_FILTERS = [
    { id: 'all', label: 'All' }, { id: 'hero', label: 'Hero' },
    { id: 'problem', label: 'Problem' }, { id: 'solve', label: 'How Quely solves it' }, { id: 'cta', label: 'Pre-footer' }
  ];
  var ROLE_TAG = { hero: { c: '#5C28A4', b: '#F3EEFB', t: 'Hero' }, problem: { c: '#B45309', b: '#FEF3C7', t: 'Problem' }, solve: { c: '#15803D', b: '#DCFCE7', t: 'How Quely solves it' }, cta: { c: '#1D4ED8', b: '#DBEAFE', t: 'Pre-footer' } };
  function libCat(b) { if (b.role === 'hero') return 'hero'; if (b.role === 'cta') return 'cta'; if (b.key === 'beforeafter') return 'problem'; return 'solve'; }
  function libCopyStore() { try { return JSON.parse(localStorage.getItem('quely_lib_copy') || '{}'); } catch (e) { return {}; } }
  function libCopySave(map) { try { localStorage.setItem('quely_lib_copy', JSON.stringify(map)); } catch (e) {} }

  function renderLibrary() {
    var root = $('#libraryRoot');
    var lib = state.blockLibrary || [];
    var pills = LIB_FILTERS.map(function (f) {
      var on = state.libFilter === f.id;
      return '<button class="libpill" data-f="' + f.id + '" style="border-radius:9999px; padding:6px 12px; font-size:12.5px; font-weight:600; cursor:pointer; font-family:inherit; ' + (on ? 'background:#111827; color:#fff; border:1px solid #111827;' : 'background:#fff; color:#374151; border:1px solid #E5E7EB;') + '">' + esc(f.label) + '</button>';
    }).join('');
    var shown = lib.filter(function (b) { return state.libFilter === 'all' || libCat(b) === state.libFilter; });
    var copy = libCopyStore();
    var cards = shown.map(function (b) {
      var cat = libCat(b), tag = ROLE_TAG[cat] || ROLE_TAG.solve;
      var edited = !!copy[b.key];
      var sel = state.libSel === b.key;
      return '<div class="libcard" data-k="' + esc(b.key) + '" style="background:#fff; border:2px solid ' + (sel ? '#5C28A4' : '#1A1611') + '; border-radius:0; box-shadow:5px 5px 0 ' + (sel ? '#5C28A4' : '#1A1611') + '; overflow:hidden; cursor:pointer;">' +
        '<div style="display:flex; align-items:center; gap:8px; padding:12px 14px;">' +
          '<span class="mono" style="font-size:10.5px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; border-radius:9999px; padding:3px 9px; color:' + tag.c + '; background:' + tag.b + ';">' + esc(tag.t) + '</span>' +
          '<span style="font-size:14px; font-weight:600; color:#111827; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + esc(b.label) + '</span>' +
          (edited ? '<span style="margin-left:auto; font-size:11px; color:#5C28A4; background:#F3EEFB; border-radius:9999px; padding:3px 8px;">Edited</span>' : '') +
        '</div>' +
        '<div style="position:relative; height:300px; overflow:hidden; background:#F9FAFB; border-top:1px solid #F3F4F6;"><iframe src="/blocks/' + esc(b.slug) + '.html" scrolling="no" style="width:200%; height:600px; border:0; transform:scale(.5); transform-origin:top left; pointer-events:none;"></iframe></div>' +
      '</div>';
    }).join('');
    var editPanel;
    var sel = state.libSel ? lib.find(function (b) { return b.key === state.libSel; }) : null;
    if (sel) {
      var cur = copy[sel.key] || {};
      var f = function (name, val, ph, area) {
        var input = area ? ('<textarea id="lib_' + name + '" rows="' + (name === 'body' ? 5 : 3) + '" style="width:100%; font-size:14px; color:#1A1611; padding:10px 12px; border:1px solid #D8D2E4; border-radius:8px; background:#fff; resize:vertical;">' + esc(val) + '</textarea>')
          : ('<input id="lib_' + name + '" value="' + esc(val) + '" style="width:100%; font-size:14px; color:#1A1611; padding:10px 12px; border:1px solid #D8D2E4; border-radius:8px; background:#fff;">');
        return '<div style="margin-bottom:12px;"><label style="display:block; font-size:12px; font-weight:600; color:#5C5345; margin-bottom:6px;">' + name.charAt(0).toUpperCase() + name.slice(1) + '</label>' + input + '</div>';
      };
      editPanel = '<div style="' + CARD + ' padding:18px 20px;">' +
        '<div style="font-size:15px; font-weight:700; margin-bottom:14px;">' + esc(sel.label) + '</div>' +
        f('eyebrow', cur.eyebrow != null ? cur.eyebrow : (sel.fields.eyebrow || ''), '', false) +
        f('headline', cur.headline != null ? cur.headline : (sel.fields.headline || ''), '', true) +
        f('body', cur.body != null ? cur.body : (sel.fields.body || ''), '', true) +
        '<div style="display:flex; gap:10px; margin-top:6px;">' +
          '<button id="libSave" style="flex:1; background:#5C28A4; color:#fff; border:2px solid #1A1611; border-radius:0; box-shadow:3px 3px 0 #1A1611; padding:10px; font-size:13.5px; font-weight:700; cursor:pointer;">Save</button>' +
          '<button id="libReset" style="background:#fff; color:#1A1611; border:2px solid #1A1611; border-radius:0; box-shadow:3px 3px 0 #1A1611; padding:10px 14px; font-size:13.5px; font-weight:600; cursor:pointer;">Reset</button>' +
        '</div>' +
        '<div id="libSaved" style="display:none; align-items:center; gap:6px; color:#15803D; font-size:12.5px; font-weight:600; margin-top:10px;"><i class="ph-fill ph-check-circle"></i>Saved</div>' +
      '</div>';
    } else {
      editPanel = '<div style="background:#F8F5FB; border:2px dashed #1A1611; border-radius:0; padding:40px 24px; text-align:center;"><i class="ph ph-cursor-click" style="font-size:26px; color:#8F5BD7;"></i><div style="margin-top:10px; font-size:14px; font-weight:600; color:#374151;">Select a block to edit</div><div style="margin-top:4px; font-size:13px; color:#5C5345;">Edit its default copy. Changes save on this device.</div></div>';
    }
    root.innerHTML =
      '<div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:18px;">' + pills + '</div>' +
      '<div style="display:flex; gap:20px; align-items:flex-start;">' +
        '<div style="flex:1 1 520px; display:grid; grid-template-columns:repeat(2,1fr); gap:16px;">' + cards + '</div>' +
        '<div style="flex:1 1 300px; max-width:360px; position:sticky; top:0;">' + editPanel + '</div>' +
      '</div>';
    document.querySelectorAll('.libpill').forEach(function (b) { b.addEventListener('click', function () { state.libFilter = b.getAttribute('data-f'); renderLibrary(); }); });
    document.querySelectorAll('.libcard').forEach(function (c) { c.addEventListener('click', function () { state.libSel = c.getAttribute('data-k'); renderLibrary(); }); });
    var save = $('#libSave');
    if (save) save.addEventListener('click', function () {
      var map = libCopyStore();
      map[state.libSel] = { eyebrow: $('#lib_eyebrow').value, headline: $('#lib_headline').value, body: $('#lib_body').value };
      libCopySave(map);
      var s = $('#libSaved'); if (s) s.style.display = 'flex';
    });
    var reset = $('#libReset');
    if (reset) reset.addEventListener('click', function () { var map = libCopyStore(); delete map[state.libSel]; libCopySave(map); renderLibrary(); });
  }

  // ── options (topics/roles/block library) ───────────────────────────────────
  function initOptions() {
    fetch('/api/generate/options').then(handleAuth).then(function (r) { return r.json(); }).then(function (o) {
      state.topics = o.topics || [];
      state.blockLibrary = o.blockLibrary || [];
      var sel = $('#bTopic');
      sel.innerHTML = state.topics.map(function (t) { return '<option value="' + esc(t.slug) + '">' + esc(t.label) + '</option>'; }).join('');
    }).catch(function () {});
  }

  // ── create / personalize ───────────────────────────────────────────────────
  function setPersonalized(on) {
    state.personalized = on;
    $('#persoTrack').style.background = on ? '#5C28A4' : '#D1D5DB';
    $('#persoKnob').style.transform = on ? 'translateX(18px)' : 'translateX(0)';
    var badge = $('#persoBadge');
    badge.textContent = on ? 'On' : 'Off';
    badge.style.background = on ? '#F8F5FB' : '#F3F4F6';
    badge.style.color = on ? '#5C28A4' : '#5C5345';
    $('#createPrimaryLabel').textContent = on ? 'Continue in Page Builder' : 'Generate link';
    $('#createPrimary').querySelector('i').className = on ? 'ph-bold ph-arrow-right' : 'ph ph-link';
    // fields grey out when personalizing (page copy comes from the builder)
    $('#createFields').style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:12px;' + (on ? ' opacity:.4; pointer-events:none; filter:grayscale(1);' : '');
    // the primary button sits above the toggle when Off, below it when On
    var wrap = $('#primaryWrap');
    (on ? $('#primaryBottom') : $('#primaryTop')).appendChild(wrap);
  }

  function createPrimary() {
    if (state.personalized) { openBuilder(); return; }
    var d = { name: $('#fName').value, company: $('#fCompany').value, email: $('#fEmail').value, role: $('#fRole').value };
    if (!(d.name || d.company)) return;
    fetch('/api/prospects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
      .then(handleAuth).then(function (r) { return r.json(); }).then(function (res) {
        var p = res.prospect;
        state.createdToken = p.token;
        ['fName', 'fCompany', 'fEmail', 'fRole'].forEach(function (id) { $('#' + id).value = ''; });
        showCreated(p);
        refresh();
      }).catch(function () {});
  }
  function showCreated(p) {
    $('#createdName').textContent = p.name || p.company;
    $('#createdPretty').textContent = prettyLink(p.token);
    $('#createdOpen').setAttribute('href', fileLink(p.token));
    $('#copyBtn').textContent = 'Copy';
    $('#createdBanner').style.display = 'flex';
  }

  // ── Page Builder (matches Quely Page Builder.dc.html) ──────────────────────
  var BUILDER_TOPICS = [
    { key: 'context-fragmentation', label: 'Work information is spread across too many tools' },
    { key: 'decision-traceability', label: 'Decisions and changes lose their history' },
    { key: 'risk-dependencies', label: 'Delivery risks and dependencies surface too late' },
    { key: 'knowledge-loss', label: 'Project knowledge depends on a few people' },
    { key: 'ceremony-loss', label: 'Discussions and meeting outputs do not turn into action' }
  ];
  var B_ROLE = {
    thread: 'Hero', collision: 'Hero', bottleneck: 'Hero', handoff: 'Hero', converge: 'Hero',
    anatomy: 'How Quely solves it', relmap: 'How Quely solves it', multitool: 'How Quely solves it',
    record: 'How Quely solves it', lenses: 'How Quely solves it', planning: 'How Quely solves it',
    roles: 'Benefit', beforeafter: 'Problem', howitworks: 'Process',
    ctaFrag: 'Pre-footer', ctaDec: 'Pre-footer', ctaRisk: 'Pre-footer', ctaKnow: 'Pre-footer', ctaAction: 'Pre-footer'
  };
  var B_FIELD = 'box-sizing:border-box; width:100%; padding:9px 11px; border:1px solid #D8D2E4; border-radius:8px; background:#fff; font-size:13.5px; color:#1A1611;';
  var B_AREA = B_FIELD + ' line-height:1.45; resize:vertical;';
  var B_LBL = 'font-size:11.5px; font-weight:600; color:#4B5563;';
  var B_ICON = 'display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; border:1px solid #D8D2E4; background:#fff; border-radius:7px; cursor:pointer;';
  var B_GHOST = 'display:inline-flex; align-items:center; gap:6px; white-space:nowrap; padding:7px 12px; border:1px solid #1A1611; background:#fff; border-radius:8px; font-size:12.5px; font-weight:600; color:#1A1611; cursor:pointer; font-family:inherit;';

  function openBuilder() {
    var sel = $('#bTopic');
    if (!sel._filled) { sel.innerHTML = BUILDER_TOPICS.map(function (t) { return '<option value="' + esc(t.key) + '">' + esc(t.label) + '</option>'; }).join(''); sel._filled = true; }
    $('#bName').value = $('#fName').value || '';
    $('#bCompany').value = $('#fCompany').value || '';
    if (!BUILDER_TOPICS.some(function (t) { return t.key === sel.value; })) sel.value = BUILDER_TOPICS[0].key;
    state.builder = { plan: null, frames: {}, open: null, token: null };
    $('#builder').style.display = 'flex';
    buildPage();
  }
  function closeBuilder() { $('#builder').style.display = 'none'; state.builder = null; refresh(); }
  function buildPage() {
    var b = state.builder; if (!b) return;
    var body = { name: $('#bName').value, company: $('#bCompany').value, role: 'eng-leader', topic: $('#bTopic').value };
    fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(handleAuth).then(function (r) { return r.json(); }).then(function (res) { b.plan = res.plan; b.token = null; b.open = null; renderBuilder(); })
      .catch(function () {});
  }
  function renderBuilder() { reassignSurfaces(); renderBuilderPreview(); renderBuilderList(); renderBuilderPublish(); updateSummary(); }
  function updateSummary() {
    var b = state.builder; if (!b || !b.plan) return;
    var t = BUILDER_TOPICS.find(function (x) { return x.key === $('#bTopic').value; });
    $('#bSummary').textContent = b.plan.blocks.length + ' blocks · ' + (t ? t.label : '');
  }
  function reassignSurfaces() {
    var b = state.builder; if (!b || !b.plan) return;
    var blocks = b.plan.blocks || [];
    var surfaces = (window.QuelySurfaces && window.QuelySurfaces.assign(blocks.map(function (x) { return x.key; }))) || [];
    blocks.forEach(function (blk, i) { var s = surfaces[i] || 'ink'; blk.surface = s; blk.props = blk.props || {}; blk.props.surface = s; });
  }
  function renderBuilderPreview() {
    var b = state.builder; if (!b || !b.plan) return;
    var host = $('#bPreview'); host.innerHTML = ''; b.frames = {};
    var mount = window.QuelyBlocks && window.QuelyBlocks.mountBlock; if (!mount) return;
    (b.plan.blocks || []).forEach(function (blk, i) { var frame = mount(blk.slug, blk.props); b.frames[i] = frame; host.appendChild(frame); });
    fitPreview();
  }
  // The 1260px preview scales to fit the column (design: zoom capped at .56).
  function fitPreview() {
    var fr = $('#bPreview'), col = $('#bPreviewCol'); if (!fr || !col) return;
    var w = col.clientWidth - 44; if (w <= 0) return;
    fr.style.zoom = Math.min(0.56, w / 1264);
  }
  function renderBuilderList() {
    var b = state.builder; if (!b || !b.plan) return;
    var list = $('#bList'), blocks = b.plan.blocks || [];
    list.innerHTML = '';
    blocks.forEach(function (blk, i) {
      var open = b.open === i;
      var card = document.createElement('div');
      card.style.cssText = 'background:#fff; border:' + (open ? '2px solid #5C28A4' : '1px solid #D8D2E4') + '; border-radius:10px; padding:10px 11px;';
      var role = B_ROLE[blk.key] || '';
      var edited = blk._edited ? ' · edited' : '';
      var head = document.createElement('div');
      head.style.cssText = 'display:flex; align-items:center; gap:9px;';
      head.innerHTML =
        '<span class="mono" style="flex:none; font-size:11px; font-weight:700; color:#6B6280;">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<div data-act="select" style="flex:1; min-width:0; cursor:pointer;"><div style="font-size:13.5px; font-weight:700; color:#1A1611; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + esc(blk.label) + '</div><div style="font-size:11.5px; color:#4B5563;">' + esc(role) + edited + '</div></div>' +
        '<button data-act="up" title="Move up" style="' + B_ICON + (i === 0 ? ' opacity:.35; cursor:default;' : '') + '"><i class="ph-bold ph-caret-up" style="font-size:12px;"></i></button>' +
        '<button data-act="down" title="Move down" style="' + B_ICON + (i === blocks.length - 1 ? ' opacity:.35; cursor:default;' : '') + '"><i class="ph-bold ph-caret-down" style="font-size:12px;"></i></button>' +
        '<button data-act="remove" title="Remove" style="' + B_ICON + '"><i class="ph ph-trash" style="font-size:13px; color:#B91C1C;"></i></button>';
      card.appendChild(head);
      if (open) {
        var ed = document.createElement('div');
        ed.style.cssText = 'display:flex; flex-direction:column; gap:7px; margin-top:11px; padding-top:11px; border-top:1px solid #E4DCEF;';
        var fields = blk.fields || [];
        if (!fields.length) { ed.innerHTML = '<div style="font-size:12px; color:#4B5563;">This block has no editable text.</div>'; }
        else {
          fields.forEach(function (f) {
            var lab = document.createElement('label'); lab.style.cssText = B_LBL; lab.textContent = f.charAt(0).toUpperCase() + f.slice(1); ed.appendChild(lab);
            var area = (f === 'body' || f === 'headline');
            var input = area ? document.createElement('textarea') : document.createElement('input');
            if (f === 'body') input.rows = 4; if (f === 'headline') input.rows = 2;
            input.value = (blk.props && blk.props[f] != null) ? blk.props[f] : '';
            input.placeholder = 'Block default';
            input.style.cssText = area ? B_AREA : B_FIELD;
            input.addEventListener('input', function () {
              blk.props[f] = input.value;
              blk._edited = !!(blk.props.eyebrow || blk.props.headline || blk.props.body);
              var fr = b.frames[i]; if (fr && fr._apply) fr._apply(blk.props);
              var sub = card.querySelector('[data-act="select"] div:last-child');
              if (sub) sub.textContent = role + (blk._edited ? ' · edited' : '');
            });
            ed.appendChild(input);
          });
          var reset = document.createElement('button');
          reset.style.cssText = B_GHOST + ' align-self:flex-start;';
          reset.innerHTML = '<i class="ph ph-arrow-counter-clockwise" style="font-size:13px;"></i>Reset copy';
          reset.addEventListener('click', function () { (blk.fields || []).forEach(function (f) { delete blk.props[f]; }); blk._edited = false; var fr = b.frames[i]; if (fr && fr._apply) fr._apply(blk.props); renderBuilderList(); });
          ed.appendChild(reset);
        }
        card.appendChild(ed);
      }
      head.querySelector('[data-act="select"]').addEventListener('click', function () { b.open = open ? null : i; renderBuilderList(); });
      head.querySelector('[data-act="up"]').addEventListener('click', function () { if (i > 0) moveBlock(i, i - 1); });
      head.querySelector('[data-act="down"]').addEventListener('click', function () { if (i < blocks.length - 1) moveBlock(i, i + 1); });
      head.querySelector('[data-act="remove"]').addEventListener('click', function () { removeBlock(i); });
      list.appendChild(card);
    });
  }
  function moveBlock(from, to) { var arr = state.builder.plan.blocks; var it = arr.splice(from, 1)[0]; arr.splice(to, 0, it); state.builder.open = null; state.builder.token = null; renderBuilder(); }
  function removeBlock(i) { state.builder.plan.blocks.splice(i, 1); state.builder.open = null; state.builder.token = null; renderBuilder(); }
  function addBlock(entry) {
    var blk = { key: entry.key, slug: entry.slug, role: entry.role, label: entry.label, fields: entry.fields ? Object.keys(entry.fields).filter(function (k) { return entry.fields[k]; }) : [], props: Object.assign({}, entry.fields) };
    state.builder.plan.blocks.push(blk);
    state.builder.token = null;
    $('#bPicker2').style.display = 'none';
    renderBuilder();
  }
  function openPicker() {
    var picker = $('#bPicker2');
    if (picker.style.display === 'block') { picker.style.display = 'none'; return; }
    var b = state.builder; var have = (b && b.plan) ? b.plan.blocks.map(function (x) { return x.key; }) : [];
    var lib = (state.blockLibrary || []).filter(function (x) { return have.indexOf(x.key) === -1; });
    picker.innerHTML = lib.map(function (it) {
      return '<div class="bpick" data-k="' + esc(it.key) + '" style="display:flex; align-items:center; gap:10px; padding:10px 12px; border-bottom:1px solid #F1EEF7; cursor:pointer;">' +
        '<div style="flex:1; min-width:0;"><div style="font-size:13.5px; font-weight:700; color:#1A1611;">' + esc(it.label) + '</div><div style="font-size:11.5px; color:#4B5563;">' + esc(B_ROLE[it.key] || '') + '</div></div>' +
        '<i class="ph-bold ph-plus" style="flex:none; font-size:13px; color:#5C28A4;"></i></div>';
    }).join('') || '<div style="padding:12px; font-size:12.5px; color:#4B5563;">All blocks are already on the page.</div>';
    picker.style.display = 'block';
    picker.querySelectorAll('.bpick').forEach(function (row) {
      row.addEventListener('click', function () { var e = (state.blockLibrary || []).find(function (x) { return x.key === row.getAttribute('data-k'); }); if (e) addBlock(e); });
    });
  }
  // inline confirm (browser dialogs are unreliable) — for Regenerate and topic change
  function builderConfirm(text, onYes) {
    var host = $('#bConfirm');
    host.innerHTML = '<div style="background:#FFF7ED; border:1px solid #FED7AA; border-radius:10px; padding:11px 12px;">' +
      '<div style="font-size:13px; line-height:1.45; color:#7C2D12;">' + esc(text) + '</div>' +
      '<div style="display:flex; gap:8px; margin-top:9px;"><button id="bcYes" style="' + B_GHOST + ' background:#1A1611; color:#fff; border-color:#1A1611;">Yes, rebuild</button><button id="bcNo" style="' + B_GHOST + '">Cancel</button></div></div>';
    $('#bcYes').addEventListener('click', function () { host.innerHTML = ''; onYes(); });
    $('#bcNo').addEventListener('click', function () { host.innerHTML = ''; });
  }
  function regenerateBuilder() { builderConfirm('Rebuild the page from the rules? Your added blocks, order changes and copy edits will be discarded.', buildPage); }
  function renderBuilderPublish() {
    var b = state.builder, card = $('#bLinkCard'), lbl = $('#bPublishLabel');
    if (!b || !b.token) { card.innerHTML = ''; if (lbl) lbl.textContent = 'Publish and create link'; return; }
    if (lbl) lbl.textContent = 'Publish again';
    card.innerHTML = '<div style="background:#fff; border:2px solid #1A1611; box-shadow:4px 4px 0 #1A1611; padding:12px 13px;">' +
      '<div style="font-size:12px; font-weight:700; color:#15803D; margin-bottom:6px;"><i class="ph-fill ph-check-circle"></i> Published</div>' +
      '<div class="mono" style="font-size:12px; color:#1A1611; word-break:break-all;">quely.io/v/' + esc(b.token) + '</div>' +
      '<div style="display:flex; gap:8px; margin-top:10px;"><button id="bCopyLink" style="' + B_GHOST + '"><i class="ph ph-copy" style="font-size:13px;"></i>Copy link</button><button id="bOpenLink" style="' + B_GHOST + '"><i class="ph ph-arrow-square-out" style="font-size:13px;"></i>Open page</button></div></div>';
    $('#bCopyLink').addEventListener('click', function () { try { navigator.clipboard.writeText(absLink(b.token)); } catch (e) {} this.innerHTML = '<i class="ph ph-check" style="font-size:13px;"></i>Copied'; });
    $('#bOpenLink').addEventListener('click', function () { window.open(fileLink(b.token), '_blank'); });
  }
  function publishFromBuilder() {
    var b = state.builder; if (!b || !b.plan || !b.plan.blocks.length) return;
    b.plan.custom = true; b.plan.blockKeys = b.plan.blocks.map(function (x) { return x.key; });
    var d = { name: $('#bName').value || 'Prospect', company: $('#bCompany').value || 'Their team', email: $('#fEmail').value, role: $('#fRole').value, advanced: true, focusTopic: $('#bTopic').value, pagePlan: b.plan };
    fetch('/api/prospects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
      .then(handleAuth).then(function (r) { return r.json(); }).then(function (res) {
        b.token = res.prospect.token; state.createdToken = res.prospect.token;
        renderBuilderPublish();
      }).catch(function () { window.alert('Something went wrong publishing.'); });
  }

  // ── events ──────────────────────────────────────────────────────────────
  function initEvents() {
    document.querySelectorAll('.navbtn[data-nav]').forEach(function (b) { b.addEventListener('click', function () { state.view = b.getAttribute('data-nav'); render(); }); });
    $('#navBuilder').addEventListener('click', function () { openBuilder(); });
    $('#logout').addEventListener('click', function () { fetch('/api/logout', { method: 'POST' }).then(function () { location.href = '/login'; }); });
    $('#notifToggle').addEventListener('click', function () { state.notifOpen = !state.notifOpen; renderNotifications(); });
    $('#notifClear').addEventListener('click', function () { fetch('/api/notifications/clear', { method: 'POST' }).then(function () { refresh(); }); });

    $('#createPrimary').addEventListener('click', createPrimary);
    $('#persoToggle').addEventListener('click', function () { setPersonalized(!state.personalized); });

    $('#prospectList').addEventListener('click', function (e) {
      if (e.target.closest('.openlink')) return;
      var row = e.target.closest('.prow');
      if (row) { state.selToken = row.getAttribute('data-token'); renderDetail(); }
    });
    $('#detailScrim').addEventListener('click', function () { state.selToken = null; $('#detailModal').style.display = 'none'; });
    $('#detailClose').addEventListener('click', function () { state.selToken = null; $('#detailModal').style.display = 'none'; });

    $('#copyBtn').addEventListener('click', function () {
      if (!state.createdToken) return;
      try { navigator.clipboard.writeText(absLink(state.createdToken)); } catch (e) {}
      $('#copyBtn').textContent = 'Copied'; setTimeout(function () { $('#copyBtn').textContent = 'Copy'; }, 1500);
    });

    // builder
    $('#bBack').addEventListener('click', closeBuilder);
    $('#bPublish').addEventListener('click', publishFromBuilder);
    $('#bRegen').addEventListener('click', regenerateBuilder);
    $('#bAdd').addEventListener('click', openPicker);
    $('#bName').addEventListener('input', function () { if (state.builder) state.builder.token = null; renderBuilderPublish(); });
    $('#bCompany').addEventListener('input', function () { if (state.builder) state.builder.token = null; renderBuilderPublish(); });
    $('#bTopic').addEventListener('change', function () {
      var b = state.builder; if (!b) return;
      var edited = (b.plan && b.plan.blocks || []).some(function (x) { return x._edited; });
      if (edited) builderConfirm('Changing the problem rebuilds the page and discards your edits.', buildPage);
      else buildPage();
    });
    window.addEventListener('resize', function () { if (state.builder) fitPreview(); });
  }

  // ── boot ────────────────────────────────────────────────────────────────
  initEvents();
  initOptions();
  setPersonalized(false);
  refresh();
  setInterval(refresh, 1500);
  window.addEventListener('focus', refresh);
})();
