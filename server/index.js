/* Quely Sales Enablement — one app, two doors.
 *
 *   /dashboard   internal surface, requires auth (shared team password)
 *   /v/:token    prospect surface, no login — the unguessable token IS the key
 *
 * One shared SQLite database (server/db.js) backs both. Prospect actions on
 * /v/:token show up on /dashboard via polling. Rep gets an email (server/email.js)
 * on a prospect's first view and on every question.
 */
'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');

const store = require('./db');
const email = require('./email');
const analytics = require('./analytics');
const generate = require('./generate');

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'quely';
const SESSION_SECRET = process.env.SESSION_SECRET || 'quely-dev-secret-change-me';

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

app.set('trust proxy', 1);
app.use(express.json({ limit: '64kb' }));
app.use(session({
  name: 'quely.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

// Static assets & scripts (safe to serve publicly; both surfaces share them).
// Use ETag/Last-Modified revalidation rather than a hard max-age so that
// swapping an asset on disk (e.g. dropping in the real quely-product-ui.png)
// is picked up immediately instead of being masked by a stale browser cache.
app.use('/assets', express.static(path.join(PUBLIC_DIR, 'assets'), { maxAge: 0, etag: true, lastModified: true }));
app.use('/js', express.static(path.join(PUBLIC_DIR, 'js'), { maxAge: 0 }));
// Marketing/visual blocks (public, framework-free page sections ported from the design's Block library)
app.use('/blocks', express.static(path.join(PUBLIC_DIR, 'blocks'), { maxAge: 0, extensions: ['html'] }));
// Browsers auto-request /favicon.ico even though pages set <link rel="icon">; serve the brand mark so it doesn't 404.
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'assets', 'quely-mark-brand.svg')));

function requireAuth(req, res, next) {
  if (req.session && req.session.authed) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'auth_required' });
  return res.redirect('/login');
}

// Wrap async route handlers so a rejected promise (e.g. a DB hiccup) becomes a
// clean 500 instead of an unhandled rejection that hangs the request.
function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function sectionLabel(id) {
  const s = store.SECTIONS.find(x => x.id === id);
  return s ? s.label : id;
}

// ── auth ────────────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (password && password === DASHBOARD_PASSWORD) {
    req.session.authed = true;
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false, error: 'bad_password' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  res.json({ authed: !!(req.session && req.session.authed) });
});

// ── dashboard API (auth required) ─────────────────────────────────────────
app.get('/api/prospects', requireAuth, wrap(async (req, res) => {
  res.json({
    sections: store.SECTIONS,
    painAngles: store.PAIN_ANGLES,
    prospects: await store.listProspects()
  });
}));

app.post('/api/prospects', requireAuth, wrap(async (req, res) => {
  const d = req.body || {};
  if (!(d.name || d.company)) return res.status(400).json({ error: 'name_or_company_required' });
  const p = await store.createProspect({
    name: d.name, company: d.company, email: d.email, role: d.role, pain: d.pain, note: d.note,
    // Advanced (per-prospect generated page) — omitted/false = Standard mode
    advanced: !!d.advanced,
    focusTopic: d.focusTopic, focusRole: d.focusRole, genNotes: d.genNotes, pagePlan: d.pagePlan
  });
  analytics.pageCreated(p);
  res.json({ prospect: p });
}));

// Options for the dashboard's Advanced generator (problem topics, roles).
app.get('/api/generate/options', requireAuth, (req, res) => {
  res.json({
    topics: generate.TOPICS, roles: generate.ROLES, aiEnabled: generate.aiEnabled,
    blockLibrary: generate.blockLibrary
  });
});

// Generate a tailored PagePlan for review (rep edits/approves before creating the link).
app.post('/api/generate', requireAuth, (req, res) => {
  const d = req.body || {};
  const plan = generate.generatePlan({
    name: d.name, company: d.company, role: d.role, topic: d.topic, notes: d.notes
  });
  res.json({ plan: plan });
});

app.get('/api/prospects/:token', requireAuth, wrap(async (req, res) => {
  const p = await store.getProspect(req.params.token);
  if (!p) return res.status(404).json({ error: 'not_found' });
  res.json({ prospect: p });
}));

app.delete('/api/prospects/:token', requireAuth, wrap(async (req, res) => {
  await store.deleteProspect(req.params.token);
  res.json({ ok: true });
}));

app.get('/api/notifications', requireAuth, wrap(async (req, res) => {
  res.json({ notifications: await store.getNotifications() });
}));

