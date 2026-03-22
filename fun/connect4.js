// modules/fun/connect4.js
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { embed, error } = require('../../utils/embed');

const ROWS = 6, COLS = 7;
const EMPTY = '⚫', P1 = '🔴', P2 = '🟡';
const games = new Map();

function makeBoard() { return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY)); }

function drop(board, col, piece) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === EMPTY) { board[r][col] = piece; return r; }
  }
  return -1;
}

function checkWin(board, piece) {
  // Horizontal, vertical, diagonal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== piece) continue;
      if (c+3 < COLS && [1,2,3].every(i => board[r][c+i] === piece)) return true;
      if (r+3 < ROWS && [1,2,3].every(i => board[r+i][c] === piece)) return true;
      if (r+3 < ROWS && c+3 < COLS && [1,2,3].every(i => board[r+i][c+i] === piece)) return true;
      if (r+3 < ROWS && c-3 >= 0 && [1,2,3].every(i => board[r+i][c-i] === piece)) return true;
    }
  }
  return false;
}

function renderBoard(board) {
  return board.map(row => row.join('')).join('\n') + '\n1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣';
}

function makeColButtons(gameId, disabled = false) {
  const row = new ActionRowBuilder();
  for (let c = 1; c <= 7; c++) {
    row.addComponents(new ButtonBuilder().setCustomId(`c4_${c}_${gameId}`).setLabel(`${c}`).setStyle(ButtonStyle.Secondary).setDisabled(disabled));
  }
  return [row];
}

module.exports = {
  module: 'fun',
  data: new SlashCommandBuilder()
    .setName('connect4')
    .setDescription('Play Connect 4 against another user')
    .addUserOption(o => o.setName('opponent').setDescription('Your opponent').setRequired(true)),

  async execute(interaction) {
    const opp = interaction.options.getUser('opponent');
    if (opp.bot || opp.id === interaction.user.id) return interaction.reply({ embeds: [error('Invalid', 'Choose a valid human opponent.')], ephemeral: true });

    const gameId = `${interaction.user.id}_${opp.id}_${Date.now()}`;
    const game   = { board: makeBoard(), turn: interaction.user.id, players: { [P1]: interaction.user.id, [P2]: opp.id }, p1: interaction.user, p2: opp, gameId };
    games.set(gameId, game);

    await interaction.reply({
      content: `🎮 **Connect 4**: ${interaction.user} 🔴 vs ${opp} 🟡\n${interaction.user}'s turn (🔴)`,
      embeds:  [embed(0x5865F2).setDescription(renderBoard(game.board))],
      components: makeColButtons(gameId),
    });
  },

  async handleButton(interaction) {
    const parts  = interaction.customId.split('_');
    if (parts[0] !== 'c4') return;
    const col    = parseInt(parts[1]) - 1;
    const gameId = parts.slice(2).join('_');
    const game   = games.get(gameId);
    if (!game) return interaction.reply({ content: 'Game not found.', ephemeral: true });
    if (game.turn !== interaction.user.id) return interaction.reply({ content: '⏳ Not your turn!', ephemeral: true });

    const piece = game.players[P1] === interaction.user.id ? P1 : P2;
    const row   = drop(game.board, col, piece);
    if (row === -1) return interaction.reply({ content: '❌ Column is full!', ephemeral: true });

    if (checkWin(game.board, piece)) {
      games.delete(gameId);
      return interaction.update({
        content: `🏆 **${interaction.user.username}** wins!`,
        embeds:  [embed(piece === P1 ? 0xED4245 : 0xFFD700).setDescription(renderBoard(game.board))],
        components: makeColButtons(gameId, true),
      });
    }

    if (game.board.every(r => r.every(c => c !== EMPTY))) {
      games.delete(gameId);
      return interaction.update({ content: '🤝 It\'s a draw!', embeds: [embed(0x888888).setDescription(renderBoard(game.board))], components: makeColButtons(gameId, true) });
    }

    game.turn = game.turn === game.players[P1] ? game.players[P2] : game.players[P1];
    const nextPiece = game.players[P1] === game.turn ? '🔴' : '🟡';
    const nextUser  = game.players[P1] === game.turn ? game.p1 : game.p2;

    interaction.update({
      content: `<@${nextUser.id}>'s turn (${nextPiece})`,
      embeds:  [embed(0x5865F2).setDescription(renderBoard(game.board))],
      components: makeColButtons(gameId),
    });
  },
};
