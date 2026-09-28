/* default-page-check.js — DEFAULT-PAGE REGRESSION TRIPWIRE
   Verifies that the STANDARD (non-customized) prospect page still renders the
   original, approved experience. Runs only in standard mode, after render.
   On failure: loud console.error with [DEFAULT-PAGE-CHECK] prefix + a fixed red
   banner so drift is caught immediately instead of by the user.
   PROTECTED FILE: update fingerprints ONLY when a default-page change is
   explicitly approved. */
(function () {
  function txt(sel) { var el = document.querySelector(sel); return el ? el.innerText : ''; }

  function runChecks() {
    var f = [];
    var ok = function (cond, label) { if (!cond) f.push(label); };

    // 1. Hero headline
    ok(txt('#hero h1').indexOf('Stop searching across five tools') !== -1, 'Hero headline changed');
    // 2. The scattered-context illustration in the problem section (replaced the 9 logo chips — approved)
    ok(!!document.querySelector('#problem img[src*="scattered-context"]'), 'Problem scattered-context image missing');
    // 3. Three original Reddit posts
    var proofTxt = txt('#proof');
    ok(proofTxt.indexOf('How do you stop work from disappearing') !== -1, 'Reddit post 1 missing');
    ok(proofTxt.indexOf("human release notes") !== -1, 'Reddit post 2 missing');
    ok(proofTxt.indexOf('Jira as a task pool') !== -1, 'Reddit post 3 missing');
    // 4. Checkout task + scenario
    var spacesTxt = txt('#spaces');
    ok(spacesTxt.indexOf('Fix checkout flow') !== -1, 'Checkout task name missing from Space');
    ok(spacesTxt.indexOf('CHECKOUT-1428') !== -1, 'Checkout task id missing');
    ok(spacesTxt.indexOf('Renewal risk') !== -1, 'Renewal-risk badge missing');
    // 5. Original Space tabs
    ['Discussion', 'Docs', 'Decisions', 'Activity'].forEach(function (t) {
      ok(spacesTxt.indexOf(t) !== -1, 'Space tab missing: ' + t);
    });
    // 6. Original Orbit + Lens content
    var orbitTxt = txt('#orbit');
    ok(orbitTxt.indexOf('Fix checkout flow') !== -1, 'Orbit context chip / lens subject missing');
    var suggBtns = Array.prototype.filter.call(document.querySelectorAll('#orbit button'), function (b) { return /blocking|changed|scope|next/i.test(b.innerText); });
    ok(suggBtns.length >= 4, 'Orbit suggested questions: expected 4, found ' + suggBtns.length);
    // 6b. Rebuilt product-faithful Orbit panel (approved)
    ok(orbitTxt.indexOf('What can I help you with?') !== -1, 'Orbit empty-state prompt missing');
    ok(/Actions/.test(orbitTxt) && /BETA/.test(orbitTxt), 'Orbit Actions row missing');
    ok(orbitTxt.indexOf('Add tool') !== -1, 'Orbit composer "Add tool" chip missing');
    ok(!!document.querySelector('#orbit input[placeholder="Ask a question about this Space"]'), 'Orbit composer placeholder changed');
    ok(!!document.querySelector('#orbit img[src*="orbit-pet"]'), 'Orbit mascot missing from panel');
    // the four real lens categories, per the product demo (replaces the earlier
    // invented "Open Questions" / "Next Steps" pair)
    ['Decisions', 'Action Items', 'Risks', 'Opportunities'].forEach(function (l) {
      ok(orbitTxt.indexOf(l) !== -1, 'Lens missing: ' + l);
    });
    ok(orbitTxt.indexOf('Synthesized from 2 sources') !== -1, 'Lens panel header missing');
    ok(orbitTxt.indexOf('Lens Map') !== -1, 'Lens Map affordance missing');
    ok(/Search lenses/.test(orbitTxt), 'Lens search field missing');
    ok(!!document.querySelector('#orbit [data-lens-bar] i.ph-arrow-square-out'), 'Lens push-to-tool action missing');
    ok(!!document.querySelector('#orbit [data-lens-bar] i.ph-calendar-plus'), 'Lens schedule-meeting action missing');
    // 7. Six original capability cards
    ['Integrations', 'Async discussion', 'Docs & assets', 'Discussion timers', 'Meeting transcripts', 'Decision log'].forEach(function (c) {
      ok(txt('#features').indexOf(c) !== -1, 'Capability card missing: ' + c);
    });
    // 8. Original CTA
    ok(txt('#cta').indexOf('Give your team the full picture around the work') !== -1, 'CTA headline changed');
    // 9. All default sections present
    ['hero', 'problem', 'proof', 'spaces', 'orbit', 'features', 'cta'].forEach(function (id) {
      ok(!!document.getElementById(id), 'Section missing: #' + id);
    });
    return f;
  }

  function report(failures) {
    window.__defaultPageCheck = { pass: failures.length === 0, failures: failures, at: new Date().toISOString() };
    if (failures.length === 0) {
      console.log('[DEFAULT-PAGE-CHECK] PASS — default page intact (' + new Date().toLocaleTimeString() + ')');
      var old = document.querySelector('[data-default-check-banner]'); if (old) old.remove();
      return;
    }
    console.error('[DEFAULT-PAGE-CHECK] FAILED — the default prospect page has changed:\n  • ' + failures.join('\n  • '));
    // The red banner is for rep/preview loads ONLY (no prospect token) — a real
    // prospect must never see an internal error banner; console + window flag remain.
    var hasToken = !!new URLSearchParams(location.search).get('p');
    if (hasToken) return;
    if (document.querySelector('[data-default-check-banner]')) return;
    var b = document.createElement('div');
    b.setAttribute('data-default-check-banner', '');
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#DC2626;color:#fff;font:600 14px/1.4 Inter,sans-serif;padding:10px 18px;display:flex;gap:10px;align-items:center;';
    b.innerHTML = '<span style="font-weight:800;">Default page check failed:</span><span>' + failures.join(' · ') + '</span>';
    document.body.appendChild(b);
  }

  // Retry until content has streamed/settled. A failure is only reported after
  // TWO consecutive failing sweeps post-settle (guards against hydration races),
  // and a follow-up re-check clears a stale banner if the page recovers.
  window.runDefaultPageCheck = function () {
    var tries = 0, failStreak = 0;
    (function attempt() {
      tries++;
      var failures = runChecks();
      if (failures.length === 0) return report(failures);
      failStreak++;
      if (tries >= 15 && failStreak >= 2) {
        report(failures);
        setTimeout(function () { var again = runChecks(); if (again.length === 0) report(again); }, 5000);
        return;
      }
      setTimeout(attempt, 1000);
    })();
  };
})();
