# 🤖 North Bot — The Ultimate All-in-One Discord Bot

**Developed by Rayy @qwxlr | North Store**

> The most feature-complete Discord bot — 480+ commands across 15 modules, all in one bot.

---

## ✨ Features

| Module | Commands | Description |
|---|---|---|
| 🛡️ Moderation | 18 | Ban, kick, timeout, warn, cases, notes, purge, lock |
| 🎵 Music | 14 | YouTube, Spotify, SoundCloud, filters, playlists |
| 💰 Economy | 16 | Coins, shop, gambling, fishing, heist |
| ⭐ Leveling | 5 | XP, rank cards, level roles, multipliers |
| 🎙️ Voice | 3 | Voice time tracking, leaderboards, milestones |
| 🎫 Tickets | 10 | Ticket panels, categories, staff roles, logs |
| 🎉 Giveaways | 5 | Scheduled giveaways, role/level requirements |
| 📋 Logging | 5 | 16 event types, per-event toggling |
| 🎮 Fun | 15 | Trivia, TicTacToe, Connect4, Hangman, Wordle, Meme |
| 🔧 Utility | 15 | Weather, translate, poll, QR, snipe, AFK, encode |
| 👋 Welcome | 7 | Welcome cards, DMs, leave messages, auto-roles |
| 🏷️ Reaction Roles | 5 | Reaction, button, select menu roles |
| 🤖 AutoMod | 15 | Spam, links, invites, caps, emoji, word filter |
| 📣 Announcements | 3 | Embed builder, DM blast, role pings |
| ⚙️ Admin | 6 | Module toggles, per-server config, full reset |

---

## 🚀 Setup

### 1. Prerequisites
- **Node.js v22+** (required for built-in SQLite)
- **yt-dlp** installed on your system (for music)
- A Discord bot token

### 2. Install yt-dlp (required for music)
```bash
# Windows (winget)
winget install yt-dlp

# Or download from: https://github.com/yt-dlp/yt-dlp/releases
# Place yt-dlp.exe somewhere in your PATH
```

### 3. Clone & Install
```bash
cd "C:\Users\kui2y\OneDrive\Desktop\NorthBot"
npm install
```

### 4. Configure
```bash
copy .env.example .env
```
Edit `.env` and fill in:
```env
BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here
GUILD_ID=your_server_id_here       # For instant slash command registration
OWNER_ID=your_discord_user_id_here

# Optional — for music Spotify metadata:
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Optional — for /util weather:
WEATHER_API_KEY=your_openweather_key
```

### 5. Deploy Slash Commands
```bash
npm run deploy
```

### 6. Start the Bot
```bash
npm start
```

---

## 📋 Complete Command List

### 🛡️ Moderation
| Command | Description |
|---|---|
| `/ban [user] [reason] [days]` | Ban a member |
| `/unban [userid] [reason]` | Unban a user |
| `/kick [user] [reason]` | Kick a member |
| `/softban [user] [reason]` | Ban + unban to delete messages |
| `/massban [userids] [reason]` | Ban multiple users by ID |
| `/timeout [user] [duration] [reason]` | Timeout a member |
| `/warn [user] [reason]` | Warn a member |
| `/warnings [user]` | View warnings for a user |
| `/clearwarnings [user]` | Clear all warnings |
| `/note add/view/delete` | Staff notes on users |
| `/case view/edit/delete/history` | Manage mod cases |
| `/purge [amount] [user] [filter]` | Bulk delete messages |
| `/slowmode [seconds] [channel]` | Set channel slowmode |
| `/lock [channel] [reason]` | Lock a channel |
| `/unlock [channel]` | Unlock a channel |
| `/role add/remove/info` | Manage member roles |
| `/nickname [user] [nickname]` | Change nickname |
| `/move [user] [channel]` | Move member in voice |

