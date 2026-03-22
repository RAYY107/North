// modules/fun/fun.js  — All fun commands in one file
// 8ball, coinflip, dice, rps, joke, meme, roast, compliment, ship, rate,
// fact, quote, mock, uwu, reverse, clap, aesthetic, poll, choose, love
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { embed, success } = require('../../utils/embed');
const { randomInt } = require('../../utils/format');

const EIGHTBALL = ['It is certain.','It is decidedly so.','Without a doubt.','Yes, definitely.','You may rely on it.','As I see it, yes.','Most likely.','Outlook good.','Yes.','Signs point to yes.','Reply hazy, try again.','Ask again later.','Better not tell you now.','Cannot predict now.','Concentrate and ask again.','Don\'t count on it.','My reply is no.','My sources say no.','Outlook not so good.','Very doubtful.'];
const JOKES = ['Why don\'t scientists trust atoms? Because they make up everything!','I told my wife she was drawing her eyebrows too high. She looked surprised.','What do you call a fake noodle? An impasta.','I\'m reading a book about anti-gravity. It\'s impossible to put down.','Did you hear about the mathematician who\'s afraid of negative numbers? He\'ll stop at nothing to avoid them.','Why did the scarecrow win an award? Because he was outstanding in his field.','I used to hate facial hair, but then it grew on me.','What do you call cheese that isn\'t yours? Nacho cheese.'];
const FACTS = ['Honey never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs.','A day on Venus is longer than a year on Venus.','Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid.','The shortest war in history lasted 38 minutes.','Bananas are slightly radioactive.','A group of flamingos is called a flamboyance.','Wombats produce cube-shaped droppings.','The Eiffel Tower can be 15cm taller during summer due to thermal expansion.'];
const QUOTES = ['"Be yourself; everyone else is already taken." — Oscar Wilde','"Two things are infinite: the universe and human stupidity." — Einstein','"Be the change that you wish to see in the world." — Gandhi','"In the middle of every difficulty lies opportunity." — Einstein','"It does not matter how slowly you go as long as you do not stop." — Confucius'];
const ROASTS = ['You\'re the reason they put instructions on shampoo bottles.','I\'d agree with you, but then we\'d both be wrong.','You\'re not stupid; you just have bad luck thinking.','You\'re like a software update — whenever I see you, I think "not now".','You bring everyone so much joy... when you leave the room.'];
const COMPLIMENTS = ['You light up every room you walk into! ✨','Your kindness is truly infectious. 💖','You have an amazing ability to make people feel welcome. 🌟','You\'re more fun than bubble wrap! 🎉','The world is a better place because you\'re in it. 🌍'];

