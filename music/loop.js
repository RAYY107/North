// modules/music/loop.js
const { SlashCommandBuilder } = require('discord.js');
const { getDistube } = require('./_player');
const { success, error } = require('../../utils/embed');

module.exports = {
  module: 'music',
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set loop mode')
    .addStringOption(o => o.setName('mode').setDescription('Loop mode').setRequired(true)
      .addChoices(
        { name: '🔁 Queue', value: 'queue' },
        { name: '🔂 Song',  value: 'song'  },
        { name: '⏹️ Off',   value: 'off'   },
      )),

  async execute(interaction, client) {
    const distube = getDistube(client);
    const queue   = distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ embeds: [error('Nothing Playing', 'No music is playing.')], ephemeral: true });

    const mode   = interaction.options.getString('mode');
    const modeMap = { off: 0, song: 1, queue: 2 };
    const labels  = { off: '⏹️ Loop disabled', song: '🔂 Looping current song', queue: '🔁 Looping queue' };

    distube.setRepeatMode(interaction.guildId, modeMap[mode]);
    interaction.reply({ embeds: [success('Loop Mode', labels[mode])] });
  },
};
