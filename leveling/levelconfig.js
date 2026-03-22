// modules/leveling/levelconfig.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { success, error, embed } = require('../../utils/embed');

module.exports = {
  module: 'leveling',
  data: new SlashCommandBuilder()
    .setName('levelconfig')
    .setDescription('Configure the leveling system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('status').setDescription('View current leveling config'))
    .addSubcommand(s => s.setName('channel').setDescription('Set level-up announcement channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)))
    .addSubcommand(s => s.setName('xprate').setDescription('Set XP per message range')
      .addIntegerOption(o => o.setName('min').setDescription('Min XP').setRequired(true).setMinValue(1).setMaxValue(100))
      .addIntegerOption(o => o.setName('max').setDescription('Max XP').setRequired(true).setMinValue(1).setMaxValue(100)))
    .addSubcommand(s => s.setName('cooldown').setDescription('Set XP cooldown in seconds')
      .addIntegerOption(o => o.setName('seconds').setDescription('Cooldown').setRequired(true).setMinValue(5).setMaxValue(3600)))
    .addSubcommand(s => s.setName('multiplier').setDescription('Set XP multiplier')
      .addNumberOption(o => o.setName('value').setDescription('Multiplier (e.g. 1.5 = 150%)').setRequired(true).setMinValue(0.1).setMaxValue(10)))
    .addSubcommand(s => s.setName('levelrole').setDescription('Assign a role reward for reaching a level')
      .addIntegerOption(o => o.setName('level').setDescription('Level').setRequired(true).setMinValue(1))
      .addRoleOption(o => o.setName('role').setDescription('Role to grant').setRequired(true)))
    .addSubcommand(s => s.setName('removelevelrole').setDescription('Remove a level role reward')
      .addIntegerOption(o => o.setName('level').setDescription('Level').setRequired(true)))
    .addSubcommand(s => s.setName('noxpchannel').setDescription('Toggle a no-XP channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)))
    .addSubcommand(s => s.setName('noxprole').setDescription('Toggle a no-XP role')
      .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    db.run('INSERT OR IGNORE INTO level_config (guild_id) VALUES (?)', interaction.guildId);
    const cfg = db.get('SELECT * FROM level_config WHERE guild_id = ?', interaction.guildId);

    if (sub === 'status') {
      const rewards = db.all('SELECT * FROM level_rewards WHERE guild_id = ? ORDER BY level ASC', interaction.guildId);
      const noXpCh  = JSON.parse(cfg.no_xp_channels || '[]');
      const noXpRo  = JSON.parse(cfg.no_xp_roles    || '[]');
      return interaction.reply({ embeds: [embed(0x5865F2)
        .setTitle('⭐ Leveling Config')
        .addFields(
          { name: 'XP Range',     value: `${cfg.xp_min}–${cfg.xp_max}`,                             inline: true },
          { name: 'Cooldown',     value: `${cfg.xp_cooldown}s`,                                      inline: true },
          { name: 'Multiplier',   value: `${cfg.multiplier}x`,                                       inline: true },
          { name: 'Level Roles',  value: rewards.length ? rewards.map(r => `Lv${r.level}: <@&${r.role_id}>`).join('\n') : 'None', inline: false },
          { name: 'No-XP Channels', value: noXpCh.length ? noXpCh.map(c=>`<#${c}>`).join(', ') : 'None', inline: false },
          { name: 'No-XP Roles',  value: noXpRo.length ? noXpRo.map(r=>`<@&${r}>`).join(', ') : 'None', inline: false },
        )], ephemeral: true });
    }

    if (sub === 'channel') {
      const ch = interaction.options.getChannel('channel');
      db.setGuildField(interaction.guildId, 'level_channel', ch.id);
      return interaction.reply({ embeds: [success('Level Channel Set', `Level-up messages will be sent to ${ch}.`)] });
    }
    if (sub === 'xprate') {
      const min = interaction.options.getInteger('min'), max = interaction.options.getInteger('max');
      if (min > max) return interaction.reply({ embeds: [error('Invalid', 'Min must be less than max.')], ephemeral: true });
      db.run('UPDATE level_config SET xp_min = ?, xp_max = ? WHERE guild_id = ?', min, max, interaction.guildId);
      return interaction.reply({ embeds: [success('XP Rate Updated', `XP per message: **${min}–${max}**.`)] });
    }
    if (sub === 'cooldown') {
      const secs = interaction.options.getInteger('seconds');
      db.run('UPDATE level_config SET xp_cooldown = ? WHERE guild_id = ?', secs, interaction.guildId);
      return interaction.reply({ embeds: [success('Cooldown Updated', `XP cooldown set to **${secs}s**.`)] });
    }
    if (sub === 'multiplier') {
      const val = interaction.options.getNumber('value');
      db.run('UPDATE level_config SET multiplier = ? WHERE guild_id = ?', val, interaction.guildId);
      return interaction.reply({ embeds: [success('Multiplier Updated', `XP multiplier set to **${val}x**.`)] });
    }
    if (sub === 'levelrole') {
      const level = interaction.options.getInteger('level'), role = interaction.options.getRole('role');
      db.run('INSERT INTO level_rewards (guild_id, level, role_id) VALUES (?, ?, ?) ON CONFLICT (guild_id, level) DO UPDATE SET role_id = excluded.role_id', interaction.guildId, level, role.id);
      return interaction.reply({ embeds: [success('Level Role Set', `${role} will be granted at Level **${level}**.`)] });
    }
    if (sub === 'removelevelrole') {
      const level = interaction.options.getInteger('level');
      db.run('DELETE FROM level_rewards WHERE guild_id = ? AND level = ?', interaction.guildId, level);
      return interaction.reply({ embeds: [success('Level Role Removed', `Role reward for Level **${level}** removed.`)] });
    }
    if (sub === 'noxpchannel') {
      const ch = interaction.options.getChannel('channel');
      const list = JSON.parse(cfg.no_xp_channels || '[]');
      const idx  = list.indexOf(ch.id);
      if (idx === -1) list.push(ch.id); else list.splice(idx, 1);
      db.run('UPDATE level_config SET no_xp_channels = ? WHERE guild_id = ?', JSON.stringify(list), interaction.guildId);
      return interaction.reply({ embeds: [success('No-XP Channel', `${ch} is now **${idx === -1 ? 'added to' : 'removed from'}** the no-XP list.`)] });
    }
    if (sub === 'noxprole') {
      const role = interaction.options.getRole('role');
      const list = JSON.parse(cfg.no_xp_roles || '[]');
      const idx  = list.indexOf(role.id);
      if (idx === -1) list.push(role.id); else list.splice(idx, 1);
      db.run('UPDATE level_config SET no_xp_roles = ? WHERE guild_id = ?', JSON.stringify(list), interaction.guildId);
      return interaction.reply({ embeds: [success('No-XP Role', `${role} is now **${idx === -1 ? 'added to' : 'removed from'}** the no-XP list.`)] });
    }
  },
};
