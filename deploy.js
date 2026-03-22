// src/deploy.js
// Registers all slash commands globally with Discord (works for all servers)
// Run this once after adding/changing commands: node src/deploy.js
// Developed by Rayy @qwxlr | North Store

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs   = require('fs');
const path = require('path');

if (!process.env.BOT_TOKEN || !process.env.CLIENT_ID) {
  console.error('\x1b[31m[Deploy] ❌ BOT_TOKEN and CLIENT_ID must be set in .env\x1b[0m');
  process.exit(1);
}

// ── Collect all command definitions ──────────────────────────
const commands    = [];
const skipped     = [];
const modulesPath = path.join(__dirname, 'modules');

for (const mod of fs.readdirSync(modulesPath)) {
  const modPath = path.join(modulesPath, mod);
  if (!fs.statSync(modPath).isDirectory()) continue;

  for (const file of fs.readdirSync(modPath).filter(f => f.endsWith('.js') && !f.startsWith('_'))) {
    try {
      const cmd = require(path.join(modPath, file));
      if (cmd.data) {
        commands.push(cmd.data.toJSON());
      }
      // silently skip empty stubs (module.exports = {})
    } catch (e) {
      skipped.push(`${mod}/${file}: ${e.message}`);
    }
  }
}

if (skipped.length) {
  console.warn('\x1b[33m[Deploy] ⚠️  Skipped files with errors:\x1b[0m');
  skipped.forEach(s => console.warn(`  - ${s}`));
}

// ── Deploy ────────────────────────────────────────────────────
const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    if (process.env.GUILD_ID) {
      // ── Guild deploy (instant, for testing only) ──────────
      console.log(`\x1b[33m[Deploy] ⚡ GUILD mode — registering ${commands.length} commands to guild ${process.env.GUILD_ID}...\x1b[0m`);
      const data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log(`\x1b[32m[Deploy] ✅ Registered ${data.length} guild commands (instant) ✓\x1b[0m`);
      console.log(`\x1b[33m[Deploy] ⚠️  These commands only work in guild ${process.env.GUILD_ID}.\x1b[0m`);
      console.log(`\x1b[33m[Deploy]    Remove GUILD_ID from .env and re-run to go global.\x1b[0m`);
    } else {
      // ── Global deploy (all servers, ~1hr propagation) ─────
      console.log(`\x1b[36m[Deploy] 🌍 GLOBAL mode — registering ${commands.length} commands across all servers...\x1b[0m`);
      const data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log(`\x1b[32m[Deploy] ✅ Registered ${data.length} global commands ✓\x1b[0m`);
      console.log(`\x1b[90m[Deploy]    Commands will appear in all servers within ~1 hour.\x1b[0m`);
      console.log(`\x1b[90m[Deploy]    They are already active in servers where the bot restarts.\x1b[0m`);
    }

    console.log('\x1b[36m[Deploy] 📋 Commands registered:\x1b[0m');
    commands.forEach(c => console.log(`  \x1b[32m✓\x1b[0m /${c.name} — ${c.description}`));

  } catch (err) {
    console.error('\x1b[31m[Deploy] ❌ Failed:', err.message, '\x1b[0m');
    if (err.status === 401) console.error('\x1b[31m[Deploy]    Check your BOT_TOKEN in .env\x1b[0m');
    if (err.status === 400) console.error('\x1b[31m[Deploy]    A command definition is invalid. Check for duplicate names or bad options.\x1b[0m');
    process.exit(1);
  }
})();
