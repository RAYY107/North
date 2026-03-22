// src/api.js — North Bot Internal API Server
// The website (NorthStore) talks to this to read/write bot config
// Runs on port 4000 alongside the bot process

'use strict';

const http        = require('http');
const db          = require('./database');

const PORT        = parseInt(process.env.BOT_API_PORT || '4000');
const API_SECRET  = process.env.BOT_API_SECRET || 'north_bot_api_secret_change_me';

// ── tiny helpers ─────────────────────────────────────────────
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1e6) reject(new Error('Too large')); });
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Bad JSON')); } });
    req.on('error', reject);
  });
}

function send(res, status, data) {
  const json = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(json) });
  res.end(json);
}

function auth(req, res) {
  const header = req.headers['x-api-secret'] || req.headers['authorization']?.replace('Bearer ', '');
  if (header !== API_SECRET) { send(res, 401, { error: 'Unauthorized' }); return false; }
  return true;
}

// ── route handlers ────────────────────────────────────────────

function routeHealth(req, res) {
  let guilds = 'n/a';
  try { guilds = require('./index').getClient?.()?.guilds?.cache?.size ?? 'n/a'; } catch {}
  send(res, 200, { ok: true, guilds });
}

function routeGuild(req, res, guildId) {
  const cfg       = db.getGuildConfig(guildId);
  const automod   = db.get('SELECT * FROM automod_config WHERE guild_id = ?',  guildId) || {};
  const welcome   = db.get('SELECT * FROM welcome_config WHERE guild_id = ?',  guildId) || {};
  const logging   = db.get('SELECT * FROM log_config WHERE guild_id = ?',      guildId) || {};
  const levelCfg  = db.get('SELECT * FROM level_config WHERE guild_id = ?',    guildId) || {};
  const ticketCfg = db.get('SELECT * FROM ticket_config WHERE guild_id = ?',   guildId) || {};

  const memberCount     = db.all('SELECT COUNT(*) as c FROM levels WHERE guild_id = ?', guildId)[0]?.c ?? 0;
  const topLevels       = db.all('SELECT user_id, xp, level FROM levels WHERE guild_id = ? ORDER BY xp DESC LIMIT 5', guildId);
  const topEconomy      = db.all('SELECT user_id, wallet+bank as total FROM economy WHERE guild_id = ? ORDER BY total DESC LIMIT 5', guildId);
  const openTickets     = db.all("SELECT COUNT(*) as c FROM tickets WHERE guild_id = ? AND status = 'open'", guildId)[0]?.c ?? 0;
  const modCases        = db.all('SELECT COUNT(*) as c FROM mod_cases WHERE guild_id = ?', guildId)[0]?.c ?? 0;
  const activeGiveaways = db.all("SELECT COUNT(*) as c FROM giveaways WHERE guild_id = ? AND status = 'active'", guildId)[0]?.c ?? 0;

  send(res, 200, {
    config: cfg, automod, welcome, logging, levelCfg, ticketCfg,
    stats: { memberCount, openTickets, modCases, activeGiveaways, topLevels, topEconomy },
  });
}

async function routeUpdateGuildConfig(req, res, guildId) {
  const body = await parseBody(req);
  for (const [field, value] of Object.entries(body)) {
    try { db.setGuildField(guildId, field, value); } catch {}
  }
  send(res, 200, { success: true });
}

async function routeUpdateAutomod(req, res, guildId) {
  const body = await parseBody(req);
  if (!db.get('SELECT guild_id FROM automod_config WHERE guild_id = ?', guildId)) {
    db.run('INSERT INTO automod_config (guild_id) VALUES (?)', guildId);
  }
  const allowed = ['enabled','anti_spam','spam_threshold','spam_interval','anti_links','anti_invites',
    'anti_caps','caps_threshold','anti_emoji','emoji_threshold','anti_mentions','mention_threshold',
    'anti_zalgo','word_filter','banned_words','whitelist_channels','whitelist_roles','log_channel','action','dm_user'];
  for (const [k, v] of Object.entries(body)) {
    if (!allowed.includes(k)) continue;
    db.run(`UPDATE automod_config SET ${k} = ? WHERE guild_id = ?`, typeof v === 'object' ? JSON.stringify(v) : v, guildId);
  }
  send(res, 200, { success: true });
}

async function routeUpdateWelcome(req, res, guildId) {
  const body = await parseBody(req);
  if (!db.get('SELECT guild_id FROM welcome_config WHERE guild_id = ?', guildId)) {
    db.run('INSERT INTO welcome_config (guild_id) VALUES (?)', guildId);
  }
  const allowed = ['welcome_channel','welcome_msg','welcome_card','welcome_dm','leave_channel','leave_msg','embed_color','background'];
  for (const [k, v] of Object.entries(body)) {
    if (!allowed.includes(k)) continue;
    db.run(`UPDATE welcome_config SET ${k} = ? WHERE guild_id = ?`, v, guildId);
  }
  send(res, 200, { success: true });
}

async function routeUpdateLogging(req, res, guildId) {
  const body = await parseBody(req);
  if (!db.get('SELECT guild_id FROM log_config WHERE guild_id = ?', guildId)) {
    db.run('INSERT INTO log_config (guild_id) VALUES (?)', guildId);
  }
  const allowed = ['enabled','log_channel','msg_edit','msg_delete','member_join','member_leave',
    'member_ban','member_unban','member_kick','role_create','role_delete','role_update',
    'channel_create','channel_delete','voice_join','voice_leave','voice_move',
    'invite_create','invite_delete','nickname_change','ignored_channels'];
  for (const [k, v] of Object.entries(body)) {
    if (!allowed.includes(k)) continue;
    db.run(`UPDATE log_config SET ${k} = ? WHERE guild_id = ?`, typeof v === 'object' ? JSON.stringify(v) : v, guildId);
  }
  send(res, 200, { success: true });
}

