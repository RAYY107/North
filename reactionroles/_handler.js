// modules/reactionroles/_handler.js
const db = require('../../database');

async function onReactionAdd(reaction, user, client) {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch().catch(() => {});
  const guild = reaction.message.guild;
  if (!guild) return;

  const emojiId = reaction.emoji.id || reaction.emoji.name;
  const rr = db.get('SELECT * FROM reaction_roles WHERE guild_id=? AND message_id=? AND emoji=?', guild.id, reaction.message.id, emojiId);
  if (!rr) return;

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;
  member.roles.add(rr.role_id).catch(() => {});
}

async function onReactionRemove(reaction, user, client) {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch().catch(() => {});
  const guild = reaction.message.guild;
  if (!guild) return;

  const emojiId = reaction.emoji.id || reaction.emoji.name;
  const rr = db.get('SELECT * FROM reaction_roles WHERE guild_id=? AND message_id=? AND emoji=?', guild.id, reaction.message.id, emojiId);
  if (!rr || rr.type === 'add') return;

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;
  member.roles.remove(rr.role_id).catch(() => {});
}

async function onButton(interaction, client) {
  const [, roleId] = interaction.customId.split(':');
  if (!roleId) return;

  const member = interaction.member;
  const hasRole = member.roles.cache.has(roleId);

  const br = db.get('SELECT * FROM button_roles WHERE guild_id=? AND role_id=?', interaction.guildId, roleId);
  if (!br) return;

  if (br.type === 'toggle') {
    if (hasRole) { await member.roles.remove(roleId); interaction.reply({ content: `✅ Removed <@&${roleId}>.`, ephemeral: true }); }
    else         { await member.roles.add(roleId);    interaction.reply({ content: `✅ Added <@&${roleId}>.`,   ephemeral: true }); }
  } else if (br.type === 'add') {
    await member.roles.add(roleId);
    interaction.reply({ content: `✅ Added <@&${roleId}>.`, ephemeral: true });
  } else if (br.type === 'remove') {
    await member.roles.remove(roleId);
    interaction.reply({ content: `✅ Removed <@&${roleId}>.`, ephemeral: true });
  }
}

async function onSelect(interaction, client) {
  if (!interaction.customId.startsWith('role_select')) return;
  const selected = interaction.values;
  const sr = db.get('SELECT * FROM select_roles WHERE guild_id=? AND message_id=?', interaction.guildId, interaction.message.id);
  if (!sr) return;

  const allRoles = JSON.parse(sr.roles || '[]').map(r => r.role_id);
  const member   = interaction.member;

  for (const roleId of allRoles) {
    if (selected.includes(roleId)) await member.roles.add(roleId).catch(() => {});
    else await member.roles.remove(roleId).catch(() => {});
  }
  interaction.reply({ content: '✅ Roles updated!', ephemeral: true });
}

module.exports = { onReactionAdd, onReactionRemove, onButton, onSelect };
