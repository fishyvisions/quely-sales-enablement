/* Quely Sales Enablement — real backend data layer (libSQL / Turso).
 *
 * Storage is a libSQL database. Two modes, chosen by env:
 *   - Cloud   : set TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) → hosted Turso DB.
 *               Lets the app run on a free host with no persistent disk and
 *               keep prospects/links/questions alive across restarts.
 *   - Local   : no TURSO_DATABASE_URL → a local file (data/quely.db) for dev.
 *
 * Same data model, same function names as before — only the calls are now async
 * (libSQL is async), so callers `await` them. Nothing else about the app changes.
 *
 * Data model (unchanged from the contract):
 *   Prospect: { token, name, company, email, role, pain, note, created,
 *               visits[], firstOpened, lastOpened, sectionMs{}, ctaClicked,
 *               events[], questions[], advanced, focusTopic, focusRole,
 *               genNotes, pagePlan }
 *   events[]:    { type, meta, ts }
 *   questions[]: { text, section, ts }
 *   notifications[]: { type:'view'|'question', token, name, company, text?, section?, ts }
 */
'use strict';

const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

// Canonical sections both surfaces agree on (order = story order).
const SECTIONS = [
  { id: 'hero', label: 'Intro' },
  { id: 'problem', label: 'The problem' },
  { id: 'proof', label: 'Real teams' },
  { id: 'spaces', label: 'Spaces' },
  { id: 'orbit', label: 'Orbit' },
  { id: 'features', label: 'Features' },
  { id: 'cta', label: 'Book a demo' }
];

const PAIN_ANGLES = ['Jira context', 'EM visibility', 'Orbit / AI', 'Customer context', 'Async discussion', 'Integrations'];

