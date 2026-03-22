// modules/tickets/_handler.js  (button + event handler)
const { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database');
const { embed, success, error } = require('../../utils/embed');

async function openTicket(guild, user, client, topic = null) {
  const cfg = db.get('SELECT * FROM ticket_config WHERE guild_id = ?', guild.id);
  if (!cfg) return null;

  const existing = db.get("SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status = 'open'", guild.id, user.id);
  if (existing && (cfg.max_tickets || 1) <= 1) return { error: 'You already have an open ticket.' };

  const lastNum = db.get('SELECT MAX(ticket_num) as n FROM tickets WHERE guild_id = ?', guild.id)?.n || 0;
  const ticketNum = lastNum + 1;

  const channel = await guild.channels.create({
    name: `ticket-${String(ticketNum).padStart(4, '0')}`,
    type: ChannelType.GuildText,
    parent: cfg.category_id || null,
    permissionOverwrites: [
      { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
      { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      ...(cfg.support_role ? [{ id: cfg.support_role, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }] : []),
    ],
  });

  db.run('INSERT INTO tickets (guild_id, channel_id, user_id, ticket_num, topic, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    guild.id, channel.id, user.id, ticketNum, topic, Math.floor(Date.now() / 1000));

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket:close').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
    new ButtonBuilder().setCustomId('ticket:claim').setLabel('Claim').setStyle(ButtonStyle.Secondary).setEmoji('✋'),
  );

  await channel.send({
    content: `${user} ${cfg.support_role ? `<@&${cfg.support_role}>` : ''}`,
    embeds: [embed(0x5865F2)
      .setTitle(`🎫 Ticket #${String(ticketNum).padStart(4, '0')}`)
      .setDescription(cfg.welcome_msg || 'Welcome! Support will be with you shortly.')
      .addFields(
        { name: 'Opened by', value: `${user}`, inline: true },
        { name: 'Topic', value: topic || 'None', inline: true },
      )],
    components: [closeRow],
  });

  return { channel, ticketNum };
}

async function closeTicket(interaction, client) {
  const ticket = db.get("SELECT * FROM tickets WHERE channel_id = ? AND status = 'open'", interaction.channel.id);
  if (!ticket) return interaction.reply({ content: 'This is not an open ticket.', ephemeral: true });

  db.run("UPDATE tickets SET status = 'closed', closed_at = ? WHERE channel_id = ?", Math.floor(Date.now() / 1000), interaction.channel.id);

  await interaction.reply({ embeds: [embed(0xED4245).setTitle('🔒 Ticket Closing').setDescription('This ticket will be deleted in 5 seconds.')] });
  setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);

  const cfg = db.get('SELECT * FROM ticket_config WHERE guild_id = ?', interaction.guildId);
  if (cfg?.log_channel) {
    const logCh = await client.channels.fetch(cfg.log_channel).catch(() => null);
    if (logCh) {
      const opener = await client.users.fetch(ticket.user_id).catch(() => null);
      logCh.send({ embeds: [embed(0xED4245)
        .setTitle(`🔒 Ticket #${String(ticket.ticket_num).padStart(4,'0')} Closed`)
        .addFields(
          { name: 'Opened by', value: opener ? `${opener.tag}` : ticket.user_id, inline: true },
          { name: 'Closed by', value: `${interaction.user.tag}`, inline: true },
        )] });
    }
  }
}

async function onButton(interaction, client) {
  const action = interaction.customId.split(':')[1];
  if (action === 'close') return closeTicket(interaction, client);
  if (action === 'claim') {
    const ticket = db.get("SELECT * FROM tickets WHERE channel_id = ?", interaction.channel.id);
    if (!ticket) return;
    db.run('UPDATE tickets SET claimed_by = ? WHERE channel_id = ?', interaction.user.id, interaction.channel.id);
    interaction.reply({ embeds: [success('Ticket Claimed', `${interaction.user} has claimed this ticket.`)] });
  }
  if (action === 'open') {
    const result = await openTicket(interaction.guild, interaction.user, client);
    if (result?.error) return interaction.reply({ content: result.error, ephemeral: true });
    if (result?.channel) interaction.reply({ content: `✅ Your ticket has been opened: ${result.channel}`, ephemeral: true });
  }
}

module.exports = { openTicket, closeTicket, onButton };
