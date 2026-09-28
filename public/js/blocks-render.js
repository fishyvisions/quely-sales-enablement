/* Shared block renderer — used by both the published Prospect Viewer and the
   dashboard preview so what a rep previews is exactly what a prospect sees.

   A "block" is one of the reusable design pages in /blocks/. We mount it as an
   auto-sizing, same-origin iframe and push the rep's edited copy into it via the
   block runtime's __dcSetProps (highest priority over the block's own demo
   defaults). If anything fails, the block simply shows its polished defaults. */
(function () {
  'use strict';

  // Push tailored props into an already-mounted block iframe (live edits).
  function applyProps(iframe, props) {
    try {
      var win = iframe.contentWindow;
      if (win && win.__dcSetProps && win.__dcRootName && win.__dcRootName()) {
        win.__dcSetProps(win.__dcRootName(), props || {});
        return true;
      }
    } catch (e) {}
    return false;
  }

  function sizeTo(iframe) {
    try {
      var d = iframe.contentWindow.document;
      var h = Math.max(d.body ? d.body.scrollHeight : 0, d.documentElement ? d.documentElement.scrollHeight : 0);
      if (h) iframe.style.height = h + 'px';
    } catch (e) {}
  }

  // Surface background colors (mirror SURFACES in quely-page-plans.js) so the
  // iframe placeholder matches the block before it paints — no dark flash on a
  // light (paper/lilac) block.
  var SURFACE_BG = { ink: '#1A1611', paper: '#ECE7F2', lilac: '#DED6F1', violet: '#41186F' };

  // Create and return a block iframe. `props` are applied once the runtime boots.
  // Keeps its own live handle so callers can update props later via el._apply().
  function mountBlock(slug, props) {
    var iframe = document.createElement('iframe');
    iframe.src = '/blocks/' + slug + '.html';
    iframe.title = slug;
    iframe.setAttribute('scrolling', 'no');
    var bg = (props && SURFACE_BG[props.surface]) || '#1A1611';
    iframe.style.cssText = 'display:block; width:100%; height:520px; border:0; overflow:hidden; background:' + bg + ';';
    iframe._latestProps = props || {};
    iframe._apply = function (p) {
      iframe._latestProps = p || {};
      applyProps(iframe, iframe._latestProps);
      sizeTo(iframe);
    };
    iframe.addEventListener('load', function () {
      var win = iframe.contentWindow;
      var tries = 0;
      (function ready() {
        tries++;
        var ok = false;
        try { ok = !!(win.__dcSetProps && win.__dcRootName && win.__dcRootName()); } catch (e) {}
        if (ok) {
          applyProps(iframe, iframe._latestProps);
          sizeTo(iframe);
          setTimeout(function () { sizeTo(iframe); }, 150);
          setTimeout(function () { sizeTo(iframe); }, 600);
          setTimeout(function () { sizeTo(iframe); }, 1600);
          try { if (win.ResizeObserver && win.document.body) new win.ResizeObserver(function () { sizeTo(iframe); }).observe(win.document.body); } catch (e) {}
        } else if (tries < 200) { setTimeout(ready, 50); }
        else { sizeTo(iframe); }
      })();
    });
    return iframe;
  }

  // Also let a live edit update the iframe placeholder bg when the surface changes.
  function setSurfaceBg(iframe, surface) {
    try { iframe.style.background = SURFACE_BG[surface] || '#1A1611'; } catch (e) {}
  }

  // ── Surface rhythm (mirrors assignSurfaces in quely-page-plans.js) ──────────
  // Lets the builder recompute surfaces client-side when blocks are reordered/added.
  var BLOCK_POLARITY = {
    thread: 'dark', collision: 'dark', bottleneck: 'dark', handoff: 'dark', scatter: 'dark',
    converge: 'dark', record: 'dark', lenses: 'dark', beforeafter: 'dark', ctaDec: 'dark', ctaKnow: 'dark',
    anatomy: 'light', relmap: 'light', multitool: 'light', planning: 'light',
    review: 'light', roles: 'light', howitworks: 'light',
    ctaFrag: 'dark', ctaRisk: 'dark', ctaAction: 'dark'
  };
  var DARKS = ['ink', 'violet'], LIGHTS = ['paper', 'lilac'];
  function assignSurfaces(order) {
    var out = [], di = 0, li = 0;
    (order || []).forEach(function (key, i) {
      var pol = BLOCK_POLARITY[key] || 'light';
      var pool = pol === 'dark' ? DARKS : LIGHTS;
      var want = pool[(pol === 'dark' ? di++ : li++) % pool.length];
      if (i > 0 && want === out[i - 1]) want = pool[(pol === 'dark' ? di++ : li++) % pool.length];
      out.push(want);
    });
    return out;
  }

  window.QuelyBlocks = { mountBlock: mountBlock, applyProps: applyProps, sizeTo: sizeTo, setSurfaceBg: setSurfaceBg };
  window.QuelySurfaces = { assign: assignSurfaces, BG: SURFACE_BG };
})();
