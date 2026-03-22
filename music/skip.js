// modules/music/skip.js
const { SlashCommandBuilder } = require('discord.js');
const { getDistube } = require('./_player');
const { success, error } = require('../../utils/embed');

module.exports = {
  module: 'music',
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current song or to a specific position')
    .addIntegerOption(o => o.setName('to').setDescription('Skip to position in queue').setRequired(false).setMinValue(2)),

  async execute(interaction, client) {
    const distube = getDistube(client);
    const queue   = distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ embeds: [error('Nothing Playing', 'No music is playing.')], ephemeral: true });

    const to = interaction.options.getInteger('to');
    try {
      if (to) {
        await distube.jump(interaction.guildId, to - 1);
        interaction.reply({ embeds: [success('Skipped', `Jumped to song #${to}.`)] });
      } else {
        const song = queue.songs[0];
        await distube.skip(interaction.guildId);
        interaction.reply({ embeds: [success('Skipped', `Skipped **${song.name}**.`)] });
      }
    } catch (err) {
      interaction.reply({ embeds: [error('Skip Failed', err.message)], ephemeral: true });
    }
  },
};
