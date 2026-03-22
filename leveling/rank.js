// modules/leveling/rank.js
const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { embed } = require('../../utils/embed');
const { progressBar, formatNumber } = require('../../utils/format');

module.exports = {
  module: 'leveling',
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('View your rank card')
    .addUserOption(o => o.setName('user').setDescription('View another user\'s rank').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const data   = db.getLevels(interaction.guildId, target.id);
    const { xpForLevel } = require('../../database');
    const xpNeeded = xpForLevel(data.level + 1);
    const rank  = (db.get('SELECT COUNT(*)+1 AS r FROM levels WHERE guild_id = ? AND (level > ? OR (level = ? AND xp > ?))', interaction.guildId, data.level, data.level, data.xp)?.r) || 1;
    const bar   = progressBar(data.xp, xpNeeded, 15);

    interaction.reply({
      embeds: [embed(0x5865F2)
        .setTitle(`⭐ ${target.username}'s Rank`)
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: '🏆 Server Rank', value: `#${rank}`,                                    inline: true },
          { name: '⭐ Level',       value: `${data.level}`,                               inline: true },
          { name: '💬 Messages',    value: formatNumber(data.messages),                   inline: true },
          { name: `XP Progress`,   value: `\`${bar}\`\n${formatNumber(data.xp)} / ${formatNumber(xpNeeded)} XP`, inline: false },
        )],
    });
  },
};
