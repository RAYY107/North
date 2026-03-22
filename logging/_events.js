// modules/logging/_events.js  (all log event handlers)
const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const db = require('../../database');

const COLORS = { join: 0x57F287, leave: 0xED4245, ban: 0xFF0000, edit: 0xFEE75C, delete: 0xED4245, voice: 0x5BC0EB, role: 0x9B59B6 };

async function getLogChannel(guild, type) {
  const cfg = db.get('SELECT * FROM log_config WHERE guild_id = ?', guild.id);
  if (!cfg || !cfg.enabled || !cfg.log_channel) return null;
  if (cfg[type] === 0) return null;
  const ignored = JSON.parse(cfg.ignored_channels || '[]');
  return guild.channels.fetch(cfg.log_channel).catch(() => null);
}

function logEmbed(color, title, description) {
  return new EmbedBuilder().setColor(color).setTitle(title).setDescription(description || '').setTimestamp().setFooter({ text: 'North Bot Logging' });
}

async function onMessageDelete(message, client) {
  if (!message.guild || message.author?.bot) return;
  const ch = await getLogChannel(message.guild, 'msg_delete');
  if (!ch) return;
  const e = logEmbed(COLORS.delete, '🗑️ Message Deleted')
    .addFields(
      { name: 'Author',  value: `${message.author?.tag || 'Unknown'} (<@${message.author?.id}>)`, inline: true },
      { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
      { name: 'Content', value: message.content?.slice(0, 1024) || '*No text content*', inline: false },
    );
  if (message.attachments.size) e.addFields({ name: 'Attachments', value: message.attachments.map(a => a.url).join('\n') });
  ch.send({ embeds: [e] }).catch(() => {});
}

async function onMessageEdit(oldMsg, newMsg, client) {
  if (!oldMsg.guild || oldMsg.author?.bot || oldMsg.content === newMsg.content) return;
  const ch = await getLogChannel(oldMsg.guild, 'msg_edit');
  if (!ch) return;
  ch.send({ embeds: [logEmbed(COLORS.edit, '✏️ Message Edited')
    .addFields(
      { name: 'Author',  value: `${oldMsg.author?.tag} (<@${oldMsg.author?.id}>)`, inline: true },
      { name: 'Channel', value: `<#${oldMsg.channelId}>`, inline: true },
      { name: 'Before',  value: oldMsg.content?.slice(0, 512) || '*empty*', inline: false },
      { name: 'After',   value: newMsg.content?.slice(0, 512) || '*empty*', inline: false },
      { name: 'Jump',    value: `[Click to view](${newMsg.url})`, inline: true },
    )] }).catch(() => {});
}

async function onMemberJoin(member, client) {
  const ch = await getLogChannel(member.guild, 'member_join');
  if (!ch) return;
  const created = Math.floor(member.user.createdTimestamp / 1000);
  ch.send({ embeds: [logEmbed(COLORS.join, '📥 Member Joined')
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(
      { name: 'User',    value: `${member.user.tag} (<@${member.id}>)`, inline: true },
      { name: 'Account Created', value: `<t:${created}:R>`, inline: true },
      { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true },
    )] }).catch(() => {});
}

async function onMemberLeave(member, client) {
  const ch = await getLogChannel(member.guild, 'member_leave');
  if (!ch) return;
  const joined = member.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;
  const roles  = member.roles.cache.filter(r => r.id !== member.guild.id).map(r => `<@&${r.id}>`).join(', ') || 'None';
  ch.send({ embeds: [logEmbed(COLORS.leave, '📤 Member Left')
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(
      { name: 'User',   value: `${member.user.tag} (<@${member.id}>)`, inline: true },
      { name: 'Joined', value: joined ? `<t:${joined}:R>` : 'Unknown', inline: true },
      { name: 'Roles',  value: roles.slice(0, 512), inline: false },
    )] }).catch(() => {});
}

async function onBanAdd(ban, client) {
  const ch = await getLogChannel(ban.guild, 'member_ban');
  if (!ch) return;
  // Try to get audit log entry for ban reason
  let reason = ban.reason || 'No reason provided';
  try {
    await new Promise(r => setTimeout(r, 500));
    const audit = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 });
    const entry = audit.entries.first();
    if (entry && entry.target.id === ban.user.id) reason = entry.reason || reason;
  } catch {}
  ch.send({ embeds: [logEmbed(COLORS.ban, '🔨 Member Banned')
    .setThumbnail(ban.user.displayAvatarURL())
    .addFields(
      { name: 'User',   value: `${ban.user.tag} (<@${ban.user.id}>)`, inline: true },
      { name: 'Reason', value: reason, inline: false },
    )] }).catch(() => {});
}

async function onBanRemove(ban, client) {
  const ch = await getLogChannel(ban.guild, 'member_unban');
  if (!ch) return;
  ch.send({ embeds: [logEmbed(COLORS.join, '🔓 Member Unbanned')
    .addFields({ name: 'User', value: `${ban.user.tag} (<@${ban.user.id}>)`, inline: true })] }).catch(() => {});
}

async function onVoiceUpdate(oldState, newState, client) {
  const guild = newState.guild;
  const ch = await getLogChannel(guild, oldState.channelId && newState.channelId ? 'voice_move' : newState.channelId ? 'voice_join' : 'voice_leave');
  if (!ch) return;
  const user   = newState.member?.user;
  let title, desc;
  if (!oldState.channelId && newState.channelId) { title = '🔊 Joined Voice'; desc = `<@${user?.id}> joined **${newState.channel?.name}**`; }
  else if (oldState.channelId && !newState.channelId) { title = '🔇 Left Voice'; desc = `<@${user?.id}> left **${oldState.channel?.name}**`; }
  else { title = '🔀 Moved Voice'; desc = `<@${user?.id}> moved from **${oldState.channel?.name}** → **${newState.channel?.name}**`; }
  ch.send({ embeds: [logEmbed(COLORS.voice, title, desc)] }).catch(() => {});
}

module.exports = { onMessageDelete, onMessageEdit, onMemberJoin, onMemberLeave, onBanAdd, onBanRemove, onVoiceUpdate };
