// modules/leveling/top.js
const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { embed } = require('../../utils/embed');
const { getMedal, formatNumber } = require('../../utils/format');

module.exports = {
  module: 'leveling',
  data: new SlashCommandBuilder()
    .setName('top')
    .setDescription('Show the XP leaderboard')
    .addIntegerOption(o => o.setName('limit').setDescription('Number of users').setRequired(false)
      .addChoices({ name: 'Top 10', value: 10 }, { name: 'Top 20', value: 20 })),

  async execute(interaction) {
    await interaction.deferReply();
    const limit = interaction.options.getInteger('limit') || 10;
    const rows  = db.all('SELECT * FROM levels WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT ?', interaction.guildId, limit);
    if (!rows.length) return interaction.editReply({ embeds: [embed().setTitle('⭐ Leaderboard').setDescription('No level data yet. Start chatting!')] });

    const lines = await Promise.all(rows.map(async (r, i) => {
      let name;
      try { const m = await interaction.guild.members.fetch(r.user_id); name = m.displayName; } catch { name = 'Unknown'; }
      return `${getMedal(i+1)} **${name}** — Level ${r.level} | ${formatNumber(r.xp)} XP`;
    }));

    interaction.editReply({ embeds: [embed(0x5865F2).setTitle('⭐ XP Leaderboard').setDescription(lines.join('\n'))] });
  },
};
