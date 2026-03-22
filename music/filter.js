// modules/music/filter.js
// DisTube v5 compatible filter command
// Developed by Rayy @qwxlr | North Store

const { SlashCommandBuilder } = require('discord.js');
const { getDistube } = require('./_player');
const { success, error } = require('../../utils/embed');

const FILTERS = {
  bassboost:  'bass=g=15',
  nightcore:  'aresample=48000,asetrate=48000*1.25',
  '8d':       'apulsator=hz=0.09',
  vaporwave:  'aresample=48000,asetrate=48000*0.8',
  echo:       'aecho=0.8:0.9:1000:0.3',
  flanger:    'aflanger',
  tremolo:    'tremolo',
  vibrato:    'vibrato=f=6.5:d=0.35',
  karaoke:    'stereotools=mleft=0.03:mright=0.03:sbal=4.0:mode=3',
  normalizer: 'dynaudnorm=f=150',
};

module.exports = {
  module: 'music',
  data: new SlashCommandBuilder()
    .setName('filter')
    .setDescription('Apply or remove audio filters')
    .addStringOption(o =>
      o.setName('filter').setDescription('Filter to apply').setRequired(true)
        .addChoices(
          ...Object.keys(FILTERS).map(f => ({ name: f, value: f })),
          { name: 'clear — Remove all filters', value: 'clear' },
        )),

  async execute(interaction, client) {
    const distube = getDistube(client);
    const queue   = distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ embeds: [error('Nothing Playing', 'No music is playing.')], ephemeral: true });

    const filterName = interaction.options.getString('filter');

    try {
      if (filterName === 'clear') {
        await queue.filters.clear();
        return interaction.reply({ embeds: [success('Filters Cleared', '🎚️ All audio filters removed.')] });
      }

      // DisTube v5: use queue.filters.set() with ffmpeg filter string
      await queue.filters.set([FILTERS[filterName]]);
      interaction.reply({ embeds: [success('Filter Applied', `🎚️ Applied **${filterName}** filter.`)] });
    } catch (err) {
      interaction.reply({ embeds: [error('Filter Failed', err.message)], ephemeral: true });
    }
  },
};