async function routeUpdateLeveling(req, res, guildId) {
  const body = await parseBody(req);
  if (!db.get('SELECT guild_id FROM level_config WHERE guild_id = ?', guildId)) {
    db.run('INSERT INTO level_config (guild_id) VALUES (?)', guildId);
  }
  const allowed = ['xp_min','xp_max','xp_cooldown','no_xp_channels','no_xp_roles','multiplier','stack_roles'];
  for (const [k, v] of Object.entries(body)) {
    if (!allowed.includes(k)) continue;
    db.run(`UPDATE level_config SET ${k} = ? WHERE guild_id = ?`, typeof v === 'object' ? JSON.stringify(v) : v, guildId);
  }
  if (body.level_channel !== undefined) db.setGuildField(guildId, 'level_channel', body.level_channel);
  send(res, 200, { success: true });
}

async function routeUpdateTickets(req, res, guildId) {
  const body = await parseBody(req);
  if (!db.get('SELECT guild_id FROM ticket_config WHERE guild_id = ?', guildId)) {
    db.run('INSERT INTO ticket_config (guild_id) VALUES (?)', guildId);
  }
  const allowed = ['category_id','log_channel','support_role','max_tickets','welcome_msg'];
  for (const [k, v] of Object.entries(body)) {
    if (!allowed.includes(k)) continue;
    db.run(`UPDATE ticket_config SET ${k} = ? WHERE guild_id = ?`, v, guildId);
  }
  send(res, 200, { success: true });
}

async function routeToggleModule(req, res, guildId) {
  const body = await parseBody(req);
  const { module, enabled } = body;
  if (!module) return send(res, 400, { error: 'module required' });
  const cfg = db.getGuildConfig(guildId);
  let disabled = cfg.modules_disabled || [];
  if (enabled) { disabled = disabled.filter(m => m !== module); }
  else { if (!disabled.includes(module)) disabled.push(module); }
  db.run('UPDATE guild_config SET modules_disabled = ? WHERE guild_id = ?', JSON.stringify(disabled), guildId);
  send(res, 200, { success: true, modules_disabled: disabled });
}

function routeModCases(req, res, guildId) {
  send(res, 200, db.all('SELECT * FROM mod_cases WHERE guild_id = ? ORDER BY case_num DESC LIMIT 50', guildId));
}

function routeLevels(req, res, guildId) {
  send(res, 200, db.all('SELECT user_id, xp, level, messages FROM levels WHERE guild_id = ? ORDER BY xp DESC LIMIT 50', guildId));
}

function routeEconomy(req, res, guildId) {
  send(res, 200, db.all('SELECT user_id, wallet, bank, total_earned FROM economy WHERE guild_id = ? ORDER BY (wallet+bank) DESC LIMIT 50', guildId));
}

function routeGiveaways(req, res, guildId) {
  send(res, 200, db.all('SELECT * FROM giveaways WHERE guild_id = ? ORDER BY created_at DESC LIMIT 20', guildId));
}

// ── main router ───────────────────────────────────────────────
async function handleRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Secret, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = req.url.split('?')[0];
  if (url !== '/health' && !auth(req, res)) return;

  try {
    const parts = url.split('/').filter(Boolean);

    if (req.method === 'GET' && url === '/health') return routeHealth(req, res);

    if (parts[0] === 'guild' && parts[1]) {
      const guildId = parts[1];
      const section = parts[2];

      if (req.method === 'GET' && !section)                 return routeGuild(req, res, guildId);
      if (req.method === 'POST' && section === 'config')    return routeUpdateGuildConfig(req, res, guildId);
      if (req.method === 'POST' && section === 'automod')   return routeUpdateAutomod(req, res, guildId);
      if (req.method === 'POST' && section === 'welcome')   return routeUpdateWelcome(req, res, guildId);
      if (req.method === 'POST' && section === 'logging')   return routeUpdateLogging(req, res, guildId);
      if (req.method === 'POST' && section === 'leveling')  return routeUpdateLeveling(req, res, guildId);
      if (req.method === 'POST' && section === 'tickets')   return routeUpdateTickets(req, res, guildId);
      if (req.method === 'POST' && section === 'modules')   return routeToggleModule(req, res, guildId);
      if (req.method === 'GET'  && section === 'modcases')  return routeModCases(req, res, guildId);
      if (req.method === 'GET'  && section === 'levels')    return routeLevels(req, res, guildId);
      if (req.method === 'GET'  && section === 'economy')   return routeEconomy(req, res, guildId);
      if (req.method === 'GET'  && section === 'giveaways') return routeGiveaways(req, res, guildId);
    }

    send(res, 404, { error: 'Not found' });
  } catch (e) {
    console.error('[BotAPI] Error:', e.message);
    send(res, 500, { error: e.message });
  }
}

// ── start — handles port conflicts gracefully ─────────────────
function startBotApi(attemptPort) {
  const port   = attemptPort || PORT;
  const server = http.createServer(handleRequest);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`\x1b[33m[BotAPI] ⚠️  Port ${port} in use — trying ${port + 1}\x1b[0m`);
      // Retry on next port
      setTimeout(() => startBotApi(port + 1), 100);
    } else {
      console.error('\x1b[31m[BotAPI] Fatal error:', err.message, '\x1b[0m');
    }
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`\x1b[36m[BotAPI] ✅ Bot API running on http://127.0.0.1:${port}\x1b[0m`);
    console.log(`\x1b[90m[BotAPI] 🔑 Secret: ${API_SECRET.slice(0, 8)}...\x1b[0m`);
  });

  return server;
}

module.exports = { startBotApi };
