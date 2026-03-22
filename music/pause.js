// modules/music/pause.js
const { SlashCommandBuilder } = require('discord.js');
const { getDistube } = require('./_player');
const { success, error } = require('../../utils/embed');

module.exports = {
  module: 'music',
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the current song'),

  async execute(interaction, client) {
    const distube = getDistube(client);
    const queue   = distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ embeds: [error('Nothing Playing', 'No music is playing.')], ephemeral: true });
    if (queue.paused) return interaction.reply({ embeds: [error('Already Paused', 'Music is already paused. Use `/resume`.')], ephemeral: true });
    distube.pause(interaction.guildId);
    interaction.reply({ embeds: [success('Paused', `⏸️ Paused **${queue.songs[0].name}**.`)] });
  },
};
