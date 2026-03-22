// src/database.js
// Central SQLite database for North Bot
// Developed by Rayy @qwxlr | North Store

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './data/north.db';
const dataDir = path.dirname(path.resolve(DB_PATH));
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec(`
  -- ── Guild Config ──────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS guild_config (
    guild_id         TEXT PRIMARY KEY,
    prefix           TEXT DEFAULT '!',
    language         TEXT DEFAULT 'en',
    mod_log_channel  TEXT,
    log_channel      TEXT,
    welcome_channel  TEXT,
    leave_channel    TEXT,
    ticket_category  TEXT,
    ticket_log       TEXT,
    level_channel    TEXT,
    announce_channel TEXT,
    mute_role        TEXT,
    autorole         TEXT,
    autorole_bots    TEXT,
    modules_disabled TEXT DEFAULT '[]',
    ignored_channels TEXT DEFAULT '[]',
    ignored_roles    TEXT DEFAULT '[]'
  );

  -- ── Moderation ────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS mod_cases (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id    TEXT NOT NULL,
    case_num    INTEGER NOT NULL,
    type        TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    mod_id      TEXT NOT NULL,
    reason      TEXT DEFAULT 'No reason provided',
    duration    INTEGER,
    created_at  INTEGER NOT NULL,
    active      INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS warns (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    mod_id     TEXT NOT NULL,
    reason     TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    mod_id     TEXT NOT NULL,
    note       TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  -- ── Leveling ──────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS levels (
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    xp         INTEGER DEFAULT 0,
    level      INTEGER DEFAULT 0,
    messages   INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS level_rewards (
    guild_id TEXT NOT NULL,
    level    INTEGER NOT NULL,
    role_id  TEXT NOT NULL,
    PRIMARY KEY (guild_id, level)
  );

  CREATE TABLE IF NOT EXISTS level_config (
    guild_id      TEXT PRIMARY KEY,
    xp_min        INTEGER DEFAULT 15,
    xp_max        INTEGER DEFAULT 25,
    xp_cooldown   INTEGER DEFAULT 60,
    no_xp_channels TEXT DEFAULT '[]',
    no_xp_roles    TEXT DEFAULT '[]',
    multiplier     REAL DEFAULT 1.0,
    stack_roles    INTEGER DEFAULT 0
  );

  -- ── Economy ───────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS economy (
    guild_id     TEXT NOT NULL,
    user_id      TEXT NOT NULL,
    wallet       INTEGER DEFAULT 0,
    bank         INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    last_daily   INTEGER DEFAULT 0,
    last_weekly  INTEGER DEFAULT 0,
    last_work    INTEGER DEFAULT 0,
    last_crime   INTEGER DEFAULT 0,
    last_rob     INTEGER DEFAULT 0,
    last_fish    INTEGER DEFAULT 0,
    last_hunt    INTEGER DEFAULT 0,
    last_mine    INTEGER DEFAULT 0,
    streak_daily INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    item_id  TEXT NOT NULL,
    quantity INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS shop_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id    TEXT NOT NULL,
    item_id     TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    price       INTEGER NOT NULL,
    role_id     TEXT,
    type        TEXT DEFAULT 'item',
    stock       INTEGER DEFAULT -1,
    emoji       TEXT DEFAULT '📦'
  );

  -- ── Voice Tracking ────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS voice_sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    join_time  INTEGER NOT NULL,
    leave_time INTEGER,
    duration   INTEGER
  );

  CREATE TABLE IF NOT EXISTS voice_totals (
    guild_id      TEXT NOT NULL,
    user_id       TEXT NOT NULL,
    total_seconds INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS voice_config (
    guild_id          TEXT PRIMARY KEY,
    announce_channel  TEXT,
    announce_milestones INTEGER DEFAULT 0,
    announce_weekly   INTEGER DEFAULT 0,
    announce_new_top  INTEGER DEFAULT 0,
    weekly_day        INTEGER DEFAULT 1,
    weekly_hour       INTEGER DEFAULT 9,
    ignored_channels  TEXT DEFAULT '[]',
    ignored_roles     TEXT DEFAULT '[]'
  );

  -- ── Tickets ───────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS tickets (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id     TEXT NOT NULL,
    channel_id   TEXT NOT NULL,
    user_id      TEXT NOT NULL,
    ticket_num   INTEGER NOT NULL,
    status       TEXT DEFAULT 'open',
    claimed_by   TEXT,
    topic        TEXT,
    created_at   INTEGER NOT NULL,
    closed_at    INTEGER
  );

  CREATE TABLE IF NOT EXISTS ticket_config (
    guild_id       TEXT PRIMARY KEY,
    category_id    TEXT,
    log_channel    TEXT,
    support_role   TEXT,
    max_tickets    INTEGER DEFAULT 1,
    welcome_msg    TEXT DEFAULT 'Welcome! Support will be with you shortly.',
    panel_channel  TEXT,
    panel_msg_id   TEXT
  );

  -- ── Giveaways ─────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS giveaways (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id     TEXT NOT NULL,
    channel_id   TEXT NOT NULL,
    message_id   TEXT,
    prize        TEXT NOT NULL,
    winners      INTEGER DEFAULT 1,
    host_id      TEXT NOT NULL,
    end_time     INTEGER NOT NULL,
    req_role     TEXT,
    req_level    INTEGER DEFAULT 0,
    entries      TEXT DEFAULT '[]',
    status       TEXT DEFAULT 'active',
    winner_ids   TEXT DEFAULT '[]',
    created_at   INTEGER NOT NULL
  );

  -- ── AutoMod ───────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS automod_config (
    guild_id          TEXT PRIMARY KEY,
    enabled           INTEGER DEFAULT 0,
    anti_spam         INTEGER DEFAULT 0,
    spam_threshold    INTEGER DEFAULT 5,
    spam_interval     INTEGER DEFAULT 5,
    anti_links        INTEGER DEFAULT 0,
    anti_invites      INTEGER DEFAULT 0,
    anti_caps         INTEGER DEFAULT 0,
    caps_threshold    INTEGER DEFAULT 70,
    anti_emoji        INTEGER DEFAULT 0,
    emoji_threshold   INTEGER DEFAULT 10,
    anti_mentions     INTEGER DEFAULT 0,
    mention_threshold INTEGER DEFAULT 5,
    anti_zalgo        INTEGER DEFAULT 0,
    word_filter       INTEGER DEFAULT 0,
    banned_words      TEXT DEFAULT '[]',
    whitelist_channels TEXT DEFAULT '[]',
    whitelist_roles   TEXT DEFAULT '[]',
    log_channel       TEXT,
    action            TEXT DEFAULT 'warn',
    dm_user           INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS spam_tracker (
    guild_id    TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    messages    TEXT DEFAULT '[]',
    PRIMARY KEY (guild_id, user_id)
  );

  -- ── Welcome / Leave ───────────────────────────────────────
  CREATE TABLE IF NOT EXISTS welcome_config (
    guild_id       TEXT PRIMARY KEY,
    welcome_channel TEXT,
    welcome_msg    TEXT DEFAULT 'Welcome {user} to {server}!',
    welcome_card   INTEGER DEFAULT 1,
    welcome_dm     TEXT,
    leave_channel  TEXT,
    leave_msg      TEXT DEFAULT '{user} left the server.',
    embed_color    TEXT DEFAULT '#5865F2',
    background     TEXT DEFAULT 'default'
  );

  -- ── Reaction Roles ────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS reaction_roles (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id   TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    emoji      TEXT NOT NULL,
    role_id    TEXT NOT NULL,
    type       TEXT DEFAULT 'toggle'
  );

  CREATE TABLE IF NOT EXISTS button_roles (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id   TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    label      TEXT NOT NULL,
    emoji      TEXT,
    role_id    TEXT NOT NULL,
    style      TEXT DEFAULT 'Secondary',
    type       TEXT DEFAULT 'toggle'
  );

  CREATE TABLE IF NOT EXISTS select_roles (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id     TEXT NOT NULL,
    channel_id   TEXT NOT NULL,
    message_id   TEXT NOT NULL,
    placeholder  TEXT DEFAULT 'Select a role',
    roles        TEXT DEFAULT '[]'
  );

  -- ── Logging ───────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS log_config (
    guild_id          TEXT PRIMARY KEY,
    enabled           INTEGER DEFAULT 0,
    log_channel       TEXT,
    msg_edit          INTEGER DEFAULT 1,
    msg_delete        INTEGER DEFAULT 1,
    member_join       INTEGER DEFAULT 1,
    member_leave      INTEGER DEFAULT 1,
    member_ban        INTEGER DEFAULT 1,
    member_unban      INTEGER DEFAULT 1,
    member_kick       INTEGER DEFAULT 1,
    role_create       INTEGER DEFAULT 1,
    role_delete       INTEGER DEFAULT 1,
    role_update       INTEGER DEFAULT 1,
    channel_create    INTEGER DEFAULT 1,
    channel_delete    INTEGER DEFAULT 1,
    voice_join        INTEGER DEFAULT 1,
    voice_leave       INTEGER DEFAULT 1,
    voice_move        INTEGER DEFAULT 1,
    invite_create     INTEGER DEFAULT 1,
    invite_delete     INTEGER DEFAULT 1,
    nickname_change   INTEGER DEFAULT 1,
    ignored_channels  TEXT DEFAULT '[]'
  );

  -- ── Snipe ─────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS snipe (
    guild_id    TEXT NOT NULL,
    channel_id  TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    content     TEXT,
    attachment  TEXT,
    deleted_at  INTEGER NOT NULL,
    PRIMARY KEY (guild_id, channel_id)
  );

  CREATE TABLE IF NOT EXISTS edit_snipe (
    guild_id    TEXT NOT NULL,
    channel_id  TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    before      TEXT,
    after       TEXT,
    edited_at   INTEGER NOT NULL,
    PRIMARY KEY (guild_id, channel_id)
  );

  -- ── AFK ───────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS afk (
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    reason     TEXT DEFAULT 'AFK',
    set_at     INTEGER NOT NULL,
    PRIMARY KEY (guild_id, user_id)
  );

  -- ── Reminders ─────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS reminders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id   TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message    TEXT NOT NULL,
    remind_at  INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    done       INTEGER DEFAULT 0
  );

  -- ── Announcements ─────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS scheduled_announcements (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id    TEXT NOT NULL,
    channel_id  TEXT NOT NULL,
    content     TEXT NOT NULL,
    cron        TEXT NOT NULL,
    role_ping   TEXT,
    created_by  TEXT NOT NULL,
    active      INTEGER DEFAULT 1
  );

  -- ── Indexes ───────────────────────────────────────────────
  CREATE INDEX IF NOT EXISTS idx_levels_guild   ON levels (guild_id);
  CREATE INDEX IF NOT EXISTS idx_economy_guild  ON economy (guild_id);
  CREATE INDEX IF NOT EXISTS idx_voice_guild    ON voice_sessions (guild_id);
  CREATE INDEX IF NOT EXISTS idx_warns_guild    ON warns (guild_id, user_id);
  CREATE INDEX IF NOT EXISTS idx_cases_guild    ON mod_cases (guild_id);
  CREATE INDEX IF NOT EXISTS idx_tickets_guild  ON tickets (guild_id);
  CREATE INDEX IF NOT EXISTS idx_giveaways_end  ON giveaways (end_time);
`);

