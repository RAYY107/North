// modules/music/stop.js
const { SlashCommandBuilder } = require('discord.js');
const { getDistube } = require('./_player');
const { success, error } = require('../../utils/embed');

module.exports = {
  module: 'music',
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop music and clear the queue'),

  async execute(interaction, client) {
    const distube = getDistube(client);
    const queue   = distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ embeds: [error('Nothing Playing', 'No music is playing.')], ephemeral: true });
    distube.stop(interaction.guildId);
    interaction.reply({ embeds: [success('Stopped', '⏹️ Music stopped and queue cleared.')] });
  },
};
