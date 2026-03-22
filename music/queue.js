// modules/music/queue.js
const { SlashCommandBuilder } = require('discord.js');
const { getDistube } = require('./_player');
const { embed, error } = require('../../utils/embed');
const { formatDurationCompact, chunk } = require('../../utils/format');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  module: 'music',
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('View the current music queue')
    .addIntegerOption(o => o.setName('page').setDescription('Page number').setRequired(false).setMinValue(1)),

  async execute(interaction, client) {
    const distube = getDistube(client);
    const queue   = distube.getQueue(interaction.guildId);
    if (!queue?.songs.length) return interaction.reply({ embeds: [error('Empty Queue', 'Nothing is playing right now.')], ephemeral: true });

    const page     = (interaction.options.getInteger('page') || 1) - 1;
    const pages    = chunk(queue.songs.slice(1), 10);
    const current  = queue.songs[0];
    const totalDur = queue.songs.reduce((a, s) => a + s.duration, 0);

    const desc = pages[page]
      ? pages[page].map((s, i) => `**${page * 10 + i + 2}.** [${s.name}](${s.url}) \`${formatDurationCompact(s.duration)}\` — ${s.user}`).join('\n')
      : '*No more songs*';

    const e = embed(0x1DB954)
      .setTitle('🎵 Music Queue')
      .addFields(
        { name: '🔊 Now Playing', value: `[${current.name}](${current.url}) \`${formatDurationCompact(current.duration)}\``, inline: false },
        { name: '📋 Up Next',     value: desc || '*Empty*',   inline: false },
        { name: '🎶 Total Songs', value: `${queue.songs.length}`,              inline: true },
        { name: '⏱️ Total Time',  value: formatDurationCompact(totalDur),     inline: true },
        { name: '🔁 Loop',        value: queue.repeatMode === 1 ? 'Song' : queue.repeatMode === 2 ? 'Queue' : 'Off', inline: true },
      )
      .setFooter({ text: `Page ${page + 1}/${Math.max(1, pages.length)} • Volume: ${queue.volume}%` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('q_prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
      new ButtonBuilder().setCustomId('q_next').setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(page >= pages.length - 1),
    );

    interaction.reply({ embeds: [e], components: pages.length > 1 ? [row] : [] });
  },
};
