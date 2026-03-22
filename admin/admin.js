// modules/admin/admin.js  — Full admin panel for North Bot
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { success, error, embed } = require('../../utils/embed');

const ALL_MODULES = ['moderation','economy','leveling','voice','tickets','giveaways','logging','fun','utility','welcome','reactionroles','automod','announcements'];

module.exports = {
  module: 'admin',
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('North Bot server configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('overview').setDescription('Full server config overview'))
    .addSubcommand(s => s.setName('module').setDescription('Enable or disable a module')
      .addStringOption(o => o.setName('module').setDescription('Module name').setRequired(true)
        .addChoices(...ALL_MODULES.map(m => ({ name: m, value: m }))))
      .addBooleanOption(o => o.setName('enabled').setDescription('Enable or disable').setRequired(true)))
    .addSubcommand(s => s.setName('modlog').setDescription('Set mod log channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)))
    .addSubcommand(s => s.setName('muterole').setDescription('Set the mute role')
      .addRoleOption(o => o.setName('role').setDescription('Mute role').setRequired(true)))
    .addSubcommand(s => s.setName('reset').setDescription('⚠️ Reset ALL bot data for this server'))
    .addSubcommand(s => s.setName('modules').setDescription('List all module statuses')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'overview') {
      const cfg      = db.getGuildConfig(interaction.guildId);
      const disabled = cfg.modules_disabled;
      const modules  = ALL_MODULES.map(m => `${disabled.includes(m) ? '❌' : '✅'} ${m}`).join('\n');

      return interaction.reply({ ephemeral: true, embeds: [embed(0x00B4D8)
        .setTitle(`⚙️ Config — ${interaction.guild.name}`)
        .setThumbnail(interaction.guild.iconURL())
        .addFields(
          { name: 'Mod Log',     value: cfg.mod_log_channel ? `<#${cfg.mod_log_channel}>` : 'Not set', inline: true },
          { name: 'Log Channel', value: cfg.log_channel     ? `<#${cfg.log_channel}>`     : 'Not set', inline: true },
          { name: 'Mute Role',   value: cfg.mute_role       ? `<@&${cfg.mute_role}>`      : 'Not set', inline: true },
          { name: 'Auto-Role',   value: cfg.autorole        ? `<@&${cfg.autorole}>`        : 'Not set', inline: true },
          { name: 'Level Channel', value: cfg.level_channel ? `<#${cfg.level_channel}>`   : 'Not set', inline: true },
          { name: 'Modules',     value: modules,                                                         inline: false },
        )] });
    }

    if (sub === 'module') {
      const modName = interaction.options.getString('module');
      const enabled = interaction.options.getBoolean('enabled');
      const cfg     = db.getGuildConfig(interaction.guildId);
      const list    = cfg.modules_disabled;

      if (!enabled && !list.includes(modName)) list.push(modName);
      if (enabled  &&  list.includes(modName)) list.splice(list.indexOf(modName), 1);

      db.setGuildField(interaction.guildId, 'modules_disabled', JSON.stringify(list));
      return interaction.reply({ embeds: [success('Module Updated', `**${modName}** is now **${enabled ? 'enabled' : 'disabled'}**.`)] });
    }

    if (sub === 'modules') {
      const cfg      = db.getGuildConfig(interaction.guildId);
      const disabled = cfg.modules_disabled;
      const list     = ALL_MODULES.map(m => `${disabled.includes(m) ? '❌' : '✅'} **${m}**`).join('\n');
      return interaction.reply({ ephemeral: true, embeds: [embed(0x5865F2).setTitle('📦 Module Status').setDescription(list)] });
    }

    if (sub === 'modlog') {
      const ch = interaction.options.getChannel('channel');
      db.setGuildField(interaction.guildId, 'mod_log_channel', ch.id);
      return interaction.reply({ embeds: [success('Mod Log Set', `Mod actions will be logged in ${ch}.`)] });
    }

    if (sub === 'muterole') {
      const role = interaction.options.getRole('role');
      db.setGuildField(interaction.guildId, 'mute_role', role.id);
      return interaction.reply({ embeds: [success('Mute Role Set', `${role} is now the mute role.`)] });
    }

    if (sub === 'reset') {
      // Full reset for all guild data
      const tables = ['guild_config','mod_cases','warns','notes','levels','level_rewards','level_config','economy','inventory','shop_items','voice_sessions','voice_totals','voice_config','tickets','ticket_config','giveaways','automod_config','welcome_config','reaction_roles','button_roles','select_roles','log_config','snipe','edit_snipe','afk','reminders','scheduled_announcements'];
      for (const t of tables) {
        try { db.run(`DELETE FROM ${t} WHERE guild_id = ?`, interaction.guildId); } catch {}
      }
      return interaction.reply({ embeds: [success('Server Reset', '⚠️ All North Bot data for this server has been wiped.')], ephemeral: true });
    }
  },
};
