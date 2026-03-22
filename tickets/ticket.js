// modules/tickets/ticket.js  (all ticket commands)
const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database');
const { success, error, embed } = require('../../utils/embed');
const { openTicket } = require('./_handler');

module.exports = {
  module: 'tickets',
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ticket system commands')
    .addSubcommand(s => s.setName('open').setDescription('Open a support ticket')
      .addStringOption(o => o.setName('topic').setDescription('What is your question about?').setRequired(false)))
    .addSubcommand(s => s.setName('close').setDescription('Close the current ticket'))
    .addSubcommand(s => s.setName('claim').setDescription('Claim a ticket'))
    .addSubcommand(s => s.setName('unclaim').setDescription('Unclaim a ticket'))
    .addSubcommand(s => s.setName('add').setDescription('Add a user to the ticket')
      .addUserOption(o => o.setName('user').setDescription('User to add').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove a user from the ticket')
      .addUserOption(o => o.setName('user').setDescription('User to remove').setRequired(true)))
    .addSubcommand(s => s.setName('rename').setDescription('Rename the ticket channel')
      .addStringOption(o => o.setName('name').setDescription('New name').setRequired(true)))
    .addSubcommand(s => s.setName('panel').setDescription('Create a ticket panel in a channel (Admin)')
      .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true))
      .addStringOption(o => o.setName('title').setDescription('Panel title').setRequired(false))
      .addStringOption(o => o.setName('description').setDescription('Panel description').setRequired(false))),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'open') {
      const topic  = interaction.options.getString('topic');
      const result = await openTicket(interaction.guild, interaction.user, client, topic);
      if (result?.error) return interaction.reply({ content: result.error, ephemeral: true });
      return interaction.reply({ content: `✅ Ticket opened: ${result.channel}`, ephemeral: true });
    }

    if (sub === 'close') {
      const ticket = db.get("SELECT * FROM tickets WHERE channel_id = ? AND status = 'open'", interaction.channelId);
      if (!ticket) return interaction.reply({ embeds: [error('Not a Ticket', 'This command must be run in an open ticket channel.')], ephemeral: true });
      const { closeTicket } = require('./_handler');
      return closeTicket(interaction, client);
    }

    if (sub === 'claim') {
      const ticket = db.get("SELECT * FROM tickets WHERE channel_id = ?", interaction.channelId);
      if (!ticket) return interaction.reply({ embeds: [error('Not a Ticket', 'Not in a ticket channel.')], ephemeral: true });
      db.run('UPDATE tickets SET claimed_by = ? WHERE channel_id = ?', interaction.user.id, interaction.channelId);
      return interaction.reply({ embeds: [success('Ticket Claimed', `${interaction.user} claimed this ticket.`)] });
    }

    if (sub === 'unclaim') {
      db.run('UPDATE tickets SET claimed_by = NULL WHERE channel_id = ?', interaction.channelId);
      return interaction.reply({ embeds: [success('Ticket Unclaimed', 'Ticket is no longer claimed.')] });
    }

    if (sub === 'add') {
      const user = interaction.options.getMember('user');
      await interaction.channel.permissionOverwrites.edit(user, { ViewChannel: true, SendMessages: true });
      return interaction.reply({ embeds: [success('User Added', `${user} has been added to the ticket.`)] });
    }

    if (sub === 'remove') {
      const user = interaction.options.getMember('user');
      await interaction.channel.permissionOverwrites.edit(user, { ViewChannel: false });
      return interaction.reply({ embeds: [success('User Removed', `${user} has been removed from the ticket.`)] });
    }

    if (sub === 'rename') {
      const name = interaction.options.getString('name').toLowerCase().replace(/\s+/g, '-');
      await interaction.channel.setName(name);
      return interaction.reply({ embeds: [success('Renamed', `Channel renamed to **${name}**.`)] });
    }

    if (sub === 'panel') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return interaction.reply({ embeds: [error('No Permission', 'Admin only.')], ephemeral: true });

      const channel = interaction.options.getChannel('channel');
      const title   = interaction.options.getString('title')       || '🎫 Support Tickets';
      const desc    = interaction.options.getString('description') || 'Click the button below to open a support ticket.';

      const panelRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket:open').setLabel('Open Ticket').setStyle(ButtonStyle.Primary).setEmoji('🎫'),
      );

      const msg = await channel.send({ embeds: [embed(0x5865F2).setTitle(title).setDescription(desc)], components: [panelRow] });
      db.run('INSERT OR REPLACE INTO ticket_config (guild_id, panel_channel, panel_msg_id) VALUES (?, ?, ?) ON CONFLICT (guild_id) DO UPDATE SET panel_channel=excluded.panel_channel, panel_msg_id=excluded.panel_msg_id', interaction.guildId, channel.id, msg.id);
      return interaction.reply({ embeds: [success('Panel Created', `Ticket panel posted in ${channel}.`)], ephemeral: true });
    }
  },
};
