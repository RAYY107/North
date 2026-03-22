// modules/utility/help.js
// Full help command with category browsing
// Developed by Rayy @qwxlr | North Store

const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const { embed } = require('../../utils/embed');

const CATEGORIES = {
  moderation: {
    emoji: '🛡️',
    desc:  'Server moderation tools',
    commands: [
      '/ban [user] [reason] [days]',
      '/unban [userid] [reason]',
      '/kick [user] [reason]',
      '/softban [user] [reason]',
      '/massban [userids] [reason]',
      '/timeout [user] [duration] [reason]',
      '/warn [user] [reason]',
      '/warnings [user]',
      '/clearwarnings [user]',
      '/note add/view/delete',
      '/case view/edit/delete/history',
      '/purge [amount] [user] [filter]',
      '/slowmode [seconds] [channel]',
      '/lock [channel] [reason]',
      '/unlock [channel]',
      '/role add/remove/info',
      '/nickname [user] [nickname]',
      '/move [user] [channel]',
    ],
  },
  music: {
    emoji: '🎵',
    desc:  'Music playback (YouTube, Spotify, SoundCloud)',
    commands: [
      '/play [query]',
      '/pause',
      '/resume',
      '/stop',
      '/skip [to]',
      '/queue [page]',
      '/nowplaying',
      '/volume [level]',
      '/loop [mode]',
      '/shuffle',
      '/seek [time]',
      '/filter [filter]',
      '/disconnect',
      '/playlist save/load/delete/list',
    ],
  },
  economy: {
    emoji: '💰',
    desc:  'Server economy with coins',
    commands: [
      '/balance [user]',
      '/daily',
      '/work',
      '/crime',
      '/rob [user]',
      '/pay [user] [amount]',
      '/bank deposit/withdraw',
      '/slots [bet]',
      '/blackjack [bet]',
      '/coinflip [choice] [bet]',
      '/shop view/buy/add/remove',
      '/inventory [user]',
      '/richlist [limit]',
      '/fish',
      '/hunt',
      '/mine',
    ],
  },
  leveling: {
    emoji: '⭐',
    desc:  'XP and leveling system',
    commands: [
      '/rank [user]',
      '/top [limit]',
      '/xp set/add/remove/reset',
      '/levelconfig status/channel/xprate/cooldown/multiplier/levelrole/removelevelrole/noxpchannel/noxprole',
    ],
  },
  voice: {
    emoji: '🎙️',
    desc:  'Voice channel time tracking',
    commands: [
      '/topvoice [period] [limit]',
      '/voicestats [user]',
      '/voiceconfig status/channel/milestones/weekly/newtop/ignorechannel/ignorerole/reset',
    ],
  },
  tickets: {
    emoji: '🎫',
    desc:  'Support ticket system',
    commands: [
      '/ticket open/close/claim/unclaim',
      '/ticket add/remove/rename',
      '/ticket panel',
      '/ticketconfig status/category/logchannel/supportrole/maxtickets/welcomemsg',
    ],
  },
  giveaways: {
    emoji: '🎉',
    desc:  'Giveaway management',
    commands: [
      '/giveaway start [channel] [duration] [prize] [winners] [requiredrole] [requiredlevel]',
      '/giveaway end [messageid]',
      '/giveaway reroll [messageid]',
      '/giveaway list',
      '/giveaway delete [messageid]',
    ],
  },
  logging: {
    emoji: '📋',
    desc:  'Server event logging',
    commands: [
      '/logconfig setup [channel]',
      '/logconfig disable',
      '/logconfig toggle [event]',
      '/logconfig ignorechannel [channel]',
      '/logconfig status',
    ],
  },
  fun: {
    emoji: '🎮',
    desc:  'Fun and entertainment',
    commands: [
      '/fun 8ball/dice/rps/joke/fact/quote',
      '/fun roast/compliment/ship/rate',
      '/fun mock/uwu/reverse/clap/aesthetic',
      '/fun choose/poll',
      '/trivia [bet]',
      '/tictactoe [opponent]',
      '/connect4 [opponent]',
      '/hangman',
      '/wordle [guess]',
      '/meme [category]',
    ],
  },
  utility: {
    emoji: '🔧',
    desc:  'General utility commands',
    commands: [
      '/userinfo [user]',
      '/serverinfo',
      '/avatar [user] [type]',
      '/remind set/list/cancel',
      '/snipe delete/edit',
      '/afk [reason]',
      '/util ping',
      '/util botinfo',
      '/util calc [expression]',
      '/util color [hex]',
      '/util timestamp [date]',
      '/util permissions [user] [channel]',
      '/util weather [city]',
      '/util translate [text] [to]',
    ],
  },
  welcome: {
    emoji: '👋',
    desc:  'Welcome and leave messages',
    commands: [
      '/welcomeconfig status',
      '/welcomeconfig welcomechannel/welcomemsg',
      '/welcomeconfig leavechannel/leavemsg',
      '/welcomeconfig welcomedm',
      '/welcomeconfig autorole',
      '/welcomeconfig test',
    ],
  },
  reactionroles: {
    emoji: '🏷️',
    desc:  'Reaction and button roles',
    commands: [
      '/reactionrole add [messageid] [emoji] [role]',
      '/reactionrole remove [messageid] [emoji]',
      '/reactionrole list',
      '/reactionrole buttonrole [channel] [title]',
      '/reactionrole addbutton [role] [label] [emoji] [style]',
    ],
  },
  automod: {
    emoji: '🤖',
    desc:  'Automatic moderation',
    commands: [
      '/automod enable/disable/status',
      '/automod antispam/antilinks/antiinvites',
      '/automod anticaps/antiemoji/antimentions/antizalgo',
      '/automod wordfilter/addword/removeword',
      '/automod action/logchannel/exempt',
    ],
  },
  announcements: {
    emoji: '📣',
    desc:  'Announcement tools',
    commands: [
      '/announce send [channel] [message] [title] [color] [ping]',
      '/announce dm [role] [message]',
      '/announce embed [channel] [title] [description] ...',
    ],
  },
  admin: {
    emoji: '⚙️',
    desc:  'Bot administration',
    commands: [
      '/config overview',
      '/config module [module] [enabled]',
      '/config modules',
      '/config modlog [channel]',
      '/config muterole [role]',
      '/config reset',
    ],
  },
};

