/* Local dev launcher — sets safe defaults so the app boots without real secrets,
   then starts the normal server. Used by .claude/launch.json for preview only. */
process.env.DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'localdevsecret';
process.env.PORT = process.env.PORT || '3000';
require('../server/index.js');