// ──────────────────────────────────────────────────────────────
//  Generic helpers
// ──────────────────────────────────────────────────────────────
function run(sql, ...p)  { return db.prepare(sql).run(...p); }
function get(sql, ...p)  { return db.prepare(sql).get(...p); }
function all(sql, ...p)  { return db.prepare(sql).all(...p); }

// ──────────────────────────────────────────────────────────────
//  Guild config
// ──────────────────────────────────────────────────────────────
function getGuildConfig(guildId) {
  let row = get('SELECT * FROM guild_config WHERE guild_id = ?', guildId);
  if (!row) {
    run('INSERT OR IGNORE INTO guild_config (guild_id) VALUES (?)', guildId);
    row = get('SELECT * FROM guild_config WHERE guild_id = ?', guildId);
  }
  return {
    ...row,
    modules_disabled: JSON.parse(row.modules_disabled || '[]'),
    ignored_channels: JSON.parse(row.ignored_channels || '[]'),
    ignored_roles:    JSON.parse(row.ignored_roles    || '[]'),
  };
}

function setGuildField(guildId, field, value) {
  getGuildConfig(guildId);
  run(`UPDATE guild_config SET ${field} = ? WHERE guild_id = ?`, value, guildId);
}

// ──────────────────────────────────────────────────────────────
//  Economy helpers
// ──────────────────────────────────────────────────────────────
function getEconomy(guildId, userId) {
  let row = get('SELECT * FROM economy WHERE guild_id = ? AND user_id = ?', guildId, userId);
  if (!row) {
    run('INSERT OR IGNORE INTO economy (guild_id, user_id) VALUES (?, ?)', guildId, userId);
    row = get('SELECT * FROM economy WHERE guild_id = ? AND user_id = ?', guildId, userId);
  }
  return row;
}

