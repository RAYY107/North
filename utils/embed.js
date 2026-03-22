// src/utils/embed.js
// Standardized embed builders for North Bot
// Developed by Rayy @qwxlr | North Store

const { EmbedBuilder } = require('discord.js');

const COLORS = {
  primary:  0x5865F2,
  success:  0x57F287,
  error:    0xED4245,
  warning:  0xFEE75C,
  info:     0x5BC0EB,
  gold:     0xFFD700,
  purple:   0x9B59B6,
  north:    0x00B4D8,
};

function embed(color = COLORS.primary) {
  return new EmbedBuilder()
    .setColor(color)
    .setFooter({ text: 'North Bot • Developed by Rayy @qwxlr' })
    .setTimestamp();
}

function success(title, description) {
  return embed(COLORS.success).setTitle(`✅ ${title}`).setDescription(description);
}

function error(title, description) {
  return embed(COLORS.error).setTitle(`❌ ${title}`).setDescription(description);
}

function warn(title, description) {
  return embed(COLORS.warning).setTitle(`⚠️ ${title}`).setDescription(description);
}

function info(title, description) {
  return embed(COLORS.info).setTitle(`ℹ️ ${title}`).setDescription(description);
}

function north(title, description) {
  return embed(COLORS.north).setTitle(title).setDescription(description);
}

module.exports = { embed, success, error, warn, info, north, COLORS };
