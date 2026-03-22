// modules/fun/tictactoe.js
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { embed, error } = require('../../utils/embed');

const games = new Map();

function makeBoard() { return Array(9).fill(''); }
function checkWinner(b) {
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,c,d] of wins) if (b[a] && b[a]===b[c] && b[a]===b[d]) return b[a];
  return b.every(Boolean) ? 'draw' : null;
}
function renderBoard(board, disabled=false) {
  const rows = [];
  for (let r=0; r<3; r++) {
    const row = new ActionRowBuilder();
    for (let c=0; c<3; c++) {
      const i = r*3+c;
      const val = board[i];
      row.addComponents(new ButtonBuilder().setCustomId(`ttt_${i}`).setLabel(val||'·').setStyle(val==='X'?ButtonStyle.Danger:val==='O'?ButtonStyle.Primary:ButtonStyle.Secondary).setDisabled(disabled||!!val));
    }
    rows.push(row);
  }
  return rows;
}

module.exports = {
  module: 'fun',
  data: new SlashCommandBuilder()
    .setName('tictactoe')
    .setDescription('Play Tic-Tac-Toe against another user')
    .addUserOption(o => o.setName('opponent').setDescription('Opponent').setRequired(true)),

  async execute(interaction) {
    const opp = interaction.options.getUser('opponent');
    if (opp.bot || opp.id === interaction.user.id) return interaction.reply({ embeds: [error('Invalid', 'Choose a valid human opponent.')], ephemeral: true });

    const id = `${interaction.user.id}_${opp.id}`;
    games.set(id, { board: makeBoard(), turn: interaction.user.id, players: { X: interaction.user.id, O: opp.id }, msgId: null });

    const msg = await interaction.reply({
      content: `🎮 **Tic-Tac-Toe**: ${interaction.user} (**X**) vs ${opp} (**O**)\n${interaction.user}'s turn!`,
      components: renderBoard(makeBoard()),
      fetchReply: true,
    });
    games.get(id).msgId = msg.id;
    games.get(id).gameId = id;
  },

  async handleButton(interaction) {
    if (!interaction.customId.startsWith('ttt_')) return;
    const cell = parseInt(interaction.customId.split('_')[1]);

    let game;
    for (const [id, g] of games) {
      if (Object.values(g.players).includes(interaction.user.id)) { game = g; break; }
    }
    if (!game || game.turn !== interaction.user.id) return interaction.reply({ content: 'Not your turn!', ephemeral: true });
    if (game.board[cell]) return interaction.reply({ content: 'Cell already taken!', ephemeral: true });

    const symbol = game.players.X === interaction.user.id ? 'X' : 'O';
    game.board[cell] = symbol;

    const winner = checkWinner(game.board);
    if (winner) {
      games.delete(game.gameId);
      const msg = winner === 'draw' ? '🤝 It\'s a draw!' : `🏆 <@${game.players[winner]}> wins!`;
      return interaction.update({ content: msg, components: renderBoard(game.board, true) });
    }

    game.turn = game.players.X === interaction.user.id ? game.players.O : game.players.X;
    interaction.update({ content: `🎮 <@${game.turn}>'s turn!`, components: renderBoard(game.board) });
  },
};
