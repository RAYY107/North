// modules/automod/_handler.js
const db = require('../../database');
const spamMap = new Map();

async function onMessage(message, client) {
  if (!message.guild || message.author.bot || message.member?.permissions.has(8n)) return;

  const cfg = db.get('SELECT * FROM automod_config WHERE guild_id = ?', message.guildId);
  if (!cfg || !cfg.enabled) return;

  const exempt = JSON.parse(cfg.whitelist_channels || '[]').includes(message.channelId) ||
                 message.member?.roles.cache.some(r => JSON.parse(cfg.whitelist_roles || '[]').includes(r.id));
  if (exempt) return;

  let violation = null;

  // Word filter
  if (cfg.word_filter) {
    const words = JSON.parse(cfg.banned_words || '[]');
    const lower = message.content.toLowerCase();
    if (words.some(w => lower.includes(w.toLowerCase()))) violation = 'Word filter triggered';
  }

  // Anti-caps
  if (!violation && cfg.anti_caps && message.content.length > 10) {
    const upper = message.content.replace(/[^a-zA-Z]/g,'');
    if (upper.length > 0 && (upper.split('').filter(c => c === c.toUpperCase()).length / upper.length) * 100 > cfg.caps_threshold) {
      violation = 'Excessive caps';
    }
  }

  // Anti-links
  if (!violation && cfg.anti_links && /https?:\/\/\S+/i.test(message.content)) violation = 'Links not allowed';

  // Anti-invites
  if (!violation && cfg.anti_invites && /discord\.gg\/\w+/i.test(message.content)) violation = 'Invites not allowed';

  // Anti-emoji
  if (!violation && cfg.anti_emoji) {
    const emojiCount = (message.content.match(/<a?:.+?:\d+>|[\u{1F300}-\u{1FAFF}]/gu) || []).length;
    if (emojiCount > cfg.emoji_threshold) violation = 'Too many emojis';
  }

  // Anti-mentions
  if (!violation && cfg.anti_mentions && message.mentions.users.size > cfg.mention_threshold) violation = 'Too many mentions';

  // Anti-zalgo
  if (!violation && cfg.anti_zalgo && /[\u0300-\u036f\u0489]{3,}/.test(message.content)) violation = 'Zalgo text detected';

  // Anti-spam
  if (!violation && cfg.anti_spam) {
    const key  = `${message.guildId}:${message.author.id}`;
    const now  = Date.now();
    const msgs = (spamMap.get(key) || []).filter(t => now - t < cfg.spam_interval * 1000);
    msgs.push(now);
    spamMap.set(key, msgs);
    if (msgs.length > cfg.spam_threshold) violation = 'Spamming detected';
  }

  if (!violation) return;

  // Take action
  await message.delete().catch(() => {});

  if (cfg.dm_user) {
    message.author.send({ content: `⚠️ Your message in **${message.guild.name}** was removed: **${violation}**` }).catch(() => {});
  }

  if (cfg.action === 'warn') {
    db.run('INSERT INTO warns (guild_id, user_id, mod_id, reason, created_at) VALUES (?, ?, ?, ?, ?)',
      message.guildId, message.author.id, client.user.id, `[AutoMod] ${violation}`, Math.floor(Date.now()/1000));
  } else if (cfg.action === 'timeout') {
    message.member?.timeout(5 * 60 * 1000, `[AutoMod] ${violation}`).catch(() => {});
  } else if (cfg.action === 'kick') {
    message.member?.kick(`[AutoMod] ${violation}`).catch(() => {});
  }

  if (cfg.log_channel) {
    const logCh = await client.channels.fetch(cfg.log_channel).catch(() => null);
    if (logCh) {
      const { embed } = require('../../utils/embed');
      logCh.send({ embeds: [embed(0xED4245).setTitle('🤖 AutoMod Action')
        .addFields(
          { name: 'User',      value: `${message.author.tag} (<@${message.author.id}>)`, inline: true },
          { name: 'Violation', value: violation,                                          inline: true },
          { name: 'Action',    value: cfg.action,                                         inline: true },
          { name: 'Message',   value: message.content.slice(0, 200) || '*empty*',         inline: false },
        )] }).catch(() => {});
    }
  }
}

module.exports = { onMessage };
