// modules/fun/wordle.js
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { embed, error } = require('../../utils/embed');

const WORDS = ['crane','slate','audio','light','brave','clone','doubt','eagle','flame','groan','happy','index','jolts','knife','lemon','magic','night','ocean','place','quiet','raise','stone','tiger','ultra','vivid','write','xenon','yacht','zonal'];

const games = new Map();

function checkGuess(guess, word) {
  const result = [];
  const wordArr  = word.split('');
  const guessArr = guess.split('');
  const used = new Array(5).fill(false);

  // First pass: correct positions (green)
  for (let i = 0; i < 5; i++) {
    if (guessArr[i] === wordArr[i]) { result[i] = '🟩'; used[i] = true; }
    else result[i] = null;
  }
  // Second pass: wrong position (yellow) or not in word (gray)
  for (let i = 0; i < 5; i++) {
    if (result[i]) continue;
    const idx = wordArr.findIndex((l, j) => l === guessArr[i] && !used[j]);
    if (idx !== -1) { result[i] = '🟨'; used[idx] = true; }
    else result[i] = '⬛';
  }
  return result;
}

module.exports = {
  module: 'fun',
  data: new SlashCommandBuilder()
    .setName('wordle')
    .setDescription('Play Wordle — guess the 5-letter word in 6 tries')
    .addStringOption(o => o.setName('guess').setDescription('Your 5-letter guess').setRequired(false)),

  async execute(interaction) {
    const guess = interaction.options.getString('guess')?.toLowerCase();

    // New game
    if (!guess) {
      if (games.has(interaction.user.id)) {
        const g = games.get(interaction.user.id);
        return interaction.reply({ embeds: [embed(0x5865F2).setTitle('🟩 Wordle — Game in Progress').setDescription(g.board.join('\n') || 'No guesses yet.\n\nUse `/wordle guess:<word>` to guess!')], ephemeral: true });
      }
      const word = WORDS[Math.floor(Math.random() * WORDS.length)];
      games.set(interaction.user.id, { word, guesses: [], board: [], attempts: 0 });
      return interaction.reply({ embeds: [embed(0x57F287).setTitle('🟩 Wordle Started!').setDescription('Guess the **5-letter word** in **6 tries**.\n\n🟩 = correct position\n🟨 = wrong position\n⬛ = not in word\n\nUse `/wordle guess:<word>` to play!')], ephemeral: true });
    }

    const game = games.get(interaction.user.id);
    if (!game) return interaction.reply({ content: 'Start a game first with `/wordle`!', ephemeral: true });
    if (guess.length !== 5 || !/^[a-z]+$/.test(guess)) return interaction.reply({ content: '❌ Enter a valid 5-letter word.', ephemeral: true });

    const result = checkGuess(guess, game.word);
    const row    = result.join('') + ' ' + guess.toUpperCase().split('').join(' ');
    game.guesses.push(guess);
    game.board.push(row);
    game.attempts++;

    const won  = result.every(r => r === '🟩');
    const lost = game.attempts >= 6;

    if (won || lost) {
      games.delete(interaction.user.id);
      return interaction.reply({ embeds: [embed(won ? 0x57F287 : 0xED4245)
        .setTitle(won ? `🎉 Solved in ${game.attempts}/6!` : '💀 Game Over!')
        .setDescription(`${game.board.join('\n')}\n\nThe word was **${game.word.toUpperCase()}**`)] });
    }

    interaction.reply({ embeds: [embed(0x5865F2).setTitle(`🟩 Wordle — Attempt ${game.attempts}/6`).setDescription(game.board.join('\n'))] });
  },
};
