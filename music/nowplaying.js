// modules/music/nowplaying.js
const { SlashCommandBuilder } = require('discord.js');
const { getDistube } = require('./_player');
const { embed, error } = require('../../utils/embed');
const { progressBar, formatDurationCompact } = require('../../utils/format');

module.exports = {
  module: 'music',
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show the currently playing song'),

  async execute(interaction, client) {
    const distube = getDistube(client);
    const queue   = distube.getQueue(interaction.guildId);
    if (!queue?.songs.length) return interaction.reply({ embeds: [error('Nothing Playing', 'No music is playing.')], ephemeral: true });

    const song     = queue.songs[0];
    const current  = queue.currentTime;
    const duration = song.duration;
    const bar      = song.isLive ? '🔴 LIVE STREAM' : `\`${progressBar(current, duration, 15)}\`\n${formatDurationCompact(current)} / ${formatDurationCompact(duration)}`;
    const loopMode = ['Off', '🔂 Song', '🔁 Queue'][queue.repeatMode];

    interaction.reply({ embeds: [embed(0x1DB954)
      .setTitle('🎵 Now Playing')
      .setDescription(`**[${song.name}](${song.url})**\n\n${bar}`)
      .setThumbnail(song.thumbnail)
      .addFields(
        { name: '👤 Requested', value: `${song.user}`,                          inline: true },
        { name: '🔊 Volume',    value: `${queue.volume}%`,                      inline: true },
        { name: '🔁 Loop',      value: loopMode,                                inline: true },
        { name: '📋 Queue',     value: `${queue.songs.length} songs`,           inline: true },
      )] });
  },
};
