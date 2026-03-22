// modules/music/resume.js
const { SlashCommandBuilder } = require('discord.js');
const { getDistube } = require('./_player');
const { success, error } = require('../../utils/embed');

module.exports = {
  module: 'music',
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the paused song'),

  async execute(interaction, client) {
    const distube = getDistube(client);
    const queue   = distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ embeds: [error('Nothing Playing', 'No music is playing.')], ephemeral: true });
    if (!queue.paused) return interaction.reply({ embeds: [error('Not Paused', 'Music is not paused.')], ephemeral: true });
    distube.resume(interaction.guildId);
    interaction.reply({ embeds: [success('Resumed', `▶️ Resumed **${queue.songs[0].name}**.`)] });
  },
};
