// modules/announcements/announce.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, success, error } = require('../../utils/embed');
const db = require('../../database');

module.exports = {
  module: 'announcements',
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Announcement tools')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s.setName('send').setDescription('Send an announcement embed')
      .addChannelOption(o => o.setName('channel').setDescription('Target channel').setRequired(true))
      .addStringOption(o => o.setName('message').setDescription('Message content').setRequired(true))
      .addStringOption(o => o.setName('title').setDescription('Embed title').setRequired(false))
      .addStringOption(o => o.setName('color').setDescription('Hex color (e.g. #FF0000)').setRequired(false))
      .addRoleOption(o => o.setName('ping').setDescription('Role to ping').setRequired(false)))
    .addSubcommand(s => s.setName('dm').setDescription('DM all members with a role')
      .addRoleOption(o => o.setName('role').setDescription('Role to DM').setRequired(true))
      .addStringOption(o => o.setName('message').setDescription('Message to DM').setRequired(true)))
    .addSubcommand(s => s.setName('embed').setDescription('Build a rich embed announcement')
      .addChannelOption(o => o.setName('channel').setDescription('Target channel').setRequired(true))
      .addStringOption(o => o.setName('title').setDescription('Embed title').setRequired(true))
      .addStringOption(o => o.setName('description').setDescription('Embed description').setRequired(true))
      .addStringOption(o => o.setName('color').setDescription('Hex color').setRequired(false))
      .addStringOption(o => o.setName('image').setDescription('Image URL').setRequired(false))
      .addStringOption(o => o.setName('thumbnail').setDescription('Thumbnail URL').setRequired(false))
      .addStringOption(o => o.setName('footer').setDescription('Footer text').setRequired(false))
      .addRoleOption(o => o.setName('ping').setDescription('Role to ping').setRequired(false))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'send') {
      await interaction.deferReply({ ephemeral: true });
      const channel = interaction.options.getChannel('channel');
      const message = interaction.options.getString('message');
      const title   = interaction.options.getString('title');
      const colorHex= interaction.options.getString('color');
      const ping    = interaction.options.getRole('ping');
      const color   = colorHex ? parseInt(colorHex.replace('#',''), 16) : 0x5865F2;

      const e = embed(color).setDescription(message);
      if (title) e.setTitle(title);
      e.setFooter({ text: `Announced by ${interaction.user.tag}` });

      await channel.send({ content: ping ? `<@&${ping.id}>` : undefined, embeds: [e] });
      return interaction.editReply({ embeds: [success('Sent', `Announcement sent to ${channel}.`)] });
    }

    if (sub === 'dm') {
      await interaction.deferReply({ ephemeral: true });
      const role    = interaction.options.getRole('role');
      const message = interaction.options.getString('message');
      let sent = 0, failed = 0;

      const members = await interaction.guild.members.fetch();
      const targets = members.filter(m => m.roles.cache.has(role.id) && !m.user.bot);

      for (const [, member] of targets) {
        try {
          await member.user.send({ embeds: [embed(0x5865F2).setTitle(`📢 Message from ${interaction.guild.name}`).setDescription(message)] });
          sent++;
        } catch { failed++; }
        await new Promise(r => setTimeout(r, 100)); // rate limit protection
      }
      return interaction.editReply({ embeds: [success('DM Blast Complete', `Sent to **${sent}** members. Failed: **${failed}**.`)] });
    }

    if (sub === 'embed') {
      await interaction.deferReply({ ephemeral: true });
      const channel  = interaction.options.getChannel('channel');
      const title    = interaction.options.getString('title');
      const desc     = interaction.options.getString('description');
      const colorHex = interaction.options.getString('color');
      const image    = interaction.options.getString('image');
      const thumb    = interaction.options.getString('thumbnail');
      const footer   = interaction.options.getString('footer');
      const ping     = interaction.options.getRole('ping');
      const color    = colorHex ? parseInt(colorHex.replace('#',''), 16) : 0x5865F2;

      const e = embed(color).setTitle(title).setDescription(desc);
      if (image)  e.setImage(image);
      if (thumb)  e.setThumbnail(thumb);
      if (footer) e.setFooter({ text: footer });
      else        e.setFooter({ text: `Announced by ${interaction.user.tag}` });

      await channel.send({ content: ping ? `<@&${ping.id}>` : undefined, embeds: [e] });
      return interaction.editReply({ embeds: [success('Embed Sent', `Custom embed sent to ${channel}.`)] });
    }
  },
};
