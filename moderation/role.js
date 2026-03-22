// modules/moderation/role.js  (add/remove role)
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/embed');

module.exports = {
  module: 'moderation',
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Add or remove a role from a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(s => s.setName('add').setDescription('Add a role')
      .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role to add').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove a role')
      .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role to remove').setRequired(true)))
    .addSubcommand(s => s.setName('info').setDescription('Get info about a role')
      .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'add') {
      const member = interaction.options.getMember('user');
      const role   = interaction.options.getRole('role');
      if (role.managed) return interaction.reply({ embeds: [error('Managed Role', 'This role is managed by an integration.')], ephemeral: true });
      await member.roles.add(role);
      interaction.reply({ embeds: [success('Role Added', `Added ${role} to **${member.displayName}**.`)] });
    } else if (sub === 'remove') {
      const member = interaction.options.getMember('user');
      const role   = interaction.options.getRole('role');
      await member.roles.remove(role);
      interaction.reply({ embeds: [success('Role Removed', `Removed ${role} from **${member.displayName}**.`)] });
    } else if (sub === 'info') {
      const role = interaction.options.getRole('role');
      const { embed: e } = require('../../utils/embed');
      interaction.reply({
        embeds: [e(role.color || 0x5865F2)
          .setTitle(`Role: ${role.name}`)
          .addFields(
            { name: 'ID',        value: role.id,                              inline: true },
            { name: 'Color',     value: role.hexColor,                        inline: true },
            { name: 'Members',   value: `${role.members.size}`,               inline: true },
            { name: 'Hoisted',   value: role.hoist ? 'Yes' : 'No',            inline: true },
            { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No',    inline: true },
            { name: 'Position',  value: `${role.position}`,                   inline: true },
            { name: 'Created',   value: `<t:${Math.floor(role.createdTimestamp/1000)}:R>`, inline: true },
          )],
      });
    }
  },
};
