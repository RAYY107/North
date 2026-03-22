// src/index.js
// North Bot — Main Entry Point
// Developed by Rayy @qwxlr | North Store

require('dotenv').config();
const figlet = require('figlet');

figlet('NORTH', { font: 'Banner3' }, (err, data) => {
  if (!err) console.log('\x1b[36m%s\x1b[0m', data);
  console.log('\x1b[90m=====================================\x1b[0m');
  console.log('\x1b[35m          NORTH R8aba — All-in-One  \x1b[0m');
  console.log('\x1b[33m  Developed By Rayy @qwxlr | North Store  \x1b[0m');
  console.log('\x1b[90m=====================================\x1b[0m');
  console.log('\x1b[32mVersion: 1.0.0\x1b[0m');
  console.log('\x1b[32mStatus:  Starting...\x1b[0m');
  console.log('\x1b[90m=====================================\x1b[0m\n');
});

const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
} = require('discord.js');

const db          = require('./database');
const { loadCommands } = require('./loader');
const { error }   = require('./utils/embed');
const { startBotApi } = require('./api'); // ← Bot API server

// ── Start internal API server ────────────────────────────────
startBotApi();

// ── Expose client for API health check ───────────────────────
let _client = null;
function getClient() { return _client; }
module.exports.getClient = getClient;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildInvites,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
    Partials.GuildMember,
  ],
});

// ── Load commands ───────────────────────────────────────────
loadCommands(client);

// ── Ready ───────────────────────────────────────────────────
client.once(Events.ClientReady, async () => {
  _client = client; // expose for API
  const closed = db.closeAllOpenVoice();

  // Pre-initialise config for every guild already in the cache
  let initialized = 0;
  for (const guild of client.guilds.cache.values()) {
    try { db.getGuildConfig(guild.id); initialized++; } catch {}
  }

  const deployMode = process.env.GUILD_ID ? `guild ${process.env.GUILD_ID} only` : 'global (all servers)';
  console.log(`\x1b[32m[Bot] ✅ Logged in as ${client.user.tag}\x1b[0m`);
  console.log(`\x1b[32m[Bot] 📡 Serving ${client.guilds.cache.size} server(s) — ${deployMode}\x1b[0m`);
  console.log(`\x1b[32m[Bot] ⚡ ${client.commands.size} commands loaded\x1b[0m`);
  console.log(`\x1b[32m[Bot] 🗄️  Pre-initialized config for ${initialized} guild(s)\x1b[0m`);
  if (closed) console.log(`\x1b[33m[Bot] 🔧 Closed ${closed} dangling voice session(s)\x1b[0m`);

  // Rotating status
  const statuses = [
    { name: `${client.guilds.cache.size} servers`, type: 3 },
    { name: '🎙️ Tracking voice time', type: 3 },
    { name: '/help for commands', type: 2 },
    { name: 'North Store', type: 0 },
  ];
  let i = 0;
  const rotate = () => {
    client.user.setActivity(statuses[i].name, { type: statuses[i].type });
    i = (i + 1) % statuses.length;
  };
  rotate();
  setInterval(rotate, 30_000);

  setInterval(() => checkReminders(client), 15_000);
  setInterval(() => checkGiveaways(client), 10_000);

  console.log(`\x1b[32m[Bot] 🚀 North Bot is ready!\x1b[0m`);
});

// ── Slash command & button handler ──────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      const cfg = db.getGuildConfig(interaction.guildId);
      if (cfg.modules_disabled?.includes(command.module)) {
        return interaction.reply({
          embeds: [error('Module Disabled', `The **${command.module}** module is disabled in this server.`)],
          ephemeral: true,
        });
      }
    } catch {}
    try {
      await command.execute(interaction, client);
    } catch (err) {
      console.error(`\x1b[31m[CMD Error] /${interaction.commandName}:`, err.message, '\x1b[0m');
      const msg = { embeds: [error('Error', 'Something went wrong. Please try again.')], ephemeral: true };
      if (interaction.deferred || interaction.replied) interaction.editReply(msg).catch(() => {});
      else interaction.reply(msg).catch(() => {});
    }
  }

  if (interaction.isButton()) {
    const prefix = interaction.customId.split(':')[0];
    const command = client.commands.get(prefix) ||
                    client.commands.get(interaction.customId.split('_')[0]);
    if (command?.handleButton) {
      try { await command.handleButton(interaction, client); } catch {}
    }
    await handleGlobalButtons(interaction, client);
  }

  if (interaction.isStringSelectMenu()) {
    const helpCmd = client.commands.get('help');
    if (helpCmd?.handleButton && interaction.customId === 'help_select') {
      try { await helpCmd.handleButton(interaction, client); } catch {}
    }
    if (interaction.customId.startsWith('role_select')) {
      try { require('./modules/reactionroles/_handler').onSelect(interaction, client); } catch {}
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;
  try { require('./modules/automod/_handler').onMessage(message, client); } catch {}
  try { require('./modules/leveling/_xp').onMessage(message, client); } catch {}
  try { require('./modules/utility/_afk').onMessage(message, client); } catch {}
});

