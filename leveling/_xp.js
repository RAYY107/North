// modules/leveling/_xp.js  (XP event handler — not a command)
const db = require('../../database');
const { xpForLevel } = require('../../database');

const xpCooldowns = new Map();

async function onMessage(message, client) {
  if (message.author.bot || !message.guild) return;

  const cfg = db.get('SELECT * FROM level_config WHERE guild_id = ?', message.guildId) || {};
  const noXpChannels = JSON.parse(cfg.no_xp_channels || '[]');
  const noXpRoles    = JSON.parse(cfg.no_xp_roles    || '[]');

  if (noXpChannels.includes(message.channelId)) return;
  if (message.member?.roles?.cache?.some(r => noXpRoles.includes(r.id))) return;

  const cooldown = (cfg.xp_cooldown || 60) * 1000;
  const key      = `${message.guildId}:${message.author.id}`;
  if (xpCooldowns.has(key) && Date.now() - xpCooldowns.get(key) < cooldown) return;
  xpCooldowns.set(key, Date.now());

  const xpMin  = cfg.xp_min || 15;
  const xpMax  = cfg.xp_max || 25;
  const amount = Math.floor(Math.random() * (xpMax - xpMin + 1)) + xpMin;

  const { leveled, newLevel, oldLevel } = db.addXP(message.guildId, message.author.id, amount);

  if (leveled) {
    // Send level-up message
    const guildCfg = db.getGuildConfig(message.guildId);
    const levelChannel = guildCfg.level_channel ? await message.guild.channels.fetch(guildCfg.level_channel).catch(() => null) : message.channel;
    if (levelChannel) {
      levelChannel.send({ content: `🎉 Congrats ${message.author}! You leveled up to **Level ${newLevel}**!` }).catch(() => {});
    }

    // Check level rewards
    const reward = db.get('SELECT * FROM level_rewards WHERE guild_id = ? AND level = ?', message.guildId, newLevel);
    if (reward) {
      const member = message.member;
      await member.roles.add(reward.role_id).catch(() => {});

      // Remove old rewards if not stacking
      if (!cfg.stack_roles) {
        for (let l = oldLevel; l < newLevel; l++) {
          const old = db.get('SELECT * FROM level_rewards WHERE guild_id = ? AND level = ?', message.guildId, l);
          if (old) await member.roles.remove(old.role_id).catch(() => {});
        }
      }
    }
  }
}

function onJoin(member) {
  // Ensure user exists in levels table
  db.getLevels(member.guild.id, member.id);
}

module.exports = { onMessage, onJoin };