function addCoins(guildId, userId, amount) {
  getEconomy(guildId, userId);
  run('UPDATE economy SET wallet = wallet + ?, total_earned = total_earned + ? WHERE guild_id = ? AND user_id = ?',
    amount, amount > 0 ? amount : 0, guildId, userId);
}

function removeCoins(guildId, userId, amount) {
  getEconomy(guildId, userId);
  run('UPDATE economy SET wallet = MAX(0, wallet - ?) WHERE guild_id = ? AND user_id = ?', amount, guildId, userId);
}

// ──────────────────────────────────────────────────────────────
//  Level helpers
// ──────────────────────────────────────────────────────────────
function getLevels(guildId, userId) {
  let row = get('SELECT * FROM levels WHERE guild_id = ? AND user_id = ?', guildId, userId);
  if (!row) {
    run('INSERT OR IGNORE INTO levels (guild_id, user_id) VALUES (?, ?)', guildId, userId);
    row = get('SELECT * FROM levels WHERE guild_id = ? AND user_id = ?', guildId, userId);
  }
  return row;
}

function xpForLevel(level) { return Math.floor(100 * Math.pow(1.5, level)); }

function addXP(guildId, userId, amount) {
  const data = getLevels(guildId, userId);
  let cfg = get('SELECT * FROM level_config WHERE guild_id = ?', guildId);
  const multiplier = cfg?.multiplier || 1.0;
  const totalXP = data.xp + Math.floor(amount * multiplier);
  let level = data.level;
  let leveled = false;

  while (totalXP >= xpForLevel(level + 1)) {
    level++;
    leveled = true;
  }

  run('UPDATE levels SET xp = ?, level = ?, messages = messages + 1 WHERE guild_id = ? AND user_id = ?',
    totalXP, level, guildId, userId);
  return { leveled, newLevel: level, oldLevel: data.level };
}

