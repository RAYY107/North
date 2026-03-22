// modules/automod/automod.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { success, embed } = require('../../utils/embed');

module.exports = {
  module: 'automod',
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure AutoMod')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('enable').setDescription('Enable AutoMod'))
    .addSubcommand(s => s.setName('disable').setDescription('Disable AutoMod'))
    .addSubcommand(s => s.setName('status').setDescription('View AutoMod settings'))
    .addSubcommand(s => s.setName('antispam').setDescription('Toggle anti-spam')
      .addBooleanOption(o => o.setName('enabled').setDescription('Enable/disable').setRequired(true))
      .addIntegerOption(o => o.setName('threshold').setDescription('Messages before trigger').setRequired(false).setMinValue(2).setMaxValue(20))
      .addIntegerOption(o => o.setName('interval').setDescription('Time window in seconds').setRequired(false).setMinValue(2).setMaxValue(30)))
    .addSubcommand(s => s.setName('antilinks').setDescription('Toggle anti-links').addBooleanOption(o => o.setName('enabled').setDescription('Enable/disable').setRequired(true)))
    .addSubcommand(s => s.setName('antiinvites').setDescription('Toggle anti-invites').addBooleanOption(o => o.setName('enabled').setDescription('Enable/disable').setRequired(true)))
    .addSubcommand(s => s.setName('anticaps').setDescription('Toggle anti-caps')
      .addBooleanOption(o => o.setName('enabled').setDescription('Enable/disable').setRequired(true))
      .addIntegerOption(o => o.setName('threshold').setDescription('Caps % threshold (default 70)').setRequired(false).setMinValue(10).setMaxValue(100)))
    .addSubcommand(s => s.setName('antiemoji').setDescription('Toggle anti-emoji spam')
      .addBooleanOption(o => o.setName('enabled').setDescription('Enable/disable').setRequired(true))
      .addIntegerOption(o => o.setName('threshold').setDescription('Max emojis per message').setRequired(false).setMinValue(1).setMaxValue(50)))
    .addSubcommand(s => s.setName('antimentions').setDescription('Toggle anti-mass mentions')
      .addBooleanOption(o => o.setName('enabled').setDescription('Enable/disable').setRequired(true))
      .addIntegerOption(o => o.setName('threshold').setDescription('Max mentions per message').setRequired(false).setMinValue(2).setMaxValue(20)))
    .addSubcommand(s => s.setName('antizalgo').setDescription('Toggle anti-zalgo text').addBooleanOption(o => o.setName('enabled').setDescription('Enable/disable').setRequired(true)))
    .addSubcommand(s => s.setName('wordfilter').setDescription('Toggle word filter').addBooleanOption(o => o.setName('enabled').setDescription('Enable/disable').setRequired(true)))
    .addSubcommand(s => s.setName('addword').setDescription('Add a word to the filter').addStringOption(o => o.setName('word').setDescription('Word to ban').setRequired(true)))
    .addSubcommand(s => s.setName('removeword').setDescription('Remove a word from the filter').addStringOption(o => o.setName('word').setDescription('Word to remove').setRequired(true)))
    // FIX: renamed option from 'action' to 'type' to avoid conflict with subcommand name 'action'
    .addSubcommand(s => s.setName('action').setDescription('Set the action taken when triggered')
      .addStringOption(o => o.setName('type').setDescription('Action to take').setRequired(true).addChoices({ name: 'Warn', value: 'warn' }, { name: 'Timeout (5m)', value: 'timeout' }, { name: 'Kick', value: 'kick' })))
    .addSubcommand(s => s.setName('logchannel').setDescription('Set AutoMod log channel').addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)))
    .addSubcommand(s => s.setName('exempt').setDescription('Exempt a channel or role')
      .addChannelOption(o => o.setName('channel').setDescription('Channel to exempt').setRequired(false))
      .addRoleOption(o => o.setName('role').setDescription('Role to exempt').setRequired(false))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    db.run('INSERT OR IGNORE INTO automod_config (guild_id) VALUES (?)', interaction.guildId);

    if (sub === 'enable')  { db.run('UPDATE automod_config SET enabled=1 WHERE guild_id=?', interaction.guildId); return interaction.reply({ embeds: [success('AutoMod Enabled', 'AutoMod is now active.')] }); }
    if (sub === 'disable') { db.run('UPDATE automod_config SET enabled=0 WHERE guild_id=?', interaction.guildId); return interaction.reply({ embeds: [success('AutoMod Disabled', 'AutoMod has been turned off.')] }); }

    if (sub === 'status') {
      const c = db.get('SELECT * FROM automod_config WHERE guild_id=?', interaction.guildId);
      return interaction.reply({ ephemeral: true, embeds: [embed(0xED4245).setTitle('🤖 AutoMod Status').addFields(
        { name: 'Enabled',     value: c.enabled ? '✅' : '❌',                inline: true },
        { name: 'Anti-Spam',   value: c.anti_spam ? '✅' : '❌',              inline: true },
        { name: 'Anti-Links',  value: c.anti_links ? '✅' : '❌',             inline: true },
        { name: 'Anti-Invite', value: c.anti_invites ? '✅' : '❌',           inline: true },
        { name: 'Anti-Caps',   value: c.anti_caps ? '✅' : '❌',              inline: true },
        { name: 'Anti-Emoji',  value: c.anti_emoji ? '✅' : '❌',             inline: true },
        { name: 'Anti-Mention',value: c.anti_mentions ? '✅' : '❌',          inline: true },
        { name: 'Anti-Zalgo',  value: c.anti_zalgo ? '✅' : '❌',             inline: true },
        { name: 'Word Filter', value: c.word_filter ? '✅' : '❌',            inline: true },
        { name: 'Action',      value: c.action,                               inline: true },
        { name: 'Log Channel', value: c.log_channel ? `<#${c.log_channel}>` : 'Not set', inline: true },
        { name: 'Banned Words',value: `${JSON.parse(c.banned_words||'[]').length} words`, inline: true },
      )] });
    }

    if (sub === 'antispam') {
      const on = interaction.options.getBoolean('enabled');
      const th = interaction.options.getInteger('threshold');
      const iv = interaction.options.getInteger('interval');
      let sql = 'UPDATE automod_config SET anti_spam=?';
      const params = [on ? 1 : 0];
      if (th) { sql += ', spam_threshold=?'; params.push(th); }
      if (iv) { sql += ', spam_interval=?'; params.push(iv); }
      sql += ' WHERE guild_id=?'; params.push(interaction.guildId);
      db.run(sql, ...params);
      return interaction.reply({ embeds: [success('Anti-Spam', `Anti-spam **${on ? 'enabled' : 'disabled'}**.`)] });
    }
    if (sub === 'antilinks')   { db.run('UPDATE automod_config SET anti_links=? WHERE guild_id=?', interaction.options.getBoolean('enabled')?1:0, interaction.guildId); return interaction.reply({ embeds: [success('Anti-Links', `Anti-links **${interaction.options.getBoolean('enabled')?'enabled':'disabled'}**.`)] }); }
    if (sub === 'antiinvites') { db.run('UPDATE automod_config SET anti_invites=? WHERE guild_id=?', interaction.options.getBoolean('enabled')?1:0, interaction.guildId); return interaction.reply({ embeds: [success('Anti-Invites', `Anti-invites **${interaction.options.getBoolean('enabled')?'enabled':'disabled'}**.`)] }); }
    if (sub === 'anticaps')    { const on=interaction.options.getBoolean('enabled'), th=interaction.options.getInteger('threshold'); db.run(`UPDATE automod_config SET anti_caps=?${th?', caps_threshold=?':''} WHERE guild_id=?`, ...(th?[on?1:0,th]:[on?1:0]), interaction.guildId); return interaction.reply({ embeds: [success('Anti-Caps', `Anti-caps **${on?'enabled':'disabled'}**.`)] }); }
    if (sub === 'antiemoji')   { const on=interaction.options.getBoolean('enabled'), th=interaction.options.getInteger('threshold'); db.run(`UPDATE automod_config SET anti_emoji=?${th?', emoji_threshold=?':''} WHERE guild_id=?`, ...(th?[on?1:0,th]:[on?1:0]), interaction.guildId); return interaction.reply({ embeds: [success('Anti-Emoji', `Anti-emoji **${on?'enabled':'disabled'}**.`)] }); }
    if (sub === 'antimentions'){ const on=interaction.options.getBoolean('enabled'), th=interaction.options.getInteger('threshold'); db.run(`UPDATE automod_config SET anti_mentions=?${th?', mention_threshold=?':''} WHERE guild_id=?`, ...(th?[on?1:0,th]:[on?1:0]), interaction.guildId); return interaction.reply({ embeds: [success('Anti-Mentions', `Anti-mentions **${on?'enabled':'disabled'}**.`)] }); }
    if (sub === 'antizalgo')   { db.run('UPDATE automod_config SET anti_zalgo=? WHERE guild_id=?', interaction.options.getBoolean('enabled')?1:0, interaction.guildId); return interaction.reply({ embeds: [success('Anti-Zalgo', 'Updated.')] }); }
    if (sub === 'wordfilter')  { db.run('UPDATE automod_config SET word_filter=? WHERE guild_id=?', interaction.options.getBoolean('enabled')?1:0, interaction.guildId); return interaction.reply({ embeds: [success('Word Filter', 'Updated.')] }); }
    if (sub === 'addword') {
      const word = interaction.options.getString('word').toLowerCase();
      const cfg  = db.get('SELECT banned_words FROM automod_config WHERE guild_id=?', interaction.guildId);
      const list = JSON.parse(cfg.banned_words||'[]');
      if (!list.includes(word)) list.push(word);
      db.run('UPDATE automod_config SET banned_words=? WHERE guild_id=?', JSON.stringify(list), interaction.guildId);
      return interaction.reply({ embeds: [success('Word Added', `"${word}" added to the filter.`)], ephemeral: true });
    }
    if (sub === 'removeword') {
      const word = interaction.options.getString('word').toLowerCase();
      const cfg  = db.get('SELECT banned_words FROM automod_config WHERE guild_id=?', interaction.guildId);
      const list = JSON.parse(cfg.banned_words||'[]').filter(w => w !== word);
      db.run('UPDATE automod_config SET banned_words=? WHERE guild_id=?', JSON.stringify(list), interaction.guildId);
      return interaction.reply({ embeds: [success('Word Removed', `"${word}" removed from filter.`)], ephemeral: true });
    }
    if (sub === 'action') {
      // FIX: option is now named 'type' instead of 'action' to avoid name conflict with subcommand
      const actionType = interaction.options.getString('type');
      db.run('UPDATE automod_config SET action=? WHERE guild_id=?', actionType, interaction.guildId);
      return interaction.reply({ embeds: [success('Action Set', `AutoMod will now **${actionType}** violators.`)] });
    }
    if (sub === 'logchannel') {
      const ch = interaction.options.getChannel('channel');
      db.run('UPDATE automod_config SET log_channel=? WHERE guild_id=?', ch.id, interaction.guildId);
      return interaction.reply({ embeds: [success('Log Channel Set', `AutoMod logs sent to ${ch}.`)] });
    }
    if (sub === 'exempt') {
      const ch   = interaction.options.getChannel('channel');
      const role = interaction.options.getRole('role');
      const cfg  = db.get('SELECT whitelist_channels, whitelist_roles FROM automod_config WHERE guild_id=?', interaction.guildId);
      const chs  = JSON.parse(cfg.whitelist_channels||'[]');
      const ros  = JSON.parse(cfg.whitelist_roles||'[]');
      if (ch   && !chs.includes(ch.id))   chs.push(ch.id);
      if (role && !ros.includes(role.id)) ros.push(role.id);
      db.run('UPDATE automod_config SET whitelist_channels=?, whitelist_roles=? WHERE guild_id=?', JSON.stringify(chs), JSON.stringify(ros), interaction.guildId);
      return interaction.reply({ embeds: [success('Exempted', `${ch||''} ${role||''} exempted from AutoMod.`)] });
    }
  },
};
