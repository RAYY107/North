// modules/reactionroles/reactionroles.js
const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database');
const { success, error, embed } = require('../../utils/embed');

module.exports = {
  module: 'reactionroles',
  data: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Reaction role management')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(s => s.setName('add').setDescription('Add a reaction role to a message')
      .addStringOption(o => o.setName('messageid').setDescription('Message ID').setRequired(true))
      .addStringOption(o => o.setName('emoji').setDescription('Emoji to react with').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role to assign').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove a reaction role')
      .addStringOption(o => o.setName('messageid').setDescription('Message ID').setRequired(true))
      .addStringOption(o => o.setName('emoji').setDescription('Emoji').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('List all reaction roles'))
    .addSubcommand(s => s.setName('buttonrole').setDescription('Create a button role message')
      .addChannelOption(o => o.setName('channel').setDescription('Channel to post in').setRequired(true))
      .addStringOption(o => o.setName('title').setDescription('Embed title').setRequired(false)))
    .addSubcommand(s => s.setName('addbutton').setDescription('Add a role button to the last button role message')
      .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true))
      .addStringOption(o => o.setName('label').setDescription('Button label').setRequired(true))
      .addStringOption(o => o.setName('emoji').setDescription('Button emoji').setRequired(false))
      .addStringOption(o => o.setName('style').setDescription('Button style').setRequired(false)
        .addChoices({ name: 'Blue', value: 'Primary' }, { name: 'Grey', value: 'Secondary' }, { name: 'Green', value: 'Success' }, { name: 'Red', value: 'Danger' }))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const msgId = interaction.options.getString('messageid');
      const emoji = interaction.options.getString('emoji').trim();
      const role  = interaction.options.getRole('role');

      const msg = await interaction.channel.messages.fetch(msgId).catch(() => null);
      if (!msg) return interaction.reply({ embeds: [error('Not Found', 'Message not found in this channel.')], ephemeral: true });

      const emojiId = emoji.match(/<a?:.+?:(\d+)>/)?.[1] || emoji;
      db.run('INSERT INTO reaction_roles (guild_id, channel_id, message_id, emoji, role_id) VALUES (?, ?, ?, ?, ?)',
        interaction.guildId, interaction.channelId, msgId, emojiId, role.id);
      await msg.react(emoji).catch(() => {});
      return interaction.reply({ embeds: [success('Reaction Role Added', `Reacting with ${emoji} will give ${role}.`)] });
    }

    if (sub === 'remove') {
      const msgId = interaction.options.getString('messageid');
      const emoji = interaction.options.getString('emoji').trim();
      const emojiId = emoji.match(/<a?:.+?:(\d+)>/)?.[1] || emoji;
      db.run('DELETE FROM reaction_roles WHERE guild_id=? AND message_id=? AND emoji=?', interaction.guildId, msgId, emojiId);
      return interaction.reply({ embeds: [success('Removed', 'Reaction role removed.')] });
    }

    if (sub === 'list') {
      const rrs = db.all('SELECT * FROM reaction_roles WHERE guild_id=?', interaction.guildId);
      if (!rrs.length) return interaction.reply({ embeds: [embed().setTitle('🏷️ Reaction Roles').setDescription('No reaction roles set.')], ephemeral: true });
      const list = rrs.map(r => `${r.emoji} → <@&${r.role_id}> in <#${r.channel_id}>`).join('\n');
      return interaction.reply({ embeds: [embed(0x5865F2).setTitle('🏷️ Reaction Roles').setDescription(list)], ephemeral: true });
    }

    if (sub === 'buttonrole') {
      const channel = interaction.options.getChannel('channel');
      const title   = interaction.options.getString('title') || '🏷️ Role Selection';
      const msg = await channel.send({ embeds: [embed(0x5865F2).setTitle(title).setDescription('Click a button below to get or remove a role.')], components: [] });
      db.run('INSERT INTO button_roles (guild_id, channel_id, message_id, label, role_id) VALUES (?, ?, ?, ?, ?)', interaction.guildId, channel.id, msg.id, 'placeholder', 'placeholder');
      return interaction.reply({ embeds: [success('Button Role Panel Created', `Panel posted in ${channel}. Use \`/reactionrole addbutton\` to add buttons.`)], ephemeral: true });
    }

    if (sub === 'addbutton') {
      const role  = interaction.options.getRole('role');
      const label = interaction.options.getString('label');
      const emoji = interaction.options.getString('emoji');
      const style = interaction.options.getString('style') || 'Secondary';

      const last = db.get('SELECT * FROM button_roles WHERE guild_id=? ORDER BY id DESC LIMIT 1', interaction.guildId);
      if (!last) return interaction.reply({ embeds: [error('No Panel', 'Create a button role panel first with `/reactionrole buttonrole`.')], ephemeral: true });

      const ch  = await interaction.client.channels.fetch(last.channel_id).catch(() => null);
      const msg = await ch?.messages.fetch(last.message_id).catch(() => null);
      if (!msg) return interaction.reply({ embeds: [error('Not Found', 'Could not find the panel message.')], ephemeral: true });

      db.run('INSERT INTO button_roles (guild_id, channel_id, message_id, label, emoji, role_id, style) VALUES (?, ?, ?, ?, ?, ?, ?)',
        interaction.guildId, last.channel_id, last.message_id, label, emoji || null, role.id, style);

      const allButtons = db.all('SELECT * FROM button_roles WHERE guild_id=? AND message_id=? AND role_id != ?', interaction.guildId, last.message_id, 'placeholder');
      const rows = [];
      for (let i = 0; i < allButtons.length; i += 5) {
        const row = new ActionRowBuilder();
        for (const btn of allButtons.slice(i, i+5)) {
          const b = new ButtonBuilder().setCustomId(`rr:${btn.role_id}`).setLabel(btn.label).setStyle(ButtonStyle[btn.style || 'Secondary']);
          if (btn.emoji) b.setEmoji(btn.emoji);
          row.addComponents(b);
        }
        rows.push(row);
      }
      await msg.edit({ components: rows });
      return interaction.reply({ embeds: [success('Button Added', `Button for ${role} added to the panel.`)] });
    }
  },
};
