// modules/music/play.js
const { SlashCommandBuilder } = require('discord.js');
const { getDistube } = require('./_player');
const { error } = require('../../utils/embed');

module.exports = {
  module: 'music',
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or playlist')
    .addStringOption(o => o.setName('query').setDescription('Song name, URL, Spotify/YouTube/SoundCloud link').setRequired(true)),

  async execute(interaction, client) {
    const vc = interaction.member?.voice?.channel;
    if (!vc) return interaction.reply({ embeds: [error('Not in Voice', 'Join a voice channel first.')], ephemeral: true });

    const query = interaction.options.getString('query');
    await interaction.deferReply();

    try {
      const distube = getDistube(client);
      await distube.play(vc, query, {
        member:      interaction.member,
        textChannel: interaction.channel,
        message:     interaction,
      });
      // DisTube emits playSong/addSong which sends the embed
      await interaction.deleteReply().catch(() => {});
    } catch (err) {
      interaction.editReply({ embeds: [error('Play Failed', err.message.slice(0, 200))] });
    }
  },
};
