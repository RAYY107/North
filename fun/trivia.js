// modules/fun/trivia.js
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { embed } = require('../../utils/embed');

const QUESTIONS = [
  { q: 'What is the capital of France?', a: 'Paris', choices: ['London','Paris','Berlin','Madrid'] },
  { q: 'How many planets are in our solar system?', a: '8', choices: ['7','8','9','10'] },
  { q: 'What is the largest ocean on Earth?', a: 'Pacific', choices: ['Atlantic','Indian','Arctic','Pacific'] },
  { q: 'Who painted the Mona Lisa?', a: 'Da Vinci', choices: ['Picasso','Da Vinci','Rembrandt','Monet'] },
  { q: 'What is the chemical symbol for Gold?', a: 'Au', choices: ['Ag','Go','Au','Gd'] },
  { q: 'How many sides does a hexagon have?', a: '6', choices: ['5','6','7','8'] },
  { q: 'What is the fastest land animal?', a: 'Cheetah', choices: ['Lion','Horse','Cheetah','Leopard'] },
  { q: 'In which year did World War II end?', a: '1945', choices: ['1943','1944','1945','1946'] },
];

const activeTrivia = new Map();

module.exports = {
  module: 'fun',
  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Answer a trivia question and earn coins')
    .addIntegerOption(o => o.setName('bet').setDescription('Coins to bet (optional)').setRequired(false).setMinValue(10)),

  async execute(interaction, client) {
    if (activeTrivia.has(interaction.user.id)) return interaction.reply({ content: 'You already have an active trivia question!', ephemeral: true });

    const q    = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    const bet  = interaction.options.getInteger('bet') || 0;
    const shuffled = [...q.choices].sort(() => Math.random() - 0.5);

    activeTrivia.set(interaction.user.id, { answer: q.a, bet, guildId: interaction.guildId });

    const row = new ActionRowBuilder().addComponents(
      shuffled.map((c, i) => new ButtonBuilder().setCustomId(`trivia_${i}_${interaction.user.id}`).setLabel(c).setStyle(ButtonStyle.Secondary))
    );

    await interaction.reply({
      embeds: [embed(0x5865F2).setTitle('🧠 Trivia').setDescription(`**${q.q}**\n\n${bet ? `Bet: 🪙 ${bet}` : 'No bet'}`).setFooter({ text: 'You have 30 seconds!' })],
      components: [row],
    });

    // Auto-expire after 30s
    setTimeout(() => {
      if (activeTrivia.has(interaction.user.id)) {
        activeTrivia.delete(interaction.user.id);
        interaction.editReply({ embeds: [embed(0xED4245).setTitle('⏰ Time\'s Up!').setDescription(`The answer was **${q.a}**.`)], components: [] }).catch(() => {});
      }
    }, 30000);
  },

  async handleButton(interaction, client) {
    const parts = interaction.customId.split('_');
    if (parts[0] !== 'trivia' || parts[2] !== interaction.user.id) return;

    const game = activeTrivia.get(interaction.user.id);
    if (!game) return interaction.reply({ content: 'No active trivia.', ephemeral: true });

    const chosen = interaction.message.components[0].components[parseInt(parts[1])].label;
    const correct = chosen === game.answer;
    activeTrivia.delete(interaction.user.id);

    if (game.bet) {
      const db = require('../../database');
      if (correct) db.addCoins(game.guildId, interaction.user.id, game.bet);
      else db.removeCoins(game.guildId, interaction.user.id, game.bet);
    }

    interaction.update({
      embeds: [embed(correct ? 0x57F287 : 0xED4245)
        .setTitle(correct ? '✅ Correct!' : '❌ Wrong!')
        .setDescription(`The answer was **${game.answer}**.${game.bet ? `\n${correct ? `You won 🪙 ${game.bet}!` : `You lost 🪙 ${game.bet}.`}` : ''}`)],
      components: [],
    });
  },
};
