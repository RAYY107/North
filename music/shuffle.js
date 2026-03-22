// modules/music/shuffle.js
const { SlashCommandBuilder } = require('discord.js');
const { getDistube } = require('./_player');
const { success, error } = require('../../utils/embed');

module.exports = {
  module: 'music',
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffle the current queue'),

  async execute(interaction, client) {
    const distube = getDistube(client);
    const queue   = distube.getQueue(interaction.guildId);
    if (!queue || queue.songs.length < 2) return interaction.reply({ embeds: [error('Queue Too Short', 'Need at least 2 songs to shuffle.')], ephemeral: true });
    await distube.shuffle(interaction.guildId);
    interaction.reply({ embeds: [success('Shuffled', `🔀 Shuffled **${queue.songs.length}** songs.`)] });
  },
};
