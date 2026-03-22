// modules/music/music.js
// All music commands consolidated under /music
// Developed by Rayy @qwxlr | North Store

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDistube } = require('./_player');
const { embed, success, error } = require('../../utils/embed');
const { formatDurationCompact, progressBar, chunk } = require('../../utils/format');
const db = require('../../database');
const axios = require('axios');

// Ensure playlists table exists
db.run(`CREATE TABLE IF NOT EXISTS playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL, user_id TEXT NOT NULL,
  name TEXT NOT NULL, songs TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL
)`);

const FILTERS = {
  bassboost: 'bass=g=15', nightcore: 'aresample=48000,asetrate=48000*1.25',
  '8d': 'apulsator=hz=0.09', vaporwave: 'aresample=48000,asetrate=48000*0.8',
  echo: 'aecho=0.8:0.9:1000:0.3', flanger: 'aflanger',
  tremolo: 'tremolo', vibrato: 'vibrato=f=6.5:d=0.35',
};

module.exports = {
  module: 'music',
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('Music player commands')

    .addSubcommand(s => s.setName('play').setDescription('Play a song or playlist')
      .addStringOption(o => o.setName('query').setDescription('Song name or URL (YouTube/Spotify/SoundCloud)').setRequired(true)))

    .addSubcommand(s => s.setName('pause').setDescription('Pause the current song'))
    .addSubcommand(s => s.setName('resume').setDescription('Resume the paused song'))
    .addSubcommand(s => s.setName('stop').setDescription('Stop music and clear the queue'))
    .addSubcommand(s => s.setName('disconnect').setDescription('Disconnect from voice channel'))
    .addSubcommand(s => s.setName('nowplaying').setDescription('Show the currently playing song'))
    .addSubcommand(s => s.setName('shuffle').setDescription('Shuffle the queue'))

    .addSubcommand(s => s.setName('skip').setDescription('Skip the current song or jump to a position')
      .addIntegerOption(o => o.setName('to').setDescription('Queue position to skip to').setRequired(false).setMinValue(2)))

    .addSubcommand(s => s.setName('volume').setDescription('Set or check the music volume')
      .addIntegerOption(o => o.setName('level').setDescription('Volume (1-150)').setRequired(false).setMinValue(1).setMaxValue(150)))

    .addSubcommand(s => s.setName('loop').setDescription('Set loop mode')
      .addStringOption(o => o.setName('mode').setDescription('Loop mode').setRequired(true)
        .addChoices({ name: '🔁 Queue', value: 'queue' }, { name: '🔂 Song', value: 'song' }, { name: '⏹️ Off', value: 'off' })))

    .addSubcommand(s => s.setName('seek').setDescription('Jump to a position in the current song')
      .addStringOption(o => o.setName('time').setDescription('Time (e.g. 1:30 or 90)').setRequired(true)))

    .addSubcommand(s => s.setName('queue').setDescription('View the current queue')
      .addIntegerOption(o => o.setName('page').setDescription('Page number').setRequired(false).setMinValue(1)))

    .addSubcommand(s => s.setName('filter').setDescription('Apply or remove an audio filter')
      .addStringOption(o => o.setName('filter').setDescription('Filter').setRequired(true)
        .addChoices(
          ...Object.keys(FILTERS).map(f => ({ name: f, value: f })),
          { name: 'clear — Remove all filters', value: 'clear' },
        )))

    .addSubcommand(s => s.setName('save').setDescription('Save the current queue as a playlist')
      .addStringOption(o => o.setName('name').setDescription('Playlist name').setRequired(true)))

    .addSubcommand(s => s.setName('load').setDescription('Load a saved playlist')
      .addStringOption(o => o.setName('name').setDescription('Playlist name').setRequired(true)))

    .addSubcommand(s => s.setName('playlists').setDescription('View your saved playlists'))

    .addSubcommand(s => s.setName('deleteplaylist').setDescription('Delete a saved playlist')
      .addStringOption(o => o.setName('name').setDescription('Playlist name').setRequired(true))),

  async execute(interaction, client) {
    const sub     = interaction.options.getSubcommand();
    const distube = getDistube(client);

    // Helper: check if in voice
    const requireVoice = () => {
      const vc = interaction.member?.voice?.channel;
      if (!vc) { interaction.reply({ embeds: [error('Not in Voice', 'Join a voice channel first.')], ephemeral: true }); return null; }
      return vc;
    };

    // Helper: check if queue exists
    const requireQueue = () => {
      const q = distube.getQueue(interaction.guildId);
      if (!q) { interaction.reply({ embeds: [error('Nothing Playing', 'No music is playing.')], ephemeral: true }); return null; }
      return q;
    };

    // ── Play ────────────────────────────────────────────────
    if (sub === 'play') {
      const vc = requireVoice(); if (!vc) return;
      const query = interaction.options.getString('query');
      await interaction.deferReply();
      try {
        await distube.play(vc, query, { member: interaction.member, textChannel: interaction.channel });
        await interaction.deleteReply().catch(() => {});
      } catch (e) {
        interaction.editReply({ embeds: [error('Play Failed', e.message.slice(0, 200))] });
      }
      return;
    }

    // ── Pause ───────────────────────────────────────────────
    if (sub === 'pause') {
      const queue = requireQueue(); if (!queue) return;
      if (queue.paused) return interaction.reply({ embeds: [error('Already Paused', 'Use `/music resume`.')], ephemeral: true });
      distube.pause(interaction.guildId);
      return interaction.reply({ embeds: [success('Paused', `⏸️ **${queue.songs[0].name}**`)] });
    }

    // ── Resume ──────────────────────────────────────────────
    if (sub === 'resume') {
      const queue = requireQueue(); if (!queue) return;
      if (!queue.paused) return interaction.reply({ embeds: [error('Not Paused', 'Music is already playing.')], ephemeral: true });
      distube.resume(interaction.guildId);
      return interaction.reply({ embeds: [success('Resumed', `▶️ **${queue.songs[0].name}**`)] });
    }

    // ── Stop ────────────────────────────────────────────────
    if (sub === 'stop') {
      const queue = requireQueue(); if (!queue) return;
      distube.stop(interaction.guildId);
      return interaction.reply({ embeds: [success('Stopped', '⏹️ Music stopped and queue cleared.')] });
    }

    // ── Disconnect ──────────────────────────────────────────
    if (sub === 'disconnect') {
      const queue = distube.getQueue(interaction.guildId);
      if (queue) distube.stop(interaction.guildId);
      distube.voices.get(interaction.guild)?.leave();
      return interaction.reply({ embeds: [success('Disconnected', '👋 Left the voice channel.')] });
    }

    // ── Now Playing ─────────────────────────────────────────
    if (sub === 'nowplaying') {
      const queue = requireQueue(); if (!queue) return;
      const song    = queue.songs[0];
      const current = queue.currentTime;
      const bar     = song.isLive ? '🔴 LIVE STREAM' : `\`${progressBar(current, song.duration, 15)}\`\n${formatDurationCompact(current)} / ${formatDurationCompact(song.duration)}`;
      return interaction.reply({ embeds: [embed(0x1DB954)
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${song.name}](${song.url})**\n\n${bar}`)
        .setThumbnail(song.thumbnail)
        .addFields(
          { name: '👤 Requested', value: `${song.user}`,                                              inline: true },
          { name: '🔊 Volume',    value: `${queue.volume}%`,                                           inline: true },
          { name: '🔁 Loop',      value: ['Off','🔂 Song','🔁 Queue'][queue.repeatMode],               inline: true },
          { name: '📋 In Queue',  value: `${queue.songs.length} songs`,                               inline: true },
        )] });
    }

    // ── Shuffle ─────────────────────────────────────────────
    if (sub === 'shuffle') {
      const queue = requireQueue(); if (!queue) return;
      if (queue.songs.length < 2) return interaction.reply({ embeds: [error('Queue Too Short', 'Need at least 2 songs.')], ephemeral: true });
      await distube.shuffle(interaction.guildId);
      return interaction.reply({ embeds: [success('Shuffled', `🔀 Shuffled **${queue.songs.length}** songs.`)] });
    }

    // ── Skip ────────────────────────────────────────────────
    if (sub === 'skip') {
      const queue = requireQueue(); if (!queue) return;
      const to    = interaction.options.getInteger('to');
      try {
        const song = queue.songs[0];
        if (to) { await distube.jump(interaction.guildId, to - 1); return interaction.reply({ embeds: [success('Skipped', `⏭️ Jumped to song **#${to}**.`)] }); }
        await distube.skip(interaction.guildId);
        return interaction.reply({ embeds: [success('Skipped', `⏭️ Skipped **${song.name}**.`)] });
      } catch (e) {
        return interaction.reply({ embeds: [error('Skip Failed', e.message)], ephemeral: true });
      }
    }

    // ── Volume ──────────────────────────────────────────────
    if (sub === 'volume') {
      const queue = requireQueue(); if (!queue) return;
      const level = interaction.options.getInteger('level');
      if (!level) return interaction.reply({ embeds: [success('Volume', `🔊 Current volume: **${queue.volume}%**`)] });
      distube.setVolume(interaction.guildId, level);
      const emoji = level === 0 ? '🔇' : level < 50 ? '🔈' : level < 100 ? '🔉' : '🔊';
      return interaction.reply({ embeds: [success('Volume Updated', `${emoji} Volume set to **${level}%**.`)] });
    }

    // ── Loop ────────────────────────────────────────────────
    if (sub === 'loop') {
      const queue = requireQueue(); if (!queue) return;
      const mode  = interaction.options.getString('mode');
      const modeMap = { off: 0, song: 1, queue: 2 };
      const labels  = { off: '⏹️ Loop disabled', song: '🔂 Looping current song', queue: '🔁 Looping queue' };
      distube.setRepeatMode(interaction.guildId, modeMap[mode]);
      return interaction.reply({ embeds: [success('Loop Mode', labels[mode])] });
    }

    // ── Seek ────────────────────────────────────────────────
    if (sub === 'seek') {
      const queue   = requireQueue(); if (!queue) return;
      const timeStr = interaction.options.getString('time');
      let seconds;
      if (timeStr.includes(':')) {
        const parts = timeStr.split(':').map(Number);
        seconds = parts.length === 3 ? parts[0]*3600+parts[1]*60+parts[2] : parts[0]*60+parts[1];
      } else { seconds = parseInt(timeStr); }
      if (isNaN(seconds) || seconds < 0) return interaction.reply({ embeds: [error('Invalid Time', 'Use format `1:30` or `90` seconds.')], ephemeral: true });
      if (seconds > queue.songs[0].duration) return interaction.reply({ embeds: [error('Out of Range', 'Time exceeds song duration.')], ephemeral: true });
      await distube.seek(interaction.guildId, seconds);
      const m = Math.floor(seconds/60), s = seconds % 60;
      return interaction.reply({ embeds: [success('Seeked', `⏩ Jumped to **${m}:${String(s).padStart(2,'0')}**.`)] });
    }

    // ── Queue ───────────────────────────────────────────────
    if (sub === 'queue') {
      const queue = requireQueue(); if (!queue) return;
      const page  = (interaction.options.getInteger('page') || 1) - 1;
      const pages = chunk(queue.songs.slice(1), 10);
      const song  = queue.songs[0];
      const totalDur = queue.songs.reduce((a, s) => a + s.duration, 0);
      const desc  = pages[page]
        ? pages[page].map((s, i) => `**${page*10+i+2}.** [${s.name}](${s.url}) \`${formatDurationCompact(s.duration)}\``).join('\n')
        : '*No more songs*';
      return interaction.reply({ embeds: [embed(0x1DB954)
        .setTitle('📋 Music Queue')
        .addFields(
          { name: '🔊 Now Playing', value: `[${song.name}](${song.url}) \`${formatDurationCompact(song.duration)}\``, inline: false },
          { name: '⏭️ Up Next',    value: desc || '*Empty*',                                                          inline: false },
          { name: '🎶 Songs',      value: `${queue.songs.length}`,                                                    inline: true },
          { name: '⏱️ Total',      value: formatDurationCompact(totalDur),                                            inline: true },
          { name: '🔁 Loop',       value: ['Off','Song','Queue'][queue.repeatMode],                                   inline: true },
        )
        .setFooter({ text: `Page ${page+1}/${Math.max(1,pages.length)} • Volume: ${queue.volume}%` })] });
    }

    // ── Filter ──────────────────────────────────────────────
    if (sub === 'filter') {
      const queue      = requireQueue(); if (!queue) return;
      const filterName = interaction.options.getString('filter');
      try {
        if (filterName === 'clear') {
          await queue.filters.clear();
          return interaction.reply({ embeds: [success('Filters Cleared', '🎚️ All filters removed.')] });
        }
        await queue.filters.set([FILTERS[filterName]]);
        return interaction.reply({ embeds: [success('Filter Applied', `🎚️ Applied **${filterName}** filter.`)] });
      } catch (e) {
        return interaction.reply({ embeds: [error('Filter Failed', e.message)], ephemeral: true });
      }
    }

    // ── Save Playlist ───────────────────────────────────────
    if (sub === 'save') {
      const queue = requireQueue(); if (!queue) return;
      const name  = interaction.options.getString('name');
      const songs = queue.songs.map(s => ({ name: s.name, url: s.url }));
      const exists = db.get('SELECT id FROM playlists WHERE guild_id=? AND user_id=? AND name=?', interaction.guildId, interaction.user.id, name);
      if (exists) db.run('UPDATE playlists SET songs=? WHERE id=?', JSON.stringify(songs), exists.id);
      else db.run('INSERT INTO playlists (guild_id, user_id, name, songs, created_at) VALUES (?, ?, ?, ?, ?)', interaction.guildId, interaction.user.id, name, JSON.stringify(songs), Math.floor(Date.now()/1000));
      return interaction.reply({ embeds: [success('Playlist Saved', `Saved **${songs.length}** songs as "**${name}**".`)] });
    }

    // ── Load Playlist ───────────────────────────────────────
    if (sub === 'load') {
      const vc   = requireVoice(); if (!vc) return;
      const name = interaction.options.getString('name');
      const pl   = db.get('SELECT * FROM playlists WHERE guild_id=? AND user_id=? AND name=?', interaction.guildId, interaction.user.id, name);
      if (!pl) return interaction.reply({ embeds: [error('Not Found', `Playlist "**${name}**" not found.`)], ephemeral: true });
      const songs = JSON.parse(pl.songs);
      await interaction.deferReply();
      for (const song of songs) {
        await distube.play(vc, song.url, { member: interaction.member, textChannel: interaction.channel }).catch(() => {});
      }
      return interaction.editReply({ embeds: [success('Playlist Loaded', `Queued **${songs.length}** songs from "**${name}**".`)] });
    }

    // ── List Playlists ──────────────────────────────────────
    if (sub === 'playlists') {
      const playlists = db.all('SELECT name, songs FROM playlists WHERE guild_id=? AND user_id=? ORDER BY created_at DESC', interaction.guildId, interaction.user.id);
      if (!playlists.length) return interaction.reply({ embeds: [embed().setTitle('📋 Your Playlists').setDescription('No saved playlists.')], ephemeral: true });
      const list = playlists.map(p => `🎵 **${p.name}** — ${JSON.parse(p.songs).length} songs`).join('\n');
      return interaction.reply({ embeds: [embed(0x1DB954).setTitle('📋 Your Playlists').setDescription(list)], ephemeral: true });
    }

    // ── Delete Playlist ─────────────────────────────────────
    if (sub === 'deleteplaylist') {
      const name = interaction.options.getString('name');
      const pl   = db.get('SELECT id FROM playlists WHERE guild_id=? AND user_id=? AND name=?', interaction.guildId, interaction.user.id, name);
      if (!pl) return interaction.reply({ embeds: [error('Not Found', `Playlist "**${name}**" not found.`)], ephemeral: true });
      db.run('DELETE FROM playlists WHERE id=?', pl.id);
      return interaction.reply({ embeds: [success('Deleted', `Playlist "**${name}**" deleted.`)] });
    }
  },
};