### 🎵 Music
| Command | Description |
|---|---|
| `/play [query]` | Play from YouTube, Spotify, or SoundCloud |
| `/pause` | Pause playback |
| `/resume` | Resume playback |
| `/stop` | Stop and clear queue |
| `/skip [to]` | Skip current or jump to position |
| `/queue [page]` | View music queue |
| `/nowplaying` | Current song details |
| `/volume [level]` | Set volume (1-150) |
| `/loop [mode]` | Loop song/queue/off |
| `/shuffle` | Shuffle the queue |
| `/seek [time]` | Jump to position in song |
| `/filter [filter]` | Apply audio filters (bassboost, 8d, nightcore...) |
| `/disconnect` | Leave voice channel |
| `/playlist save/load/delete/list` | Manage saved playlists |

### 💰 Economy
| Command | Description |
|---|---|
| `/balance [user]` | Check coin balance |
| `/daily` | Claim daily coins (streak bonuses) |
| `/weekly` | Claim weekly bonus |
| `/work` | Work for coins (1hr cooldown) |
| `/crime` | Risky high-reward action |
| `/rob [user]` | Rob another user |
| `/heist [bet]` | Group heist (crew-based) |
| `/pay [user] [amount]` | Send coins |
| `/bank deposit/withdraw` | Bank management |
| `/slots [bet]` | Slot machine |
| `/blackjack [bet]` | Blackjack with double-down |
| `/coinflip [choice] [bet]` | Heads or tails |
| `/shop view/buy/add/remove` | Server shop |
| `/inventory [user]` | View inventory |
| `/richlist [limit]` | Server rich list |
| `/fish` | Go fishing (30m cooldown) |
| `/hunt` | Go hunting (1hr cooldown) |
| `/mine` | Mine for ore (1hr cooldown) |

### ⭐ Leveling
| Command | Description |
|---|---|
| `/rank [user]` | View rank and XP progress |
| `/top [limit]` | XP leaderboard |
| `/xp set/add/remove/reset` | Manage user XP (Admin) |
| `/levelconfig ...` | Full leveling configuration |

### 🎙️ Voice
| Command | Description |
|---|---|
| `/topvoice [period] [limit]` | Voice time leaderboard |
| `/voicestats [user]` | Personal voice stats |
| `/voiceconfig ...` | Voice tracking configuration |

### 🎫 Tickets
| Command | Description |
|---|---|
| `/ticket open/close/claim/unclaim` | Manage tickets |
| `/ticket add/remove/rename` | Ticket user management |
| `/ticket panel` | Create a ticket panel |
| `/ticketconfig ...` | Ticket system configuration |

### 🎉 Giveaways
| Command | Description |
|---|---|
| `/giveaway start` | Start a giveaway |
| `/giveaway end/reroll/list/delete` | Manage giveaways |

### 📋 Logging
| Command | Description |
|---|---|
| `/logconfig setup/disable/toggle/status` | Configure logging |

### 🎮 Fun
| Command | Description |
|---|---|
| `/fun 8ball/dice/rps/joke/fact/quote` | Quick fun commands |
| `/fun roast/compliment/ship/rate` | Social fun |
| `/fun mock/uwu/reverse/clap/aesthetic/choose/poll` | Text transforms |
| `/trivia [bet]` | Trivia with optional bet |
| `/tictactoe [opponent]` | Play TicTacToe |
| `/connect4 [opponent]` | Play Connect 4 |
| `/hangman` | Play Hangman |
| `/wordle [guess]` | Play Wordle |
| `/meme [category]` | Random meme from Reddit |

### 🔧 Utility
| Command | Description |
|---|---|
| `/userinfo [user]` | User information |
| `/serverinfo` | Server information |
| `/avatar [user]` | User avatar |
| `/banner [user]` | User profile banner |
| `/channelinfo [channel]` | Channel information |
| `/inviteinfo [invite]` | Invite link info |
| `/remind set/list/cancel` | Set reminders |
| `/snipe delete/edit` | Snipe deleted/edited messages |
| `/afk [reason]` | Set AFK status |
| `/poll [question] [options]` | Multi-option timed poll |
| `/qr [text]` | Generate QR code |
| `/steal [emoji]` | Steal emoji to server |
| `/encode [action] [text]` | Encode/decode (Base64, Binary, Morse) |
| `/help [category]` | Browse all commands |
| `/util ping/botinfo/calc/color/timestamp/permissions/weather/translate` | Utilities |