// ── connection ──────────────────────────────────────────────────────────────
const TURSO_URL = process.env.TURSO_DATABASE_URL;
let client;
if (TURSO_URL) {
  client = createClient({ url: TURSO_URL, authToken: process.env.TURSO_AUTH_TOKEN });
} else {
  const DATA_DIR = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'quely.db');
  client = createClient({ url: 'file:' + DB_PATH });
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS prospects (
    token        TEXT PRIMARY KEY,
    seq          INTEGER,
    name         TEXT NOT NULL DEFAULT '',
    company      TEXT NOT NULL DEFAULT '',
    email        TEXT NOT NULL DEFAULT '',
    role         TEXT NOT NULL DEFAULT '',
    pain         TEXT NOT NULL DEFAULT '',
    note         TEXT NOT NULL DEFAULT '',
    created      INTEGER NOT NULL,
    first_opened INTEGER,
    last_opened  INTEGER,
    cta_clicked  INTEGER NOT NULL DEFAULT 0,
    advanced     INTEGER NOT NULL DEFAULT 0,
    focus_topic  TEXT,
    focus_role   TEXT,
    gen_notes    TEXT,
    page_plan    TEXT
  );
  CREATE TABLE IF NOT EXISTS visits (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL,
    ts    INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS section_ms (
    token   TEXT NOT NULL,
    section TEXT NOT NULL,
    ms      INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (token, section)
  );
  CREATE TABLE IF NOT EXISTS events (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL,
    type  TEXT NOT NULL,
    meta  TEXT,
    ts    INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS questions (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    token   TEXT NOT NULL,
    text    TEXT NOT NULL DEFAULT '',
    section TEXT NOT NULL DEFAULT '',
    ts      INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    type    TEXT NOT NULL,
    token   TEXT NOT NULL,
    name    TEXT,
    company TEXT,
    text    TEXT,
    section TEXT,
    ts      INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_visits_token ON visits(token);
  CREATE INDEX IF NOT EXISTS idx_events_token ON events(token);
  CREATE INDEX IF NOT EXISTS idx_questions_token ON questions(token);
`;

// Create tables (idempotent), then add any missing columns for older databases.
async function init() {
  await client.executeMultiple(SCHEMA);
  const info = await client.execute('PRAGMA table_info(prospects)');
  const cols = info.rows.map((c) => c.name);
  const adds = [
    ['advanced', 'advanced INTEGER NOT NULL DEFAULT 0'],
    ['focus_topic', 'focus_topic TEXT'],
    ['focus_role', 'focus_role TEXT'],
    ['gen_notes', 'gen_notes TEXT'],
    ['page_plan', 'page_plan TEXT']
  ];
  for (const [name, ddl] of adds) {
    if (cols.indexOf(name) === -1) await client.execute('ALTER TABLE prospects ADD COLUMN ' + ddl);
  }
}

// ── query helpers ─────────────────────────────────────────────────────────
async function all(sql, args) { return (await client.execute({ sql, args: args || [] })).rows; }
async function get(sql, args) { return (await client.execute({ sql, args: args || [] })).rows[0] || null; }
async function run(sql, args) { return client.execute({ sql, args: args || [] }); }

function now() { return Date.now(); }

function slug(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
}

async function makeToken(name, company) {
  const base = (slug(company) || 'prospect') + '-' + (slug(name).split('-')[0] || 'x');
  let t = base, i = 2;
  while (await get('SELECT 1 AS x FROM prospects WHERE token = ?', [t])) { t = base + '-' + i; i++; }
  return t;
}

function safeParse(s) { try { return JSON.parse(s); } catch (_) { return null; } }

// Assemble a full prospect object (matching the original data shape) from rows.
async function hydrate(row) {
  if (!row) return null;
  const [msRows, evRows, viRows, qRows] = await Promise.all([
    all('SELECT section, ms FROM section_ms WHERE token = ?', [row.token]),
    all('SELECT type, meta, ts FROM events WHERE token = ? ORDER BY ts ASC, id ASC', [row.token]),
    all('SELECT ts FROM visits WHERE token = ? ORDER BY ts ASC', [row.token]),
    all('SELECT text, section, ts FROM questions WHERE token = ? ORDER BY ts ASC, id ASC', [row.token])
  ]);
  const sectionMs = {};
  for (const s of msRows) sectionMs[s.section] = Number(s.ms);
  return {
    token: row.token,
    name: row.name,
    company: row.company,
    email: row.email,
    role: row.role,
    pain: row.pain,
    note: row.note,
    created: Number(row.created),
    visits: viRows.map((v) => Number(v.ts)),
    firstOpened: row.first_opened ? Number(row.first_opened) : null,
    lastOpened: row.last_opened ? Number(row.last_opened) : null,
    sectionMs,
    ctaClicked: !!row.cta_clicked,
    events: evRows.map((e) => ({ type: e.type, meta: e.meta == null ? null : safeParse(e.meta), ts: Number(e.ts) })),
    questions: qRows.map((x) => ({ text: x.text, section: x.section, ts: Number(x.ts) })),
    advanced: !!row.advanced,
    focusTopic: row.focus_topic || '',
    focusRole: row.focus_role || '',
    genNotes: row.gen_notes || '',
    pagePlan: row.page_plan ? safeParse(row.page_plan) : null
  };
}

// ── public API (mirrors the old store, now async) ───────────────────────────
async function getProspect(token) {
  return hydrate(await get('SELECT * FROM prospects WHERE token = ?', [token]));
}

const API = {
  SECTIONS,
  PAIN_ANGLES,
  init,

  async listProspects() {
    const rows = await all('SELECT * FROM prospects ORDER BY seq DESC');
    return Promise.all(rows.map(hydrate));
  },

  getProspect,

  async createProspect(d) {
    d = d || {};
    const token = await makeToken(d.name, d.company);
    const seqRow = await get('SELECT COALESCE(MAX(seq), 0) + 1 AS s FROM prospects');
    const seq = Number(seqRow.s);
    await run(
      `INSERT INTO prospects (token, seq, name, company, email, role, pain, note, created, cta_clicked,
                              advanced, focus_topic, focus_role, gen_notes, page_plan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
      [
        token, seq, d.name || '', d.company || '', d.email || '',
        d.role || '', d.pain || '', d.note || '', now(),
        d.advanced ? 1 : 0,
        d.focusTopic || null,
        d.focusRole || null,
        d.genNotes || null,
        d.pagePlan ? JSON.stringify(d.pagePlan) : null
      ]
    );
    return getProspect(token);
  },

  async deleteProspect(token) {
    // Delete children explicitly (independent of foreign-key enforcement).
    await client.batch([
      { sql: 'DELETE FROM notifications WHERE token = ?', args: [token] },
      { sql: 'DELETE FROM questions WHERE token = ?', args: [token] },
      { sql: 'DELETE FROM events WHERE token = ?', args: [token] },
      { sql: 'DELETE FROM section_ms WHERE token = ?', args: [token] },
      { sql: 'DELETE FROM visits WHERE token = ?', args: [token] },
      { sql: 'DELETE FROM prospects WHERE token = ?', args: [token] }
    ], 'write');
  },

  // Returns a "view" notification object if this visit was the first open, else null.
  async recordVisit(token) {
    const row = await get('SELECT * FROM prospects WHERE token = ?', [token]);
    if (!row) return { ok: false };
    const t = now();
    await run('INSERT INTO visits (token, ts) VALUES (?, ?)', [token, t]);
    let firstOpen = null;
    if (!row.first_opened) {
      await run('UPDATE prospects SET first_opened = ? WHERE token = ?', [t, token]);
      await run('INSERT INTO notifications (type, token, name, company, text, section, ts) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['view', token, row.name, row.company, null, null, t]);
      firstOpen = { type: 'view', token, name: row.name, company: row.company, ts: t };
    }
    await run('UPDATE prospects SET last_opened = ? WHERE token = ?', [t, token]);
    return { ok: true, firstOpen };
  },

  async addSectionTime(token, sectionId, ms) {
    if (!ms || ms < 0) return { ok: false };
    if (!(await get('SELECT 1 AS x FROM prospects WHERE token = ?', [token]))) return { ok: false };
    await run(
      `INSERT INTO section_ms (token, section, ms) VALUES (?, ?, ?)
       ON CONFLICT(token, section) DO UPDATE SET ms = ms + excluded.ms`,
      [token, sectionId, ms]
    );
    return { ok: true };
  },

  async recordEvent(token, type, meta) {
    if (!(await get('SELECT 1 AS x FROM prospects WHERE token = ?', [token]))) return { ok: false };
    await run('INSERT INTO events (token, type, meta, ts) VALUES (?, ?, ?, ?)',
      [token, type, meta == null ? null : JSON.stringify(meta), now()]);
    if (type === 'cta') await run('UPDATE prospects SET cta_clicked = 1 WHERE token = ?', [token]);
    return { ok: true };
  },

  async addQuestion(token, qy) {
    const row = await get('SELECT * FROM prospects WHERE token = ?', [token]);
    if (!row) return null;
    const item = { text: (qy && qy.text) || '', section: (qy && qy.section) || '', ts: now() };
    await run('INSERT INTO questions (token, text, section, ts) VALUES (?, ?, ?, ?)',
      [token, item.text, item.section, item.ts]);
    await run('INSERT INTO notifications (type, token, name, company, text, section, ts) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['question', token, row.name, row.company, item.text, item.section, item.ts]);
    return { item, name: row.name, company: row.company, email: row.email };
  },

  async getNotifications() {
    const rows = await all('SELECT * FROM notifications ORDER BY id DESC');
    return rows.map((n) => ({
      type: n.type, token: n.token, name: n.name, company: n.company,
      text: n.text, section: n.section, ts: Number(n.ts)
    }));
  },

  async clearNotifications() { await run('DELETE FROM notifications'); },

  // demo helper: wipe everything
  async reset() {
    await client.batch([
      'DELETE FROM notifications',
      'DELETE FROM questions',
      'DELETE FROM events',
      'DELETE FROM section_ms',
      'DELETE FROM visits',
      'DELETE FROM prospects'
    ], 'write');
  }
};

module.exports = API;
