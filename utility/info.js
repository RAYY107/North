// modules/utility/info.js
// Consolidates: userinfo, serverinfo, avatar, banner, channelinfo, roleinfo, inviteinfo
// Developed by Rayy @qwxlr | North Store

const { SlashCommandBuilder } = require('discord.js');
const { embed, error } = require('../../utils/embed');

module.exports = {
  module: 'utility',
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Get information about anything in the server')
    .addSubcommand(s => s.setName('user').setDescription('Get info about a user')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(false)))
    .addSubcommand(s => s.setName('server').setDescription('Get info about this server'))
    .addSubcommand(s => s.setName('avatar').setDescription("Get a user's avatar")
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(false))
      .addStringOption(o => o.setName('type').setDescription('Type').setRequired(false)
        .addChoices({ name: 'Server Avatar', value: 'guild' }, { name: 'Global Avatar', value: 'global' })))
    .addSubcommand(s => s.setName('banner').setDescription("Get a user's profile banner")
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(false)))
    .addSubcommand(s => s.setName('channel').setDescription('Get info about a channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(false)))
    .addSubcommand(s => s.setName('role').setDescription('Get info about a role')
      .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)))
    .addSubcommand(s => s.setName('invite').setDescription('Get info about a Discord invite')
      .addStringOption(o => o.setName('code').setDescription('Invite code or URL').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'user') {
      const target = interaction.options.getMember('user') || interaction.member;
      const user   = target.user;
      const roles  = target.roles.cache.filter(r => r.id !== interaction.guildId).sort((a,b) => b.position - a.position).map(r => `<@&${r.id}>`);
      return interaction.reply({ embeds: [embed(target.displayColor || 0x5865F2)
        .setTitle(`👤 ${user.tag}`)
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: 'ID',          value: user.id,                                                      inline: true },
          { name: 'Nickname',    value: target.nickname || 'None',                                    inline: true },
          { name: 'Bot',         value: user.bot ? 'Yes' : 'No',                                      inline: true },
          { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp/1000)}:R>`,        inline: true },
          { name: 'Joined Server',   value: `<t:${Math.floor(target.joinedTimestamp/1000)}:R>`,       inline: true },
          { name: `Roles [${roles.length}]`, value: roles.slice(0,15).join(', ') || 'None',           inline: false },
        )] });
    }

    if (sub === 'server') {
      const guild = interaction.guild;
      await guild.fetch();
      const owner = await guild.fetchOwner().catch(() => null);
      const text  = guild.channels.cache.filter(c => c.type === 0).size;
      const voice = guild.channels.cache.filter(c => c.type === 2).size;
      return interaction.reply({ embeds: [embed(0x5865F2)
        .setTitle(`🌐 ${guild.name}`)
        .setThumbnail(guild.iconURL({ size: 256 }))
        .addFields(
          { name: 'ID',          value: guild.id,                                              inline: true },
          { name: 'Owner',       value: owner ? owner.user.tag : 'Unknown',                   inline: true },
          { name: 'Created',     value: `<t:${Math.floor(guild.createdTimestamp/1000)}:R>`,   inline: true },
          { name: 'Members',     value: `${guild.memberCount}`,                               inline: true },
          { name: 'Channels',    value: `${text} text • ${voice} voice`,                      inline: true },
          { name: 'Roles',       value: `${guild.roles.cache.size - 1}`,                      inline: true },
          { name: 'Emojis',      value: `${guild.emojis.cache.size}`,                         inline: true },
          { name: 'Boosts',      value: `${guild.premiumSubscriptionCount} (Tier ${guild.premiumTier})`, inline: true },
          { name: 'Verification',value: guild.verificationLevel.toString(),                   inline: true },
        )] });
    }

    if (sub === 'avatar') {
      const target = interaction.options.getUser('user') || interaction.user;
      const type   = interaction.options.getString('type') || 'global';
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      const url    = type === 'guild' && member?.avatarURL({ size: 1024, dynamic: true })
        ? member.avatarURL({ size: 1024, dynamic: true })
        : target.displayAvatarURL({ size: 1024, dynamic: true });
      return interaction.reply({ embeds: [embed(0x5865F2)
        .setTitle(`🖼️ ${target.username}'s Avatar`)
        .setImage(url)
        .addFields({ name: 'Links', value: `[PNG](${url.replace('webp','png')}) | [WebP](${url})` })] });
    }

    if (sub === 'banner') {
      const target = interaction.options.getUser('user') || interaction.user;
      const user   = await interaction.client.users.fetch(target.id, { force: true });
      const banner = user.bannerURL({ size: 1024, dynamic: true });
      if (!banner) return interaction.reply({ embeds: [error('No Banner', `**${user.username}** has no profile banner.`)], ephemeral: true });
      return interaction.reply({ embeds: [embed(user.accentColor || 0x5865F2)
        .setTitle(`🖼️ ${user.username}'s Banner`)
        .setImage(banner)] });
    }

    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const types   = { 0:'Text', 2:'Voice', 4:'Category', 5:'Announcement', 13:'Stage', 15:'Forum' };
      return interaction.reply({ embeds: [embed(0x5865F2)
        .setTitle(`#️⃣ ${channel.name}`)
        .addFields(
          { name: 'ID',       value: channel.id,                                               inline: true },
          { name: 'Type',     value: types[channel.type] || 'Unknown',                         inline: true },
          { name: 'Category', value: channel.parent?.name || 'None',                           inline: true },
          { name: 'Created',  value: `<t:${Math.floor(channel.createdTimestamp/1000)}:R>`,     inline: true },
          { name: 'NSFW',     value: channel.nsfw ? 'Yes' : 'No',                              inline: true },
          ...(channel.topic ? [{ name: 'Topic', value: channel.topic.slice(0,200), inline: false }] : []),
        )] });
    }

    if (sub === 'role') {
      const role = interaction.options.getRole('role');
      return interaction.reply({ embeds: [embed(role.color || 0x5865F2)
        .setTitle(`🏷️ ${role.name}`)
        .addFields(
          { name: 'ID',          value: role.id,                                               inline: true },
          { name: 'Color',       value: role.hexColor,                                         inline: true },
          { name: 'Members',     value: `${role.members.size}`,                                inline: true },
          { name: 'Hoisted',     value: role.hoist ? 'Yes' : 'No',                            inline: true },
          { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No',                      inline: true },
          { name: 'Position',    value: `${role.position}`,                                    inline: true },
          { name: 'Created',     value: `<t:${Math.floor(role.createdTimestamp/1000)}:R>`,     inline: true },
        )] });
    }

    if (sub === 'invite') {
      const code = interaction.options.getString('code').replace(/.*discord\.gg\//, '').trim();
      try {
        const invite = await interaction.client.fetchInvite(code);
        return interaction.reply({ embeds: [embed(0x5865F2)
          .setTitle('🔗 Invite Info')
          .setThumbnail(invite.guild?.iconURL())
          .addFields(
            { name: 'Server',   value: invite.guild?.name || 'Unknown',                                         inline: true },
            { name: 'Channel',  value: invite.channel ? `#${invite.channel.name}` : 'Unknown',                  inline: true },
            { name: 'Inviter',  value: invite.inviter ? invite.inviter.tag : 'Unknown',                         inline: true },
            { name: 'Members',  value: `${invite.memberCount || 0}`,                                             inline: true },
            { name: 'Online',   value: `${invite.presenceCount || 0}`,                                           inline: true },
            { name: 'Expires',  value: invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime()/1000)}:R>` : 'Never', inline: true },
          )] });
      } catch {
        return interaction.reply({ embeds: [error('Invalid Invite', 'Could not find that invite.')], ephemeral: true });
      }
    }
  },
};
