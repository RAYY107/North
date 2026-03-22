// modules/music/_player.js
// DisTube v5 music player manager
// Developed by Rayy @qwxlr | North Store

const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { embed } = require('../../utils/embed');
const { formatDurationCompact } = require('../../utils/format');

let distube = null;

function getDistube(client) {
  if (distube) return distube;

  const plugins = [
    new YtDlpPlugin({ update: false }),
    new SoundCloudPlugin(),
  ];

  // Spotify plugin — optional, only if credentials set
  if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
    try {
      const { SpotifyPlugin } = require('@distube/spotify');
      plugins.push(new SpotifyPlugin({
        api: {
          clientId:     process.env.SPOTIFY_CLIENT_ID,
          clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        },
      }));
      console.log('\x1b[32m[Music] Spotify plugin loaded ✓\x1b[0m');
    } catch (e) {
      console.warn('\x1b[33m[Music] Spotify plugin skipped:', e.message, '\x1b[0m');
    }
  }

  distube = new DisTube(client, { plugins });

  // ── Events ──────────────────────────────────────────────────
  distube.on('playSong', (queue, song) => {
    queue.textChannel?.send({
      embeds: [embed(0x1DB954)
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${song.name}](${song.url})**`)
        .setThumbnail(song.thumbnail)
        .addFields(
          { name: '⏱️ Duration',  value: song.isLive ? '🔴 LIVE' : formatDurationCompact(song.duration), inline: true },
          { name: '👤 Requested', value: `${song.user}`,                                                  inline: true },
          { name: '📊 Volume',    value: `${queue.volume}%`,                                              inline: true },
        )],
    }).catch(() => {});
  });

  distube.on('addSong', (queue, song) => {
    queue.textChannel?.send({
      embeds: [embed(0x5865F2)
        .setTitle('➕ Added to Queue')
        .setDescription(`**[${song.name}](${song.url})**`)
        .addFields({ name: 'Position', value: `#${queue.songs.length}`, inline: true })],
    }).catch(() => {});
  });

  distube.on('addList', (queue, playlist) => {
    queue.textChannel?.send({
      embeds: [embed(0x9B59B6)
        .setTitle('📋 Playlist Added')
        .setDescription(`**${playlist.name}** — ${playlist.songs.length} songs`)],
    }).catch(() => {});
  });

  distube.on('error', (error, queue) => {
    queue?.textChannel?.send({
      embeds: [embed(0xED4245).setTitle('❌ Music Error').setDescription(String(error.message).slice(0, 200))],
    }).catch(() => {});
    console.error('[Music Error]', error.message);
  });

  distube.on('finish', queue => {
    queue.textChannel?.send({
      embeds: [embed(0x888888).setTitle('⏹️ Queue Finished').setDescription('All songs have been played.')],
    }).catch(() => {});
  });

  distube.on('disconnect', queue => {
    queue.textChannel?.send({ content: '👋 Disconnected from voice channel.' }).catch(() => {});
  });

  return distube;
}

module.exports = { getDistube };
