// src/utils/permissions.js
// Permission check helpers
// Developed by Rayy @qwxlr | North Store

const { PermissionFlagsBits } = require('discord.js');

function isMod(member) {
  return member.permissions.has(PermissionFlagsBits.ManageMessages) ||
         member.permissions.has(PermissionFlagsBits.KickMembers) ||
         member.permissions.has(PermissionFlagsBits.BanMembers) ||
         isAdmin(member);
}

function isAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator) ||
         member.permissions.has(PermissionFlagsBits.ManageGuild);
}

function isOwner(member) {
  return member.id === member.guild.ownerId ||
         member.id === process.env.OWNER_ID;
}

function canModerate(mod, target) {
  if (!target.manageable) return false;
  if (target.id === mod.guild.ownerId) return false;
  if (mod.roles.highest.position <= target.roles.highest.position && !isOwner(mod)) return false;
  return true;
}

module.exports = { isMod, isAdmin, isOwner, canModerate };
