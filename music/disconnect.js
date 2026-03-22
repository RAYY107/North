// modules/music/disconnect.js
const { SlashCommandBuilder } = require('discord.js');
const { getDistube } = require('./_player');
const { success, error } = require('../../utils/embed');

module.exports = {
  module: 'music',
  data: new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription('Disconnect the bot from voice'),

  async execute(interaction, client) {
    const distube = getDistube(client);
    const queue   = distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ embeds: [error('Not Connected', 'Bot is not in a voice channel.')], ephemeral: true });
    distube.voices.get(interaction.guild)?.leave();
    interaction.reply({ embeds: [success('Disconnected', '👋 Left the voice channel.')] });
  },
};
