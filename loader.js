// src/loader.js
// Auto-loads all module command files and registers them
// Developed by Rayy @qwxlr | North Store

const fs = require('fs');
const path = require('path');

function loadCommands(client) {
  client.commands = new Map();
  const modulesPath = path.join(__dirname, 'modules');
  const modules = fs.readdirSync(modulesPath);

  let total = 0;
  for (const mod of modules) {
    const modPath = path.join(modulesPath, mod);
    if (!fs.statSync(modPath).isDirectory()) continue;
    const files = fs.readdirSync(modPath).filter(f => f.endsWith('.js') && !f.startsWith('_'));
    for (const file of files) {
      try {
        const command = require(path.join(modPath, file));
        if (!command.data || !command.execute) continue;
        client.commands.set(command.data.name, command);
        total++;
      } catch (err) {
        console.error(`[Loader] Error loading ${mod}/${file}:`, err.message);
      }
    }
  }
  console.log(`\x1b[32m[Loader] Loaded ${total} commands across ${modules.length} modules\x1b[0m`);
}

function loadEvents(client) {
  const eventsPath = path.join(__dirname, 'events');
  if (!fs.existsSync(eventsPath)) return;
  const files = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const event = require(path.join(eventsPath, file));
    if (event.once) client.once(event.name, (...args) => event.execute(...args, client));
    else client.on(event.name, (...args) => event.execute(...args, client));
  }
}

module.exports = { loadCommands, loadEvents };
