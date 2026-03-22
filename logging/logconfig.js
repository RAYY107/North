// modules/logging/logconfig.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { success, error, embed } = require('../../utils/embed');

const LOG_EVENTS = ['msg_edit','msg_delete','member_join','member_leave','member_ban','member_unban','voice_join','voice_leave','voice_move','role_create','role_delete','channel_create','channel_delete','nickname_change','invite_create','invite_delete'];

module.exports = {
  module: 'logging',
  data: new SlashCommandBuilder()
    .setName('logconfig')
    .setDescription('Configure the logging system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('setup').setDescription('Set the log channel and enable logging')
      .addChannelOption(o => o.setName('channel').setDescription('Log channel').setRequired(true)))
    .addSubcommand(s => s.setName('disable').setDescription('Disable logging'))
    .addSubcommand(s => s.setName('toggle').setDescription('Toggle a specific log event')
      .addStringOption(o => o.setName('event').setDescription('Event to toggle').setRequired(true)
        .addChoices(...LOG_EVENTS.map(e => ({ name: e.replace(/_/g,' '), value: e })))))
    .addSubcommand(s => s.setName('ignorechannel').setDescription('Ignore a channel from logging')
      .addChannelOption(o => o.setName('channel').setDescription('Channel to ignore').setRequired(true)))
    .addSubcommand(s => s.setName('status').setDescription('View current log config')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    db.run('INSERT OR IGNORE INTO log_config (guild_id) VALUES (?)', interaction.guildId);

    if (sub === 'setup') {
      const ch = interaction.options.getChannel('channel');
      db.run('UPDATE log_config SET log_channel = ?, enabled = 1 WHERE guild_id = ?', ch.id, interaction.guildId);
      return interaction.reply({ embeds: [success('Logging Enabled', `All logs will be sent to ${ch}. Use \`/logconfig toggle\` to fine-tune events.`)] });
    }
    if (sub === 'disable') {
      db.run('UPDATE log_config SET enabled = 0 WHERE guild_id = ?', interaction.guildId);
      return interaction.reply({ embeds: [success('Logging Disabled', 'Logging has been turned off.')] });
    }
    if (sub === 'toggle') {
      const event = interaction.options.getString('event');
      const cfg   = db.get('SELECT * FROM log_config WHERE guild_id = ?', interaction.guildId);
      const current = cfg[event];
      db.run(`UPDATE log_config SET ${event} = ? WHERE guild_id = ?`, current ? 0 : 1, interaction.guildId);
      return interaction.reply({ embeds: [success('Event Toggled', `**${event.replace(/_/g,' ')}** is now **${current ? 'disabled' : 'enabled'}**.`)] });
    }
    if (sub === 'ignorechannel') {
      const ch   = interaction.options.getChannel('channel');
      const cfg  = db.get('SELECT ignored_channels FROM log_config WHERE guild_id = ?', interaction.guildId);
      const list = JSON.parse(cfg?.ignored_channels || '[]');
      const idx  = list.indexOf(ch.id);
      if (idx === -1) list.push(ch.id); else list.splice(idx, 1);
      db.run('UPDATE log_config SET ignored_channels = ? WHERE guild_id = ?', JSON.stringify(list), interaction.guildId);
      return interaction.reply({ embeds: [success('Channel Toggled', `${ch} is now **${idx === -1 ? 'ignored' : 'unignored'}** for logging.`)] });
    }
    if (sub === 'status') {
      const cfg = db.get('SELECT * FROM log_config WHERE guild_id = ?', interaction.guildId);
      if (!cfg) return interaction.reply({ embeds: [embed().setDescription('Logging not configured. Use `/logconfig setup`.')], ephemeral: true });
      const events = LOG_EVENTS.map(e => `${cfg[e] !== 0 ? '✅' : '❌'} ${e.replace(/_/g,' ')}`).join('\n');
      return interaction.reply({ ephemeral: true, embeds: [embed(0x5865F2).setTitle('📋 Log Config')
        .addFields(
          { name: 'Status',      value: cfg.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Log Channel', value: cfg.log_channel ? `<#${cfg.log_channel}>` : 'Not set', inline: true },
          { name: 'Events',      value: events, inline: false },
        )] });
    }
  },
};