app.post('/api/notifications/clear', requireAuth, wrap(async (req, res) => {
  await store.clearNotifications();
  res.json({ ok: true });
}));

// ── prospect (public, token-scoped) API ───────────────────────────────────
// Only ever exposes the prospect's own name/company (for personalization).
// Unknown token → { found:false }, never a data leak.
app.get('/api/v/:token', wrap(async (req, res) => {
  const p = await store.getProspect(req.params.token);
  if (!p) return res.json({ found: false });
  // Advanced prospects carry a generated pagePlan the viewer renders; Standard
  // prospects get null and the viewer shows the frozen default page.
  res.json({
    found: true, name: p.name, company: p.company, sections: store.SECTIONS,
    advanced: !!p.advanced, pagePlan: p.advanced ? (p.pagePlan || null) : null
  });
}));

app.post('/api/v/:token/visit', wrap(async (req, res) => {
  const r = await store.recordVisit(req.params.token);
  if (r && r.ok) {
    const p = await store.getProspect(req.params.token);
    if (p) {
      analytics.visit(p, !!r.firstOpen); // Link Opened (first) vs Return Visit
      if (r.firstOpen) email.notifyView(p);
    }
  }
  res.json({ ok: true });
}));

app.post('/api/v/:token/section-time', wrap(async (req, res) => {
  const sectionId = req.body && req.body.sectionId;
  const ms = Number(req.body && req.body.ms) || 0;
  const r = await store.addSectionTime(req.params.token, sectionId, ms);
  if (r && r.ok) {
    const p = await store.getProspect(req.params.token);
    if (p) analytics.sectionTime(p, sectionId, ms);
  }
  res.json({ ok: true });
}));

app.post('/api/v/:token/event', wrap(async (req, res) => {
  const { type, meta } = req.body || {};
  if (!type) return res.status(400).json({ error: 'type_required' });
  await store.recordEvent(req.params.token, type, meta || null);
  const p = await store.getProspect(req.params.token);
  if (p) analytics.viewerEvent(p, type, meta || null);
  res.json({ ok: true });
}));

app.post('/api/v/:token/question', wrap(async (req, res) => {
  const { text, section } = req.body || {};
  const result = await store.addQuestion(req.params.token, { text, section });
  if (result) {
    const p = await store.getProspect(req.params.token);
    if (p) {
      analytics.questionSubmitted(p, result.item);
      email.notifyQuestion(p, result.item.text, sectionLabel(result.item.section));
    }
  }
  res.json({ ok: true });
}));

// ── page routes ───────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.redirect(req.session && req.session.authed ? '/dashboard' : '/login');
});

app.get('/login', (req, res) => {
  if (req.session && req.session.authed) return res.redirect('/dashboard');
  res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'dashboard.html'));
});

app.get('/v/:token', (req, res) => {
  // Serve the viewer shell for ANY token; the client resolves the token via the
  // API and shows a generic marketing page when it doesn't exist.
  res.sendFile(path.join(PUBLIC_DIR, 'viewer.html'));
});

// JSON error handler for anything a route passes to next() (e.g. a DB error).
app.use((err, req, res, next) => {
  console.error('[error]', err && err.stack ? err.stack : err);
  if (res.headersSent) return next(err);
  if (req.path && req.path.startsWith('/api/')) return res.status(500).json({ error: 'server_error' });
  res.status(500).send('Server error');
});

// Prepare the database, then start listening.
store.init().then(() => {
  app.listen(PORT, () => {
    console.log(`\n  Quely Sales Enablement running`);
    console.log(`  ▸ Dashboard : http://localhost:${PORT}/dashboard  (password: ${DASHBOARD_PASSWORD === 'quely' ? 'quely — set DASHBOARD_PASSWORD' : '••••••'})`);
    console.log(`  ▸ Prospect  : http://localhost:${PORT}/v/<token>`);
    console.log(`  ▸ Database  : ${process.env.TURSO_DATABASE_URL ? 'Turso (cloud)' : 'local file'}`);
    console.log(`  ▸ Email     : ${email.enabled ? 'SMTP configured' : 'console-log mode (set SMTP_* to send real mail)'}${email.repConfigured ? '' : ', REP_EMAIL not set'}`);
    console.log(`  ▸ Analytics : ${analytics.enabled ? 'Mixpanel configured' : 'console-log mode (set MIXPANEL_TOKEN to send events)'}\n`);
  });
}).catch((err) => {
  console.error('\n  Failed to initialise the database:', err && err.message ? err.message : err, '\n');
  process.exit(1);
});
