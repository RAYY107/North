// modules/music/playlist.js  — save / load / delete playlists
const { SlashCommandBuilder } = require('discord.js');
const { getDistube } = require('./_player');
const db = require('../../database');
const { success, error, embed } = require('../../utils/embed');

// Create playlists table if not exists
db.run(`CREATE TABLE IF NOT EXISTS playlists (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id  TEXT NOT NULL,
  user_id   TEXT NOT NULL,
  name      TEXT NOT NULL,
  songs     TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL
)`);

module.exports = {
  module: 'music',
  data: new SlashCommandBuilder()
    .setName('playlist')
    .setDescription('Manage your personal playlists')
    .addSubcommand(s => s.setName('save').setDescription('Save the current queue as a playlist')
      .addStringOption(o => o.setName('name').setDescription('Playlist name').setRequired(true)))
    .addSubcommand(s => s.setName('load').setDescription('Load a saved playlist')
      .addStringOption(o => o.setName('name').setDescription('Playlist name').setRequired(true)))
    .addSubcommand(s => s.setName('delete').setDescription('Delete a playlist')
      .addStringOption(o => o.setName('name').setDescription('Playlist name').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('View your saved playlists')),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'save') {
      const name    = interaction.options.getString('name');
      const distube = getDistube(client);
      const queue   = distube.getQueue(interaction.guildId);
      if (!queue?.songs.length) return interaction.reply({ embeds: [error('Empty Queue', 'Nothing in the queue to save.')], ephemeral: true });

      const songs = queue.songs.map(s => ({ name: s.name, url: s.url }));
      const exists = db.get('SELECT id FROM playlists WHERE guild_id=? AND user_id=? AND name=?', interaction.guildId, interaction.user.id, name);
      if (exists) {
        db.run('UPDATE playlists SET songs=? WHERE id=?', JSON.stringify(songs), exists.id);
      } else {
        db.run('INSERT INTO playlists (guild_id, user_id, name, songs, created_at) VALUES (?, ?, ?, ?, ?)',
          interaction.guildId, interaction.user.id, name, JSON.stringify(songs), Math.floor(Date.now()/1000));
      }
      return interaction.reply({ embeds: [success('Playlist Saved', `Saved **${songs.length}** songs as "**${name}**".`)] });
    }

    if (sub === 'load') {
      const name = interaction.options.getString('name');
      const pl   = db.get('SELECT * FROM playlists WHERE guild_id=? AND user_id=? AND name=?', interaction.guildId, interaction.user.id, name);
      if (!pl) return interaction.reply({ embeds: [error('Not Found', `Playlist "**${name}**" not found.`)], ephemeral: true });

      const vc = interaction.member?.voice?.channel;
      if (!vc) return interaction.reply({ embeds: [error('Not in Voice', 'Join a voice channel first.')], ephemeral: true });

      const songs  = JSON.parse(pl.songs);
      await interaction.deferReply();
      const distube = getDistube(client);
      for (const song of songs) {
        await distube.play(vc, song.url, { member: interaction.member, textChannel: interaction.channel }).catch(() => {});
      }
      interaction.editReply({ embeds: [success('Playlist Loaded', `Queued **${songs.length}** songs from "**${name}**".`)] });
    }

    if (sub === 'delete') {
      const name = interaction.options.getString('name');
      const pl   = db.get('SELECT id FROM playlists WHERE guild_id=? AND user_id=? AND name=?', interaction.guildId, interaction.user.id, name);
      if (!pl) return interaction.reply({ embeds: [error('Not Found', `Playlist "**${name}**" not found.`)], ephemeral: true });
      db.run('DELETE FROM playlists WHERE id=?', pl.id);
      return interaction.reply({ embeds: [success('Deleted', `Playlist "**${name}**" deleted.`)] });
    }

    if (sub === 'list') {
      const playlists = db.all('SELECT name, songs FROM playlists WHERE guild_id=? AND user_id=? ORDER BY created_at DESC', interaction.guildId, interaction.user.id);
      if (!playlists.length) return interaction.reply({ embeds: [embed().setTitle('📋 Your Playlists').setDescription('No saved playlists.')], ephemeral: true });
      const list = playlists.map(p => `🎵 **${p.name}** — ${JSON.parse(p.songs).length} songs`).join('\n');
      return interaction.reply({ embeds: [embed(0x1DB954).setTitle('📋 Your Playlists').setDescription(list)], ephemeral: true });
    }
  },
};