client.on(Events.MessageDelete, async (message) => {
  if (!message.guild || message.author?.bot) return;
  try { require('./modules/logging/_events').onMessageDelete(message, client); } catch {}
  if (message.content || message.attachments?.size) {
    db.run(
      'INSERT OR REPLACE INTO snipe (guild_id, channel_id, user_id, content, attachment, deleted_at) VALUES (?, ?, ?, ?, ?, ?)',
      message.guild.id, message.channel.id, message.author?.id,
      message.content || '',
      message.attachments?.first()?.url || null,
      Math.floor(Date.now() / 1000)
    );
  }
});

client.on(Events.MessageUpdate, async (oldMsg, newMsg) => {
  if (!oldMsg.guild || oldMsg.author?.bot) return;
  try { require('./modules/logging/_events').onMessageEdit(oldMsg, newMsg, client); } catch {}
  if (oldMsg.content && oldMsg.content !== newMsg.content) {
    db.run(
      'INSERT OR REPLACE INTO edit_snipe (guild_id, channel_id, user_id, before, after, edited_at) VALUES (?, ?, ?, ?, ?, ?)',
      oldMsg.guild.id, oldMsg.channel.id, oldMsg.author?.id,
      oldMsg.content, newMsg.content, Math.floor(Date.now() / 1000)
    );
  }
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  if (newState.member?.user?.bot) return;
  try { require('./modules/voice/_tracker').onVoiceUpdate(oldState, newState, client); } catch {}
  try { require('./modules/logging/_events').onVoiceUpdate(oldState, newState, client); } catch {}
});

// ── New guild joined — initialise its config row immediately ──
client.on(Events.GuildCreate, (guild) => {
  try {
    db.getGuildConfig(guild.id); // creates a fresh row with all defaults
    console.log(`\x1b[36m[Bot] 🆕 Joined guild: ${guild.name} (${guild.id}) — config initialised\x1b[0m`);
  } catch (err) {
    console.error(`\x1b[31m[Bot] Failed to init config for ${guild.id}:`, err.message, '\x1b[0m');
  }
});

// ── Guild removed ────────────────────────────────────────────
client.on(Events.GuildDelete, (guild) => {
  console.log(`\x1b[33m[Bot] 👋 Removed from guild: ${guild.name} (${guild.id})\x1b[0m`);
  // Data is retained so it's available if the bot is re-added.
  // To auto-wipe, uncomment the line below:
  // db.run('DELETE FROM guild_config WHERE guild_id = ?', guild.id);
});

client.on(Events.GuildMemberAdd, async (member) => {
  try { require('./modules/welcome/_handler').onJoin(member, client); } catch {}
  try { require('./modules/logging/_events').onMemberJoin(member, client); } catch {}
  try { require('./modules/leveling/_xp').onJoin(member); } catch {}
});

// ── New guild joined — initialise its config row immediately ──
client.on(Events.GuildCreate, (guild) => {
  try {
    db.getGuildConfig(guild.id); // creates a fresh row with all defaults
    console.log(`\x1b[36m[Bot] 🆕 Joined guild: ${guild.name} (${guild.id}) — config initialised\x1b[0m`);
  } catch (err) {
    console.error(`\x1b[31m[Bot] Failed to init config for ${guild.id}:`, err.message, '\x1b[0m');
  }
});

