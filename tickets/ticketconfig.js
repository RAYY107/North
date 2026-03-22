// modules/tickets/ticketconfig.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { success, embed } = require('../../utils/embed');

module.exports = {
  module: 'tickets',
  data: new SlashCommandBuilder()
    .setName('ticketconfig')
    .setDescription('Configure the ticket system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('status').setDescription('View ticket config'))
    .addSubcommand(s => s.setName('category').setDescription('Set ticket category')
      .addChannelOption(o => o.setName('category').setDescription('Category channel').setRequired(true)))
    .addSubcommand(s => s.setName('logchannel').setDescription('Set ticket log channel')
      .addChannelOption(o => o.setName('channel').setDescription('Log channel').setRequired(true)))
    .addSubcommand(s => s.setName('supportrole').setDescription('Set support role')
      .addRoleOption(o => o.setName('role').setDescription('Support role').setRequired(true)))
    .addSubcommand(s => s.setName('maxtickets').setDescription('Max open tickets per user')
      .addIntegerOption(o => o.setName('max').setDescription('Max tickets').setRequired(true).setMinValue(1).setMaxValue(5)))
    .addSubcommand(s => s.setName('welcomemsg').setDescription('Set the welcome message for new tickets')
      .addStringOption(o => o.setName('message').setDescription('Welcome message').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    db.run('INSERT OR IGNORE INTO ticket_config (guild_id) VALUES (?)', interaction.guildId);

    if (sub === 'status') {
      const cfg = db.get('SELECT * FROM ticket_config WHERE guild_id = ?', interaction.guildId);
      return interaction.reply({ ephemeral: true, embeds: [embed(0x5865F2).setTitle('🎫 Ticket Config')
        .addFields(
          { name: 'Category',     value: cfg?.category_id  ? `<#${cfg.category_id}>` : 'Not set',  inline: true },
          { name: 'Log Channel',  value: cfg?.log_channel  ? `<#${cfg.log_channel}>` : 'Not set',  inline: true },
          { name: 'Support Role', value: cfg?.support_role ? `<@&${cfg.support_role}>` : 'Not set', inline: true },
          { name: 'Max Tickets',  value: `${cfg?.max_tickets || 1}`,                                 inline: true },
          { name: 'Welcome Msg',  value: cfg?.welcome_msg || 'Default',                              inline: false },
        )] });
    }
    if (sub === 'category') {
      const cat = interaction.options.getChannel('category');
      db.run('UPDATE ticket_config SET category_id = ? WHERE guild_id = ?', cat.id, interaction.guildId);
      return interaction.reply({ embeds: [success('Category Set', `Tickets will be created in **${cat.name}**.`)] });
    }
    if (sub === 'logchannel') {
      const ch = interaction.options.getChannel('channel');
      db.run('UPDATE ticket_config SET log_channel = ? WHERE guild_id = ?', ch.id, interaction.guildId);
      return interaction.reply({ embeds: [success('Log Channel Set', `Ticket logs will be sent to ${ch}.`)] });
    }
    if (sub === 'supportrole') {
      const role = interaction.options.getRole('role');
      db.run('UPDATE ticket_config SET support_role = ? WHERE guild_id = ?', role.id, interaction.guildId);
      return interaction.reply({ embeds: [success('Support Role Set', `${role} will have access to all tickets.`)] });
    }
    if (sub === 'maxtickets') {
      const max = interaction.options.getInteger('max');
      db.run('UPDATE ticket_config SET max_tickets = ? WHERE guild_id = ?', max, interaction.guildId);
      return interaction.reply({ embeds: [success('Max Tickets Set', `Users can now open up to **${max}** ticket(s).`)] });
    }
    if (sub === 'welcomemsg') {
      const msg = interaction.options.getString('message');
      db.run('UPDATE ticket_config SET welcome_msg = ? WHERE guild_id = ?', msg, interaction.guildId);
      return interaction.reply({ embeds: [success('Welcome Message Updated', `New tickets will show: *${msg}*`)] });
    }
  },
};
