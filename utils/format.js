// src/utils/format.js
// Shared formatting utilities for North Bot
// Developed by Rayy @qwxlr | North Store

const ms = require('ms');

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0m 0s';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m || d || h) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

function formatDurationCompact(seconds) {
  if (!seconds || seconds <= 0) return '0m';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d) return `${d}d ${h}h ${String(m).padStart(2,'0')}m`;
  if (h) return `${h}h ${String(m).padStart(2,'0')}m`;
  return `${m}m`;
}

function formatNumber(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n?.toString() || '0';
}

function formatCoins(n) { return `🪙 **${n?.toLocaleString() || 0}**`; }

function progressBar(value, max, length = 10, filled = '█', empty = '░') {
  if (!max) return empty.repeat(length);
  const f = Math.round((value / max) * length);
  return filled.repeat(Math.min(f, length)) + empty.repeat(Math.max(0, length - f));
}

function getMedal(rank) {
  return ['🥇', '🥈', '🥉'][rank - 1] || `**#${rank}**`;
}

function parseDuration(str) {
  try { return ms(str); } catch { return null; }
}

function timestamp(date, style = 'f') {
  const unix = Math.floor((date instanceof Date ? date : new Date(date)).getTime() / 1000);
  return `<t:${unix}:${style}>`;
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
}

function truncate(str, max = 100) {
  return str && str.length > max ? str.slice(0, max - 3) + '...' : str || '';
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

module.exports = {
  formatDuration, formatDurationCompact, formatNumber, formatCoins,
  progressBar, getMedal, parseDuration, timestamp,
  capitalize, truncate, randomInt, chunk,
};
