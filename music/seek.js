// modules/music/seek.js
const { SlashCommandBuilder } = require('discord.js');
const { getDistube } = require('./_player');
const { success, error } = require('../../utils/embed');

module.exports = {
  module: 'music',
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Seek to a position in the current song')
    .addStringOption(o => o.setName('time').setDescription('Time to seek to (e.g. 1:30 or 90)').setRequired(true)),

  async execute(interaction, client) {
    const distube = getDistube(client);
    const queue   = distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ embeds: [error('Nothing Playing', 'No music is playing.')], ephemeral: true });

    const timeStr = interaction.options.getString('time');
    let seconds;

    if (timeStr.includes(':')) {
      const parts = timeStr.split(':').map(Number);
      seconds = parts.length === 3
        ? parts[0] * 3600 + parts[1] * 60 + parts[2]
        : parts[0] * 60 + parts[1];
    } else {
      seconds = parseInt(timeStr);
    }

    if (isNaN(seconds) || seconds < 0) return interaction.reply({ embeds: [error('Invalid Time', 'Use format `1:30` or `90` (seconds).')], ephemeral: true });
    if (seconds > queue.songs[0].duration) return interaction.reply({ embeds: [error('Out of Range', 'Time exceeds song duration.')], ephemeral: true });

    await distube.seek(interaction.guildId, seconds);
    const mins = Math.floor(seconds / 60), secs = seconds % 60;
    interaction.reply({ embeds: [success('Seeked', `⏩ Jumped to **${mins}:${String(secs).padStart(2,'0')}**.`)] });
  },
};
