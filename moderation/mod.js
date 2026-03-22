// modules/moderation/mod.js
// All moderation commands consolidated under /mod
// Developed by Rayy @qwxlr | North Store

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { success, error, embed } = require('../../utils/embed');
const { canModerate, isAdmin, isMod } = require('../../utils/permissions');
const { parseDuration, timestamp, truncate } = require('../../utils/format');

module.exports = {
  module: 'moderation',
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Moderation commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)

    // ── Ban ─────────────────────────────────────────────────
    .addSubcommand(s => s.setName('ban').setDescription('Ban a member')
      .addUserOption(o => o.setName('user').setDescription('User to ban').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false))
      .addIntegerOption(o => o.setName('days').setDescription('Delete message history (0-7 days)').setMinValue(0).setMaxValue(7).setRequired(false)))

    // ── Unban ───────────────────────────────────────────────
    .addSubcommand(s => s.setName('unban').setDescription('Unban a user by ID')
      .addStringOption(o => o.setName('userid').setDescription('User ID').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)))

    // ── Kick ────────────────────────────────────────────────
    .addSubcommand(s => s.setName('kick').setDescription('Kick a member')
      .addUserOption(o => o.setName('user').setDescription('User to kick').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)))

    // ── Softban ─────────────────────────────────────────────
    .addSubcommand(s => s.setName('softban').setDescription('Ban + unban to delete messages')
      .addUserOption(o => o.setName('user').setDescription('User to softban').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)))

    // ── Massban ─────────────────────────────────────────────
    .addSubcommand(s => s.setName('massban').setDescription('Ban multiple users by ID (space-separated)')
      .addStringOption(o => o.setName('userids').setDescription('Space-separated user IDs').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)))

    // ── Timeout ─────────────────────────────────────────────
    .addSubcommand(s => s.setName('timeout').setDescription('Timeout a member')
      .addUserOption(o => o.setName('user').setDescription('User to timeout').setRequired(true))
      .addStringOption(o => o.setName('duration').setDescription('Duration (e.g. 10m, 1h, 1d)').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)))

    // ── Untimeout ───────────────────────────────────────────
    .addSubcommand(s => s.setName('untimeout').setDescription('Remove timeout from a member')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)))

    // ── Warn ────────────────────────────────────────────────
    .addSubcommand(s => s.setName('warn').setDescription('Warn a member')
      .addUserOption(o => o.setName('user').setDescription('User to warn').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)))

    // ── Warnings ────────────────────────────────────────────
    .addSubcommand(s => s.setName('warnings').setDescription('View warnings for a user')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)))

    // ── Clearwarnings ───────────────────────────────────────
    .addSubcommand(s => s.setName('clearwarnings').setDescription('Clear all warnings for a user')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)))

    // ── Purge ───────────────────────────────────────────────
    .addSubcommand(s => s.setName('purge').setDescription('Bulk delete messages')
      .addIntegerOption(o => o.setName('amount').setDescription('Number of messages (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
      .addUserOption(o => o.setName('user').setDescription('Only delete from this user').setRequired(false))
      .addStringOption(o => o.setName('filter').setDescription('Filter type').setRequired(false)
        .addChoices({ name: 'Bots only', value: 'bots' }, { name: 'Links only', value: 'links' }, { name: 'Images only', value: 'images' })))

    // ── Slowmode ────────────────────────────────────────────
    .addSubcommand(s => s.setName('slowmode').setDescription('Set channel slowmode')
      .addIntegerOption(o => o.setName('seconds').setDescription('Slowmode in seconds (0 to disable)').setRequired(true).setMinValue(0).setMaxValue(21600))
      .addChannelOption(o => o.setName('channel').setDescription('Channel (defaults to current)').setRequired(false)))

    // ── Lock ────────────────────────────────────────────────
    .addSubcommand(s => s.setName('lock').setDescription('Lock a channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(false))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)))

    // ── Unlock ──────────────────────────────────────────────
    .addSubcommand(s => s.setName('unlock').setDescription('Unlock a channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(false)))

    // ── Nickname ────────────────────────────────────────────
    .addSubcommand(s => s.setName('nickname').setDescription("Change a member's nickname")
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addStringOption(o => o.setName('nickname').setDescription('New nickname (leave empty to reset)').setRequired(false)))

    // ── Move ────────────────────────────────────────────────
    .addSubcommand(s => s.setName('move').setDescription('Move a member to a voice channel')
      .addUserOption(o => o.setName('user').setDescription('Member to move').setRequired(true))
      .addChannelOption(o => o.setName('channel').setDescription('Destination voice channel').setRequired(true)))

    // ── Note ────────────────────────────────────────────────
    .addSubcommand(s => s.setName('note').setDescription('Add a staff note on a user')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addStringOption(o => o.setName('note').setDescription('Note text').setRequired(true)))

    // ── Notes ───────────────────────────────────────────────
    .addSubcommand(s => s.setName('notes').setDescription('View staff notes for a user')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)))

    // ── History ─────────────────────────────────────────────
    .addSubcommand(s => s.setName('history').setDescription('View mod case history for a user')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ── Ban ─────────────────────────────────────────────────
    if (sub === 'ban') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers))
        return interaction.reply({ embeds: [error('No Permission', 'You need **Ban Members** permission.')], ephemeral: true });
      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const days   = interaction.options.getInteger('days') || 0;
      if (!target) return interaction.reply({ embeds: [error('Not Found', 'User not found.')], ephemeral: true });
      if (!canModerate(interaction.member, target)) return interaction.reply({ embeds: [error('Cannot Moderate', 'You cannot moderate this user.')], ephemeral: true });
      await target.send({ embeds: [error(`Banned from ${interaction.guild.name}`, `**Reason:** ${reason}`)] }).catch(() => {});
      await target.ban({ deleteMessageSeconds: days * 86400, reason: `${interaction.user.tag}: ${reason}` });
      const caseNum = db.newCase(interaction.guildId, 'BAN', target.id, interaction.user.id, reason);
      return interaction.reply({ embeds: [success('Member Banned', `**${target.user.tag}** has been banned.\n**Reason:** ${reason}\n**Case:** #${caseNum}`)] });
    }

    // ── Unban ───────────────────────────────────────────────
    if (sub === 'unban') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers))
        return interaction.reply({ embeds: [error('No Permission', 'You need **Ban Members** permission.')], ephemeral: true });
      const userId = interaction.options.getString('userid');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      try {
        await interaction.guild.members.unban(userId, reason);
        const caseNum = db.newCase(interaction.guildId, 'UNBAN', userId, interaction.user.id, reason);
        return interaction.reply({ embeds: [success('User Unbanned', `<@${userId}> has been unbanned.\n**Case:** #${caseNum}`)] });
      } catch {
        return interaction.reply({ embeds: [error('Unban Failed', 'User not found in ban list or invalid ID.')], ephemeral: true });
      }
    }

    // ── Kick ────────────────────────────────────────────────
    if (sub === 'kick') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers))
        return interaction.reply({ embeds: [error('No Permission', 'You need **Kick Members** permission.')], ephemeral: true });
      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      if (!target) return interaction.reply({ embeds: [error('Not Found', 'User not found.')], ephemeral: true });
      if (!canModerate(interaction.member, target)) return interaction.reply({ embeds: [error('Cannot Moderate', 'You cannot moderate this user.')], ephemeral: true });
      await target.send({ embeds: [error(`Kicked from ${interaction.guild.name}`, `**Reason:** ${reason}`)] }).catch(() => {});
      await target.kick(`${interaction.user.tag}: ${reason}`);
      const caseNum = db.newCase(interaction.guildId, 'KICK', target.id, interaction.user.id, reason);
      return interaction.reply({ embeds: [success('Member Kicked', `**${target.user.tag}** has been kicked.\n**Reason:** ${reason}\n**Case:** #${caseNum}`)] });
    }

    // ── Softban ─────────────────────────────────────────────
    if (sub === 'softban') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers))
        return interaction.reply({ embeds: [error('No Permission', 'You need **Ban Members** permission.')], ephemeral: true });
      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      if (!target) return interaction.reply({ embeds: [error('Not Found', 'User not found.')], ephemeral: true });
      if (!canModerate(interaction.member, target)) return interaction.reply({ embeds: [error('Cannot Moderate', 'You cannot moderate this user.')], ephemeral: true });
      await target.send({ embeds: [error(`Softbanned from ${interaction.guild.name}`, `**Reason:** ${reason}\nYou may rejoin.`)] }).catch(() => {});
      await interaction.guild.members.ban(target.id, { deleteMessageSeconds: 7 * 86400, reason });
      await interaction.guild.members.unban(target.id, 'Softban auto-unban');
      const caseNum = db.newCase(interaction.guildId, 'SOFTBAN', target.id, interaction.user.id, reason);
      return interaction.reply({ embeds: [success('Member Softbanned', `**${target.user.tag}** was softbanned.\n**Case:** #${caseNum}`)] });
    }

    // ── Massban ─────────────────────────────────────────────
    if (sub === 'massban') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers))
        return interaction.reply({ embeds: [error('No Permission', 'You need **Ban Members** permission.')], ephemeral: true });
      await interaction.deferReply();
      const ids    = interaction.options.getString('userids').split(/\s+/).filter(Boolean);
      const reason = interaction.options.getString('reason') || 'Mass ban';
      let ok = 0, fail = 0;
      for (const id of ids) {
        try { await interaction.guild.members.ban(id, { reason }); db.newCase(interaction.guildId, 'BAN', id, interaction.user.id, reason); ok++; }
        catch { fail++; }
      }
      return interaction.editReply({ embeds: [embed(0xED4245).setTitle('🔨 Mass Ban Complete').addFields({ name: '✅ Banned', value: `${ok}`, inline: true }, { name: '❌ Failed', value: `${fail}`, inline: true }, { name: 'Reason', value: reason })] });
    }

    // ── Timeout ─────────────────────────────────────────────
    if (sub === 'timeout') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers))
        return interaction.reply({ embeds: [error('No Permission', 'You need **Moderate Members** permission.')], ephemeral: true });
      const target  = interaction.options.getMember('user');
      const durStr  = interaction.options.getString('duration');
      const reason  = interaction.options.getString('reason') || 'No reason provided';
      if (!target) return interaction.reply({ embeds: [error('Not Found', 'User not found.')], ephemeral: true });
      if (!canModerate(interaction.member, target)) return interaction.reply({ embeds: [error('Cannot Moderate', 'You cannot moderate this user.')], ephemeral: true });
      const ms = parseDuration(durStr);
      if (!ms || ms > 28 * 86400000) return interaction.reply({ embeds: [error('Invalid Duration', 'Use formats like `10m`, `1h`, `1d`. Max 28 days.')], ephemeral: true });
      await target.timeout(ms, `${interaction.user.tag}: ${reason}`);
      const caseNum = db.newCase(interaction.guildId, 'TIMEOUT', target.id, interaction.user.id, reason, ms);
      return interaction.reply({ embeds: [success('Member Timed Out', `**${target.user.tag}** timed out for **${durStr}**.\n**Reason:** ${reason}\n**Case:** #${caseNum}`)] });
    }

    // ── Untimeout ───────────────────────────────────────────
    if (sub === 'untimeout') {
      const target = interaction.options.getMember('user');
      if (!target) return interaction.reply({ embeds: [error('Not Found', 'User not found.')], ephemeral: true });
      await target.timeout(null);
      return interaction.reply({ embeds: [success('Timeout Removed', `**${target.user.tag}**'s timeout has been removed.`)] });
    }

    // ── Warn ────────────────────────────────────────────────
    if (sub === 'warn') {
      const target = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');
      const now    = Math.floor(Date.now() / 1000);
      db.run('INSERT INTO warns (guild_id, user_id, mod_id, reason, created_at) VALUES (?, ?, ?, ?, ?)', interaction.guildId, target.id, interaction.user.id, reason, now);
      const total = db.get('SELECT COUNT(*) as c FROM warns WHERE guild_id=? AND user_id=?', interaction.guildId, target.id).c;
      await target.send({ embeds: [error(`Warning in ${interaction.guild.name}`, `**Reason:** ${reason}\nTotal warnings: **${total}**`)] }).catch(() => {});
      const caseNum = db.newCase(interaction.guildId, 'WARN', target.id, interaction.user.id, reason);
      return interaction.reply({ embeds: [success('Member Warned', `**${target.tag}** warned.\n**Reason:** ${reason}\n**Total warnings:** ${total}\n**Case:** #${caseNum}`)] });
    }

    // ── Warnings ────────────────────────────────────────────
    if (sub === 'warnings') {
      const target = interaction.options.getUser('user');
      const warns  = db.all('SELECT * FROM warns WHERE guild_id=? AND user_id=? ORDER BY created_at DESC', interaction.guildId, target.id);
      if (!warns.length) return interaction.reply({ embeds: [embed().setTitle(`⚠️ Warnings — ${target.tag}`).setDescription('No warnings found.')], ephemeral: true });
      const list = warns.slice(0, 10).map((w, i) => `**#${i+1}** — ${truncate(w.reason, 60)}\nBy <@${w.mod_id}> • <t:${w.created_at}:R>`).join('\n\n');
      return interaction.reply({ embeds: [embed(0xFEE75C).setTitle(`⚠️ Warnings — ${target.tag}`).setDescription(list).addFields({ name: 'Total', value: `${warns.length}`, inline: true }).setThumbnail(target.displayAvatarURL())] });
    }

    // ── Clearwarnings ───────────────────────────────────────
    if (sub === 'clearwarnings') {
      const target = interaction.options.getUser('user');
      db.run('DELETE FROM warns WHERE guild_id=? AND user_id=?', interaction.guildId, target.id);
      return interaction.reply({ embeds: [success('Warnings Cleared', `All warnings cleared for **${target.tag}**.`)] });
    }

    // ── Purge ───────────────────────────────────────────────
    if (sub === 'purge') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages))
        return interaction.reply({ embeds: [error('No Permission', 'You need **Manage Messages** permission.')], ephemeral: true });
      await interaction.deferReply({ ephemeral: true });
      const amount     = interaction.options.getInteger('amount');
      const targetUser = interaction.options.getUser('user');
      const filter     = interaction.options.getString('filter');
      const messages   = await interaction.channel.messages.fetch({ limit: 100 });
      let toDelete = [...messages.values()].filter(m => {
        if (Date.now() - m.createdTimestamp > 14 * 86400000) return false;
        if (targetUser && m.author.id !== targetUser.id) return false;
        if (filter === 'bots' && !m.author.bot) return false;
        if (filter === 'links' && !/https?:\/\/\S+/i.test(m.content)) return false;
        if (filter === 'images' && m.attachments.size === 0) return false;
        return true;
      }).slice(0, amount);
      const deleted = await interaction.channel.bulkDelete(toDelete, true);
      return interaction.editReply({ embeds: [success('Messages Deleted', `Deleted **${deleted.size}** messages.`)] });
    }

    // ── Slowmode ────────────────────────────────────────────
    if (sub === 'slowmode') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels))
        return interaction.reply({ embeds: [error('No Permission', 'You need **Manage Channels** permission.')], ephemeral: true });
      const secs    = interaction.options.getInteger('seconds');
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      await channel.setRateLimitPerUser(secs);
      return interaction.reply({ embeds: [success('Slowmode Updated', secs === 0 ? `Slowmode disabled in ${channel}.` : `Slowmode set to **${secs}s** in ${channel}.`)] });
    }

    // ── Lock ────────────────────────────────────────────────
    if (sub === 'lock') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels))
        return interaction.reply({ embeds: [error('No Permission', 'You need **Manage Channels** permission.')], ephemeral: true });
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const reason  = interaction.options.getString('reason') || 'No reason provided';
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
      return interaction.reply({ embeds: [success('Channel Locked', `${channel} has been locked.\n**Reason:** ${reason}`)] });
    }

    // ── Unlock ──────────────────────────────────────────────
    if (sub === 'unlock') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels))
        return interaction.reply({ embeds: [error('No Permission', 'You need **Manage Channels** permission.')], ephemeral: true });
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
      return interaction.reply({ embeds: [success('Channel Unlocked', `${channel} has been unlocked.`)] });
    }

    // ── Nickname ────────────────────────────────────────────
    if (sub === 'nickname') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageNicknames))
        return interaction.reply({ embeds: [error('No Permission', 'You need **Manage Nicknames** permission.')], ephemeral: true });
      const member = interaction.options.getMember('user');
      const nick   = interaction.options.getString('nickname') || null;
      if (!member) return interaction.reply({ embeds: [error('Not Found', 'Member not found.')], ephemeral: true });
      await member.setNickname(nick);
      return interaction.reply({ embeds: [success('Nickname Updated', nick ? `**${member.user.tag}**'s nickname set to **${nick}**.` : `**${member.user.tag}**'s nickname was reset.`)] });
    }

    // ── Move ────────────────────────────────────────────────
    if (sub === 'move') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.MoveMembers))
        return interaction.reply({ embeds: [error('No Permission', 'You need **Move Members** permission.')], ephemeral: true });
      const member  = interaction.options.getMember('user');
      const channel = interaction.options.getChannel('channel');
      if (!member?.voice?.channel) return interaction.reply({ embeds: [error('Not in Voice', 'That member is not in a voice channel.')], ephemeral: true });
      await member.voice.setChannel(channel);
      return interaction.reply({ embeds: [success('Member Moved', `**${member.displayName}** moved to **${channel.name}**.`)] });
    }

    // ── Note ────────────────────────────────────────────────
    if (sub === 'note') {
      const user = interaction.options.getUser('user');
      const note = interaction.options.getString('note');
      db.run('INSERT INTO notes (guild_id, user_id, mod_id, note, created_at) VALUES (?, ?, ?, ?, ?)', interaction.guildId, user.id, interaction.user.id, note, Math.floor(Date.now()/1000));
      return interaction.reply({ embeds: [success('Note Added', `Note added for **${user.tag}**.`)], ephemeral: true });
    }

    // ── Notes ───────────────────────────────────────────────
    if (sub === 'notes') {
      const user  = interaction.options.getUser('user');
      const notes = db.all('SELECT * FROM notes WHERE guild_id=? AND user_id=? ORDER BY created_at DESC', interaction.guildId, user.id);
      if (!notes.length) return interaction.reply({ embeds: [embed().setDescription('No notes found.')], ephemeral: true });
      const list = notes.map(n => `**[${n.id}]** ${n.note}\nBy <@${n.mod_id}> • <t:${n.created_at}:R>`).join('\n\n');
      return interaction.reply({ embeds: [embed().setTitle(`📝 Notes — ${user.tag}`).setDescription(list)], ephemeral: true });
    }

    // ── History ─────────────────────────────────────────────
    if (sub === 'history') {
      const user  = interaction.options.getUser('user');
      const cases = db.all('SELECT * FROM mod_cases WHERE guild_id=? AND user_id=? ORDER BY case_num DESC LIMIT 10', interaction.guildId, user.id);
      if (!cases.length) return interaction.reply({ embeds: [embed().setTitle(`📋 Case History — ${user.tag}`).setDescription('No cases found.')] });
      const list = cases.map(c => `**#${c.case_num}** \`${c.type}\` — ${c.reason.slice(0,50)} <t:${c.created_at}:R>`).join('\n');
      return interaction.reply({ embeds: [embed().setTitle(`📋 Case History — ${user.tag}`).setDescription(list).setThumbnail(user.displayAvatarURL())] });
    }
  },
};