// ──────────────────────────────────────────────────────────────
//  Voice helpers
// ──────────────────────────────────────────────────────────────
function joinVoice(guildId, userId) {
  const now = Math.floor(Date.now() / 1000);
  // Close any open sessions
  const open = all('SELECT id, join_time FROM voice_sessions WHERE guild_id = ? AND user_id = ? AND leave_time IS NULL', guildId, userId);
  for (const s of open) {
    const dur = Math.max(0, now - s.join_time);
    run('UPDATE voice_sessions SET leave_time = ?, duration = ? WHERE id = ?', now, dur, s.id);
    run('INSERT INTO voice_totals (guild_id, user_id, total_seconds) VALUES (?, ?, ?) ON CONFLICT (guild_id, user_id) DO UPDATE SET total_seconds = total_seconds + excluded.total_seconds', guildId, userId, dur);
  }
  run('INSERT INTO voice_sessions (guild_id, user_id, join_time) VALUES (?, ?, ?)', guildId, userId, now);
}

function leaveVoice(guildId, userId) {
  const now = Math.floor(Date.now() / 1000);
  const session = get('SELECT id, join_time FROM voice_sessions WHERE guild_id = ? AND user_id = ? AND leave_time IS NULL ORDER BY join_time DESC LIMIT 1', guildId, userId);
  if (!session) return 0;
  const duration = Math.max(0, now - session.join_time);
  run('UPDATE voice_sessions SET leave_time = ?, duration = ? WHERE id = ?', now, duration, session.id);
  run('INSERT INTO voice_totals (guild_id, user_id, total_seconds) VALUES (?, ?, ?) ON CONFLICT (guild_id, user_id) DO UPDATE SET total_seconds = total_seconds + excluded.total_seconds', guildId, userId, duration);
  return duration;
}

function closeAllOpenVoice() {
  const now = Math.floor(Date.now() / 1000);
  const open = all('SELECT id, guild_id, user_id, join_time FROM voice_sessions WHERE leave_time IS NULL');
  for (const s of open) {
    const dur = Math.max(0, now - s.join_time);
    run('UPDATE voice_sessions SET leave_time = ?, duration = ? WHERE id = ?', now, dur, s.id);
    run('INSERT INTO voice_totals (guild_id, user_id, total_seconds) VALUES (?, ?, ?) ON CONFLICT (guild_id, user_id) DO UPDATE SET total_seconds = total_seconds + excluded.total_seconds', s.guild_id, s.user_id, dur);
  }
  return open.length;
}

// ──────────────────────────────────────────────────────────────
//  Mod case helpers
// ──────────────────────────────────────────────────────────────
function newCase(guildId, type, userId, modId, reason, duration = null) {
  const lastCase = get('SELECT MAX(case_num) as n FROM mod_cases WHERE guild_id = ?', guildId);
  const caseNum = (lastCase?.n || 0) + 1;
  run('INSERT INTO mod_cases (guild_id, case_num, type, user_id, mod_id, reason, duration, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    guildId, caseNum, type, userId, modId, reason, duration, Math.floor(Date.now() / 1000));
  return caseNum;
}

module.exports = {
  db, run, get, all,
  getGuildConfig, setGuildField,
  getEconomy, addCoins, removeCoins,
  getLevels, addXP, xpForLevel,
  joinVoice, leaveVoice, closeAllOpenVoice,
  newCase,
};
