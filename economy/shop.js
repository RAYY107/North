// modules/economy/shop.js
const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { embed, success, error } = require('../../utils/embed');
const { formatNumber } = require('../../utils/format');

module.exports = {
  module: 'economy',
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Browse or manage the server shop')
    .addSubcommand(s => s.setName('view').setDescription('View all items in the shop'))
    .addSubcommand(s => s.setName('buy').setDescription('Buy an item from the shop')
      .addIntegerOption(o => o.setName('id').setDescription('Item ID').setRequired(true))
      .addIntegerOption(o => o.setName('quantity').setDescription('Quantity').setRequired(false).setMinValue(1)))
    .addSubcommand(s => s.setName('add').setDescription('Add an item to the shop (Admin)')
      .addStringOption(o => o.setName('name').setDescription('Item name').setRequired(true))
      .addIntegerOption(o => o.setName('price').setDescription('Price in coins').setRequired(true).setMinValue(1))
      .addStringOption(o => o.setName('description').setDescription('Item description').setRequired(false))
      .addRoleOption(o => o.setName('role').setDescription('Role to grant on purchase').setRequired(false))
      .addStringOption(o => o.setName('emoji').setDescription('Item emoji').setRequired(false)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove an item from the shop (Admin)')
      .addIntegerOption(o => o.setName('id').setDescription('Item ID').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'view') {
      const items = db.all('SELECT * FROM shop_items WHERE guild_id = ? ORDER BY price ASC', interaction.guildId);
      if (!items.length) return interaction.reply({ embeds: [embed().setTitle('🛒 Shop').setDescription('The shop is empty. Admins can add items with `/shop add`.')] });
      const list = items.map(i => `**[${i.id}]** ${i.emoji} **${i.name}** — 🪙 ${formatNumber(i.price)}\n${i.description ? `> ${i.description}` : ''}${i.role_id ? `\n> 🎭 Grants <@&${i.role_id}>` : ''}`).join('\n\n');
      return interaction.reply({ embeds: [embed(0xFFD700).setTitle('🛒 Server Shop').setDescription(list)] });
    }

    if (sub === 'buy') {
      const id  = interaction.options.getInteger('id');
      const qty = interaction.options.getInteger('quantity') || 1;
      const item = db.get('SELECT * FROM shop_items WHERE id = ? AND guild_id = ?', id, interaction.guildId);
      if (!item) return interaction.reply({ embeds: [error('Not Found', `Item #${id} not found.`)], ephemeral: true });
      const total = item.price * qty;
      const eco   = db.getEconomy(interaction.guildId, interaction.user.id);
      if (eco.wallet < total) return interaction.reply({ embeds: [error('Insufficient Funds', `You need 🪙 **${formatNumber(total)}** but only have 🪙 **${formatNumber(eco.wallet)}**.`)], ephemeral: true });

      db.removeCoins(interaction.guildId, interaction.user.id, total);
      const existing = db.get('SELECT * FROM inventory WHERE guild_id = ? AND user_id = ? AND item_id = ?', interaction.guildId, interaction.user.id, String(id));
      if (existing) db.run('UPDATE inventory SET quantity = quantity + ? WHERE id = ?', qty, existing.id);
      else db.run('INSERT INTO inventory (guild_id, user_id, item_id, quantity) VALUES (?, ?, ?, ?)', interaction.guildId, interaction.user.id, String(id), qty);

      if (item.role_id) {
        const member = interaction.member;
        await member.roles.add(item.role_id).catch(() => {});
      }
      return interaction.reply({ embeds: [success('Purchase Successful', `You bought **${qty}x ${item.emoji} ${item.name}** for 🪙 **${formatNumber(total)}**!`)] });
    }

    if (sub === 'add') {
      const { isAdmin } = require('../../utils/permissions');
      if (!isAdmin(interaction.member)) return interaction.reply({ embeds: [error('No Permission', 'Admin only.')], ephemeral: true });
      const name  = interaction.options.getString('name');
      const price = interaction.options.getInteger('price');
      const desc  = interaction.options.getString('description') || '';
      const role  = interaction.options.getRole('role');
      const emoji = interaction.options.getString('emoji') || '📦';
      db.run('INSERT INTO shop_items (guild_id, item_id, name, description, price, role_id, emoji) VALUES (?, ?, ?, ?, ?, ?, ?)',
        interaction.guildId, Date.now().toString(), name, desc, price, role?.id || null, emoji);
      return interaction.reply({ embeds: [success('Item Added', `**${emoji} ${name}** added to shop for 🪙 **${formatNumber(price)}**.`)] });
    }

    if (sub === 'remove') {
      const { isAdmin } = require('../../utils/permissions');
      if (!isAdmin(interaction.member)) return interaction.reply({ embeds: [error('No Permission', 'Admin only.')], ephemeral: true });
      const id = interaction.options.getInteger('id');
      db.run('DELETE FROM shop_items WHERE id = ? AND guild_id = ?', id, interaction.guildId);
      return interaction.reply({ embeds: [success('Item Removed', `Item #${id} removed from shop.`)] });
    }
  },
};
