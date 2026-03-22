// modules/music/volume.js
const { SlashCommandBuilder } = require('discord.js');
const { getDistube } = require('./_player');
const { success, error } = require('../../utils/embed');

module.exports = {
  module: 'music',
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set or check the music volume')
    .addIntegerOption(o => o.setName('level').setDescription('Volume level (1-150)').setRequired(false).setMinValue(1).setMaxValue(150)),

  async execute(interaction, client) {
    const distube = getDistube(client);
    const queue   = distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ embeds: [error('Nothing Playing', 'No music is playing.')], ephemeral: true });

    const level = interaction.options.getInteger('level');
    if (!level) return interaction.reply({ embeds: [success('Volume', `🔊 Current volume: **${queue.volume}%**`)] });

    distube.setVolume(interaction.guildId, level);
    const emoji = level === 0 ? '🔇' : level < 50 ? '🔈' : level < 100 ? '🔉' : '🔊';
    interaction.reply({ embeds: [success('Volume Updated', `${emoji} Volume set to **${level}%**.`)] });
  },
};