module.exports = {
  module: 'utility',
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Browse all North Bot commands')
    .addStringOption(o => o.setName('category').setDescription('Jump to a specific category').setRequired(false)
      .addChoices(...Object.entries(CATEGORIES).map(([k, v]) => ({ name: `${v.emoji} ${k}`, value: k })))),

  async execute(interaction) {
    const cat = interaction.options.getString('category');

    if (cat && CATEGORIES[cat]) {
      const c = CATEGORIES[cat];
      return interaction.reply({
        ephemeral: true,
        embeds: [embed(0x00B4D8)
          .setTitle(`${c.emoji} ${cat.charAt(0).toUpperCase() + cat.slice(1)} Commands`)
          .setDescription(c.desc)
          .addFields({ name: 'Commands', value: c.commands.map(cmd => `\`${cmd}\``).join('\n') })
          .setFooter({ text: 'North Bot • Developed by Rayy @qwxlr | North Store' })],
      });
    }

    // Main overview
    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help_select')
        .setPlaceholder('📂 Browse a category...')
        .addOptions(Object.entries(CATEGORIES).map(([k, v]) => ({
          label: `${v.emoji} ${k.charAt(0).toUpperCase() + k.slice(1)}`,
          description: v.desc,
          value: k,
        }))),
    );

    const fields = Object.entries(CATEGORIES).map(([k, v]) => ({
      name: `${v.emoji} ${k.charAt(0).toUpperCase() + k.slice(1)}`,
      value: `${v.commands.length} commands`,
      inline: true,
    }));

    await interaction.reply({
      embeds: [embed(0x00B4D8)
        .setTitle('🤖 North Bot — Command Help')
        .setDescription(
          '**The ultimate all-in-one Discord bot.**\nSelect a category below to view its commands.\n\n' +
          'Developed by **Rayy @qwxlr** | North Store'
        )
        .addFields(...fields)
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .setFooter({ text: `${Object.values(CATEGORIES).reduce((a,c) => a + c.commands.length, 0)}+ commands across ${Object.keys(CATEGORIES).length} modules` })],
      components: [select],
    });
  },

  async handleButton(interaction) {
    if (interaction.customId !== 'help_select') return;
    const cat = interaction.values[0];
    const c   = CATEGORIES[cat];
    if (!c) return;
    await interaction.reply({
      ephemeral: true,
      embeds: [embed(0x00B4D8)
        .setTitle(`${c.emoji} ${cat.charAt(0).toUpperCase() + cat.slice(1)} Commands`)
        .setDescription(c.desc)
        .addFields({ name: 'Commands', value: c.commands.map(cmd => `\`${cmd}\``).join('\n') })
        .setFooter({ text: 'North Bot • Developed by Rayy @qwxlr | North Store' })],
    });
  },
};
