// modules/voice/topvoice.js
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database');
const { embed } = require('../../utils/embed');
const { getMedal, formatDurationCompact, progressBar } = require('../../utils/format');

module.exports = {
  module: 'voice',
  data: new SlashCommandBuilder()
    .setName('topvoice')
    .setDescription('Show the voice time leaderboard')
    .addStringOption(o => o.setName('period').setDescription('Time period').setRequired(false)
      .addChoices({ name: '📅 Last Week', value: 'week' }, { name: '🗓️ Last Month', value: 'month' }, { name: '🏆 All Time', value: 'alltime' }))
    .addIntegerOption(o => o.setName('limit').setDescription('Number to show').setRequired(false)
      .addChoices({ name: 'Top 10', value: 10 }, { name: 'Top 20', value: 20 })),

  async execute(interaction, client, period = null, limit = null) {
    await interaction.deferReply();
    period = period || interaction.options?.getString('period') || 'alltime';
    limit  = limit  || interaction.options?.getInteger('limit')  || 10;

    const now  = Math.floor(Date.now() / 1000);
    const since = period === 'week' ? now - 604800 : period === 'month' ? now - 2592000 : 0;

    let rows;
    if (period === 'alltime') {
      rows = db.all('SELECT user_id AS userId, total_seconds AS totalSeconds FROM voice_totals WHERE guild_id = ? ORDER BY total_seconds DESC LIMIT ?', interaction.guildId, limit);
    } else {
      rows = db.all(`SELECT user_id AS userId, SUM(CASE WHEN leave_time IS NOT NULL THEN MIN(leave_time,?) - MAX(join_time,?) ELSE ? - MAX(join_time,?) END) AS totalSeconds FROM voice_sessions WHERE guild_id = ? AND join_time < ? AND (leave_time IS NULL OR leave_time > ?) GROUP BY user_id HAVING totalSeconds > 0 ORDER BY totalSeconds DESC LIMIT ?`, now, since, now, since, interaction.guildId, now, since, limit);
    }

    if (!rows.length) return interaction.editReply({ embeds: [embed().setTitle('🎙️ Voice Leaderboard').setDescription('No voice data yet.')] });

    const topSec = rows[0].totalSeconds || 1;
    const lines  = await Promise.all(rows.map(async (r, i) => {
      let name;
      try { const m = await interaction.guild.members.fetch(r.userId); name = m.displayName; } catch { name = 'Unknown'; }
      return `${getMedal(i+1)} **${name}**\n┗ \`${progressBar(r.totalSeconds, topSec, 8)}\` ${formatDurationCompact(r.totalSeconds)}`;
    }));

    const labels = { week: 'Last 7 Days', month: 'Last 30 Days', alltime: 'All Time' };
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`lb_week_${limit}`).setLabel('📅 Week').setStyle(period==='week'?ButtonStyle.Primary:ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`lb_month_${limit}`).setLabel('🗓️ Month').setStyle(period==='month'?ButtonStyle.Primary:ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`lb_alltime_${limit}`).setLabel('🏆 All Time').setStyle(period==='alltime'?ButtonStyle.Primary:ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`lb_${period}_${limit===10?20:10}`).setLabel(limit===10?'Top 20':'Top 10').setStyle(ButtonStyle.Secondary),
    );
    interaction.editReply({ embeds: [embed(0xFFD700).setTitle(`🎙️ Voice Leaderboard — ${labels[period]}`).setDescription(lines.join('\n\n')).setFooter({ text: `Top ${rows.length} • ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() }).setTimestamp()], components: [row] });
  },

  async handleButton(interaction, client) {
    const [, period, limitStr] = interaction.customId.split('_');
    await module.exports.execute(interaction, client, period, parseInt(limitStr));
  },
};