module.exports = {
  module: 'fun',
  data: new SlashCommandBuilder()
    .setName('fun')
    .setDescription('Fun commands')
    .addSubcommand(s => s.setName('8ball').setDescription('Ask the magic 8ball a question')
      .addStringOption(o => o.setName('question').setDescription('Your question').setRequired(true)))
    .addSubcommand(s => s.setName('dice').setDescription('Roll dice')
      .addIntegerOption(o => o.setName('sides').setDescription('Number of sides (default 6)').setRequired(false).setMinValue(2).setMaxValue(100))
      .addIntegerOption(o => o.setName('count').setDescription('Number of dice').setRequired(false).setMinValue(1).setMaxValue(10)))
    .addSubcommand(s => s.setName('rps').setDescription('Rock, Paper, Scissors')
      .addStringOption(o => o.setName('choice').setDescription('Your choice').setRequired(true)
        .addChoices({ name: '🪨 Rock', value: 'rock' }, { name: '📄 Paper', value: 'paper' }, { name: '✂️ Scissors', value: 'scissors' })))
    .addSubcommand(s => s.setName('joke').setDescription('Get a random joke'))
    .addSubcommand(s => s.setName('fact').setDescription('Get a random interesting fact'))
    .addSubcommand(s => s.setName('quote').setDescription('Get an inspirational quote'))
    .addSubcommand(s => s.setName('roast').setDescription('Roast someone')
      .addUserOption(o => o.setName('user').setDescription('User to roast').setRequired(true)))
    .addSubcommand(s => s.setName('compliment').setDescription('Compliment someone')
      .addUserOption(o => o.setName('user').setDescription('User to compliment').setRequired(true)))
    .addSubcommand(s => s.setName('ship').setDescription('Ship two users')
      .addUserOption(o => o.setName('user1').setDescription('First user').setRequired(true))
      .addUserOption(o => o.setName('user2').setDescription('Second user').setRequired(false)))
    .addSubcommand(s => s.setName('rate').setDescription('Rate something')
      .addStringOption(o => o.setName('thing').setDescription('What to rate').setRequired(true)))
    .addSubcommand(s => s.setName('mock').setDescription('Mock a message')
      .addStringOption(o => o.setName('text').setDescription('Text to mock').setRequired(true)))
    .addSubcommand(s => s.setName('uwu').setDescription('UwUify some text')
      .addStringOption(o => o.setName('text').setDescription('Text to uwuify').setRequired(true)))
    .addSubcommand(s => s.setName('reverse').setDescription('Reverse some text')
      .addStringOption(o => o.setName('text').setDescription('Text to reverse').setRequired(true)))
    .addSubcommand(s => s.setName('clap').setDescription('Add 👏 between 👏 words')
      .addStringOption(o => o.setName('text').setDescription('Text').setRequired(true)))
    .addSubcommand(s => s.setName('aesthetic').setDescription('Convert text to aesthetic style')
      .addStringOption(o => o.setName('text').setDescription('Text').setRequired(true)))
    .addSubcommand(s => s.setName('choose').setDescription('Choose between options (comma-separated)')
      .addStringOption(o => o.setName('options').setDescription('Options separated by commas').setRequired(true)))
    .addSubcommand(s => s.setName('poll').setDescription('Create a quick yes/no poll')
      .addStringOption(o => o.setName('question').setDescription('Poll question').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === '8ball') {
      const q   = interaction.options.getString('question');
      const ans = EIGHTBALL[randomInt(0, EIGHTBALL.length - 1)];
      return interaction.reply({ embeds: [embed(0x9B59B6).setTitle('🎱 Magic 8-Ball').addFields({ name: '❓ Question', value: q }, { name: '🎱 Answer', value: ans })] });
    }

    if (sub === 'dice') {
      const sides = interaction.options.getInteger('sides') || 6;
      const count = interaction.options.getInteger('count') || 1;
      const rolls = Array.from({ length: count }, () => randomInt(1, sides));
      const total = rolls.reduce((a, b) => a + b, 0);
      return interaction.reply({ embeds: [embed(0xFFD700).setTitle(`🎲 Dice Roll (${count}d${sides})`).setDescription(`Results: **${rolls.join(', ')}**\nTotal: **${total}**`)] });
    }

    if (sub === 'rps') {
      const choices  = ['rock', 'paper', 'scissors'];
      const emojis   = { rock: '🪨', paper: '📄', scissors: '✂️' };
      const player   = interaction.options.getString('choice');
      const bot      = choices[randomInt(0, 2)];
      const wins     = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
      const result   = player === bot ? '🤝 It\'s a tie!' : wins[player] === bot ? '✅ You win!' : '❌ You lose!';
      return interaction.reply({ embeds: [embed(0x5865F2).setTitle('✂️ Rock Paper Scissors').addFields({ name: 'You', value: `${emojis[player]} ${player}`, inline: true }, { name: 'Bot', value: `${emojis[bot]} ${bot}`, inline: true }, { name: 'Result', value: result, inline: false })] });
    }

    if (sub === 'joke')  return interaction.reply({ embeds: [embed(0xFFD700).setTitle('😂 Random Joke').setDescription(JOKES[randomInt(0, JOKES.length-1)])] });
    if (sub === 'fact')  return interaction.reply({ embeds: [embed(0x5BC0EB).setTitle('🧠 Random Fact').setDescription(FACTS[randomInt(0, FACTS.length-1)])] });
    if (sub === 'quote') return interaction.reply({ embeds: [embed(0x9B59B6).setTitle('💭 Quote').setDescription(QUOTES[randomInt(0, QUOTES.length-1)])] });

    if (sub === 'roast') {
      const user = interaction.options.getUser('user');
      return interaction.reply({ embeds: [embed(0xED4245).setTitle(`🔥 Roasting ${user.username}`).setDescription(ROASTS[randomInt(0, ROASTS.length-1)])] });
    }

    if (sub === 'compliment') {
      const user = interaction.options.getUser('user');
      return interaction.reply({ embeds: [embed(0xFF69B4).setTitle(`💖 Compliment for ${user.username}`).setDescription(COMPLIMENTS[randomInt(0, COMPLIMENTS.length-1)])] });
    }

    if (sub === 'ship') {
      const u1  = interaction.options.getUser('user1');
      const u2  = interaction.options.getUser('user2') || interaction.user;
      const pct = randomInt(1, 100);
      const bar = '❤️'.repeat(Math.floor(pct/10)) + '🖤'.repeat(10-Math.floor(pct/10));
      return interaction.reply({ embeds: [embed(0xFF69B4).setTitle('💘 Ship Meter').setDescription(`**${u1.username}** 💕 **${u2.username}**\n\n${bar}\n\n**${pct}%** compatible!`)] });
    }

    if (sub === 'rate') {
      const thing = interaction.options.getString('thing');
      const score = randomInt(0, 100);
      return interaction.reply({ embeds: [embed(0x5865F2).setTitle('⭐ Rating').setDescription(`I rate **${thing}** a **${score}/100**`)] });
    }

    if (sub === 'mock') {
      const text = interaction.options.getString('text').split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join('');
      return interaction.reply({ content: text });
    }

    if (sub === 'uwu') {
      const text = interaction.options.getString('text').replace(/r|l/g,'w').replace(/R|L/g,'W').replace(/n([aeiou])/g,'ny$1').replace(/N([aeiou])/g,'Ny$1').replace(/th/g,'d').replace(/ove/g,'uv');
      return interaction.reply({ content: `${text} uwu` });
    }

    if (sub === 'reverse') {
      return interaction.reply({ content: interaction.options.getString('text').split('').reverse().join('') });
    }

    if (sub === 'clap') {
      return interaction.reply({ content: interaction.options.getString('text').split(' ').join(' 👏 ') });
    }

    if (sub === 'aesthetic') {
      const normal = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const wide   = 'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ０１２３４５６７８９';
      const text = interaction.options.getString('text').split('').map(c => { const i = normal.indexOf(c); return i !== -1 ? wide[i] : c; }).join('');
      return interaction.reply({ content: text });
    }

    if (sub === 'choose') {
      const opts = interaction.options.getString('options').split(',').map(o => o.trim()).filter(Boolean);
      if (opts.length < 2) return interaction.reply({ content: 'Give me at least 2 options!', ephemeral: true });
      const chosen = opts[randomInt(0, opts.length - 1)];
      return interaction.reply({ embeds: [embed(0x57F287).setTitle('🤔 I choose...').setDescription(`**${chosen}**`)] });
    }

    if (sub === 'poll') {
      const q = interaction.options.getString('question');
      const msg = await interaction.reply({ embeds: [embed(0x5865F2).setTitle('📊 Poll').setDescription(`**${q}**`).setFooter({ text: `Poll by ${interaction.user.tag}` })], fetchReply: true });
      await msg.react('✅').catch(() => {});
      await msg.react('❌').catch(() => {});
    }
  },
};
