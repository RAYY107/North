// modules/leveling/xpmanage.js  (setxp, addxp, removexp, resetxp)
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { success, error } = require('../../utils/embed');

module.exports = {
  module: 'leveling',
  data: new SlashCommandBuilder()
    .setName('xp')
    .setDescription('Manage XP for a user (Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('set').setDescription('Set XP for a user')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('XP amount').setRequired(true).setMinValue(0)))
    .addSubcommand(s => s.setName('add').setDescription('Add XP to a user')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('XP to add').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove XP from a user')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('XP to remove').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('reset').setDescription('Reset all XP for a user')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))),

  async execute(interaction) {
    const sub    = interaction.options.getSubcommand();
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    db.getLevels(interaction.guildId, target.id);
    const { xpForLevel } = require('../../database');

    if (sub === 'set') {
      let level = 0;
      while (xpForLevel(level + 1) <= amount) level++;
      db.run('UPDATE levels SET xp = ?, level = ? WHERE guild_id = ? AND user_id = ?', amount, level, interaction.guildId, target.id);
      return interaction.reply({ embeds: [success('XP Set', `Set **${target.tag}**'s XP to **${amount}** (Level ${level}).`)] });
    }
    if (sub === 'add') {
      db.addXP(interaction.guildId, target.id, amount);
      return interaction.reply({ embeds: [success('XP Added', `Added **${amount}** XP to **${target.tag}**.`)] });
    }
    if (sub === 'remove') {
      const data = db.getLevels(interaction.guildId, target.id);
      const newXP = Math.max(0, data.xp - amount);
      let level = 0;
      while (xpForLevel(level + 1) <= newXP) level++;
      db.run('UPDATE levels SET xp = ?, level = ? WHERE guild_id = ? AND user_id = ?', newXP, level, interaction.guildId, target.id);
      return interaction.reply({ embeds: [success('XP Removed', `Removed **${amount}** XP from **${target.tag}**.`)] });
    }
    if (sub === 'reset') {
      db.run('UPDATE levels SET xp = 0, level = 0, messages = 0 WHERE guild_id = ? AND user_id = ?', interaction.guildId, target.id);
      return interaction.reply({ embeds: [success('XP Reset', `Reset **${target.tag}**'s XP to 0.`)] });
    }
  },
};
