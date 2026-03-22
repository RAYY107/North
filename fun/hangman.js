// modules/fun/hangman.js
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { embed, error } = require('../../utils/embed');

const WORDS = ['discord','javascript','programming','elephant','mountain','keyboard','universe','nitrogen','pyramid','adventure','community','challenge','knowledge','flamingo','skeleton'];
const STAGES = ['😐','😑','😟','😨','😰','😱','💀'];

const games = new Map();

function buildDisplay(game) {
  const display = game.word.split('').map(l => game.guessed.includes(l) ? `**${l.toUpperCase()}**` : '\\_').join(' ');
  const wrong   = game.wrong.join(', ') || 'None';
  const stage   = STAGES[game.wrong.length] || '💀';
  return { display, wrong, stage, tries: game.wrong.length };
}

function makeAlphabetRows(gameId, guessed) {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const rows = [];
  for (let i = 0; i < 26; i += 7) {
    const row = new ActionRowBuilder();
    for (const l of letters.slice(i, i+7)) {
      row.addComponents(new ButtonBuilder()
        .setCustomId(`hm_${l}_${gameId}`)
        .setLabel(l.toUpperCase())
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(guessed.includes(l)));
    }
    rows.push(row);
  }
  return rows.slice(0, 4); // max 4 rows
}

module.exports = {
  module: 'fun',
  data: new SlashCommandBuilder()
    .setName('hangman')
    .setDescription('Play a game of Hangman'),

  async execute(interaction) {
    if (games.has(interaction.user.id)) return interaction.reply({ content: 'You already have an active hangman game!', ephemeral: true });

    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    const game = { word, guessed: [], wrong: [], userId: interaction.user.id };
    games.set(interaction.user.id, game);

    const { display, stage } = buildDisplay(game);
    await interaction.reply({
      embeds: [embed(0x5865F2).setTitle(`${stage} Hangman`).setDescription(`${display}\n\nWrong guesses: None\nLives: 6/6`)],
      components: makeAlphabetRows(interaction.user.id, []),
    });
  },

  async handleButton(interaction) {
    const parts = interaction.customId.split('_');
    if (parts[0] !== 'hm') return;
    const letter = parts[1];
    const uid    = parts[2];
    if (uid !== interaction.user.id) return interaction.reply({ content: 'This is not your game!', ephemeral: true });

    const game = games.get(interaction.user.id);
    if (!game) return interaction.reply({ content: 'No active game.', ephemeral: true });

    game.guessed.push(letter);
    if (!game.word.includes(letter)) game.wrong.push(letter);

    const { display, wrong, stage, tries } = buildDisplay(game);
    const lives = 6 - tries;
    const won   = game.word.split('').every(l => game.guessed.includes(l));
    const lost  = tries >= 6;

    if (won || lost) {
      games.delete(interaction.user.id);
      return interaction.update({
        embeds: [embed(won ? 0x57F287 : 0xED4245)
          .setTitle(won ? '🎉 You Won!' : '💀 Game Over!')
          .setDescription(`The word was **${game.word.toUpperCase()}**\n\n${display}`)],
        components: [],
      });
    }

    interaction.update({
      embeds: [embed(0x5865F2).setTitle(`${stage} Hangman`).setDescription(`${display}\n\nWrong guesses: ${wrong}\nLives: ${lives}/6`)],
      components: makeAlphabetRows(interaction.user.id, game.guessed),
    });
  },
};