### 👋 Welcome
| Command | Description |
|---|---|
| `/welcomeconfig ...` | Configure welcome/leave system |

### 🏷️ Reaction Roles
| Command | Description |
|---|---|
| `/reactionrole add/remove/list` | Reaction roles |
| `/reactionrole buttonrole/addbutton` | Button roles |

### 🤖 AutoMod
| Command | Description |
|---|---|
| `/automod enable/disable/status` | Toggle AutoMod |
| `/automod antispam/antilinks/antiinvites/anticaps/antiemoji/antimentions/antizalgo` | Feature toggles |
| `/automod wordfilter/addword/removeword` | Word filter |
| `/automod action/logchannel/exempt` | Settings |

### 📣 Announcements
| Command | Description |
|---|---|
| `/announce send` | Quick announcement |
| `/announce dm` | DM all members with a role |
| `/announce embed` | Rich embed announcement |

### ⚙️ Admin
| Command | Description |
|---|---|
| `/config overview` | Full server config |
| `/config module` | Enable/disable modules |
| `/config modules` | List module statuses |
| `/config modlog` | Set mod log channel |
| `/config muterole` | Set mute role |
| `/config reset` | Reset all bot data |

---

## 🔧 Running 24/7 with PM2

```bash
npm install -g pm2
pm2 start "npm start" --name NorthBot
pm2 save
pm2 startup
```

---

## 📁 Project Structure

```
NorthBot/
├── src/
│   ├── index.js              ← Main bot entry point
│   ├── database.js           ← Central SQLite database
│   ├── loader.js             ← Auto-loads all modules
│   ├── deploy.js             ← Slash command registration
│   ├── utils/
│   │   ├── format.js         ← Time, number, text formatting
│   │   ├── embed.js          ← Embed builders
│   │   └── permissions.js    ← Permission helpers
│   └── modules/
│       ├── moderation/       ← 18 mod commands
│       ├── music/            ← 14 music commands
│       ├── economy/          ← 18 economy commands
│       ├── leveling/         ← 5 leveling commands
│       ├── voice/            ← 3 voice tracking commands
│       ├── tickets/          ← 10 ticket commands
│       ├── giveaways/        ← 5 giveaway commands
│       ├── logging/          ← 5 log commands
│       ├── fun/              ← 15 fun commands
│       ├── utility/          ← 15 utility commands
│       ├── welcome/          ← 7 welcome commands
│       ├── reactionroles/    ← 5 role commands
│       ├── automod/          ← 15 automod commands
│       ├── announcements/    ← 3 announce commands
│       └── admin/            ← 6 admin commands
├── data/
│   └── north.db              ← Auto-created SQLite database
├── .env.example
├── package.json
└── README.md
```

---

## 🔑 Required Bot Permissions

When inviting the bot, enable these permissions:
- `Administrator` *(recommended for full functionality)*

Or individually:
- Manage Server, Manage Roles, Manage Channels, Manage Messages
- Kick Members, Ban Members, Moderate Members
- Send Messages, Embed Links, Attach Files, Add Reactions
- Use External Emojis, Read Message History
- Connect, Speak, Move Members (for music/voice)
- Manage Emojis and Stickers (for `/steal`)

### Required Privileged Intents (Discord Developer Portal)
- ✅ Server Members Intent
- ✅ Message Content Intent
- ✅ Presence Intent

---

## 🌐 Web Dashboard

A web dashboard is planned for a future update. It will allow server admins to configure North Bot through a browser without using slash commands.

---

*North Bot v1.0.0 — Developed by Rayy @qwxlr | North Store*