// ── Guild removed ────────────────────────────────────────────
client.on(Events.GuildDelete, (guild) => {
  console.log(`\x1b[33m[Bot] 👋 Left guild: ${guild.name} (${guild.id})\x1b[0m`);
  // Data is kept by default so it's restored if the bot is re-added.
  // To auto-wipe instead, uncomment the block below:
  // const tables = ['guild_config','mod_cases','warns','notes','levels','level_rewards',
  //   'level_config','economy','inventory','shop_items','voice_sessions','voice_totals',
  //   'voice_config','tickets','ticket_config','giveaways','automod_config','welcome_config',
  //   'reaction_roles','button_roles','select_roles','log_config','snipe','edit_snipe',
  //   'afk','reminders','scheduled_announcements'];
  // for (const t of tables) { try { db.run(`DELETE FROM ${t} WHERE guild_id = ?`, guild.id); } catch {} }
});

client.on(Events.GuildMemberRemove, async (member) => {
  try { require('./modules/welcome/_handler').onLeave(member, client); } catch {}
  try { require('./modules/logging/_events').onMemberLeave(member, client); } catch {}
});

client.on(Events.GuildBanAdd,    async (ban) => { try { require('./modules/logging/_events').onBanAdd(ban, client); }    catch {} });
client.on(Events.GuildBanRemove, async (ban) => { try { require('./modules/logging/_events').onBanRemove(ban, client); } catch {} });

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  try { require('./modules/reactionroles/_handler').onReactionAdd(reaction, user, client); } catch {}
});
client.on(Events.MessageReactionRemove, async (reaction, user) => {
  try { require('./modules/reactionroles/_handler').onReactionRemove(reaction, user, client); } catch {}
});

async function handleGlobalButtons(interaction, client) {
  const id = interaction.customId;
  if (id.startsWith('ticket:'))   { try { require('./modules/tickets/_handler').onButton(interaction, client); }     catch {} }
  if (id.startsWith('rr:'))       { try { require('./modules/reactionroles/_handler').onButton(interaction, client); } catch {} }
  if (id.startsWith('giveaway:')) { try { require('./modules/giveaways/_handler').onButton(interaction, client); }   catch {} }
  if (id.startsWith('heist:'))    { const c = client.commands.get('heist');    if (c?.handleButton) try { await c.handleButton(interaction, client); } catch {} }
  if (id.startsWith('bj_'))       { const c = client.commands.get('blackjack'); if (c?.handleButton) try { await c.handleButton(interaction, client); } catch {} }
  if (id.startsWith('trivia_'))   { const c = client.commands.get('trivia');   if (c?.handleButton) try { await c.handleButton(interaction, client); } catch {} }
  if (id.startsWith('hm_'))       { const c = client.commands.get('hangman');  if (c?.handleButton) try { await c.handleButton(interaction, client); } catch {} }
  if (id.startsWith('ttt_'))      { const c = client.commands.get('tictactoe'); if (c?.handleButton) try { await c.handleButton(interaction, client); } catch {} }
  if (id.startsWith('c4_'))       { const c = client.commands.get('connect4'); if (c?.handleButton) try { await c.handleButton(interaction, client); } catch {} }
}

async function checkReminders(client) {
  const now = Math.floor(Date.now() / 1000);
  const due = db.all('SELECT * FROM reminders WHERE remind_at <= ? AND done = 0', now);
  for (const r of due) {
    try {
      const ch = await client.channels.fetch(r.channel_id).catch(() => null);
      if (ch) await ch.send({ content: `<@${r.user_id}> ⏰ **Reminder:** ${r.message}` });
      db.run('UPDATE reminders SET done = 1 WHERE id = ?', r.id);
    } catch {}
  }
}

async function checkGiveaways(client) {
  const now   = Math.floor(Date.now() / 1000);
  const ended = db.all("SELECT * FROM giveaways WHERE end_time <= ? AND status = 'active'", now);
  for (const g of ended) {
    try { require('./modules/giveaways/_handler').endGiveaway(g, client); } catch {}
  }
}

if (!process.env.BOT_TOKEN) {
  console.error('\x1b[31m[Bot] ❌ BOT_TOKEN is not set in .env\x1b[0m');
  process.exit(1);
}

client.login(process.env.BOT_TOKEN);
