// modules/economy/blackjack.js
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database');
const { embed, error } = require('../../utils/embed');
const { formatNumber, randomInt } = require('../../utils/format');

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

function buildDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ s, r });
  return d.sort(() => Math.random() - 0.5);
}
function cardVal(r) { return r === 'A' ? 11 : ['J','Q','K'].includes(r) ? 10 : parseInt(r); }
function handVal(hand) {
  let v = 0, aces = 0;
  for (const c of hand) { v += cardVal(c.r); if (c.r === 'A') aces++; }
  while (v > 21 && aces) { v -= 10; aces--; }
  return v;
}
function handStr(hand) { return hand.map(c => `\`${c.r}${c.s}\``).join(' ') + ` (${handVal(hand)})`; }

const activeGames = new Map();

module.exports = {
  module: 'economy',
  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('Play Blackjack')
    .addIntegerOption(o => o.setName('bet').setDescription('Amount to bet').setRequired(true).setMinValue(10)),

  async execute(interaction) {
    const bet = interaction.options.getInteger('bet');
    const eco = db.getEconomy(interaction.guildId, interaction.user.id);
    if (eco.wallet < bet) return interaction.reply({ embeds: [error('Insufficient Funds', `You only have 🪙 **${formatNumber(eco.wallet)}**.`)], ephemeral: true });
    if (activeGames.has(interaction.user.id)) return interaction.reply({ embeds: [error('Game Active', 'Finish your current game first.')], ephemeral: true });

    const deck = buildDeck();
    const player = [deck.pop(), deck.pop()];
    const dealer = [deck.pop(), deck.pop()];

    activeGames.set(interaction.user.id, { deck, player, dealer, bet, guildId: interaction.guildId });
    db.removeCoins(interaction.guildId, interaction.user.id, bet);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`bj_hit_${interaction.user.id}`).setLabel('Hit').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`bj_stand_${interaction.user.id}`).setLabel('Stand').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`bj_double_${interaction.user.id}`).setLabel('Double Down').setStyle(ButtonStyle.Danger),
    );

    const pv = handVal(player);
    if (pv === 21) {
      activeGames.delete(interaction.user.id);
      const win = Math.floor(bet * 2.5);
      db.addCoins(interaction.guildId, interaction.user.id, win);
      return interaction.reply({ embeds: [embed(0xFFD700).setTitle('🃏 Blackjack — BLACKJACK!').setDescription(`Player: ${handStr(player)}\nDealer: ${handStr(dealer)}\n\n🎉 **Blackjack! You won 🪙 ${formatNumber(win)}!**`)] });
    }

    interaction.reply({
      embeds: [embed(0x5865F2).setTitle('🃏 Blackjack').setDescription(
        `**Your hand:** ${handStr(player)}\n**Dealer shows:** \`${dealer[0].r}${dealer[0].s}\` | \`?\`\n\nBet: 🪙 ${formatNumber(bet)}`
      )],
      components: [row],
    });
  },

  async handleButton(interaction, client) {
    const [action, type, uid] = interaction.customId.split('_');
    if (action !== 'bj' || uid !== interaction.user.id) return;
    const game = activeGames.get(interaction.user.id);
    if (!game) return interaction.reply({ content: 'No active game.', ephemeral: true });

    if (type === 'hit') {
      game.player.push(game.deck.pop());
      const pv = handVal(game.player);
      if (pv > 21) {
        activeGames.delete(interaction.user.id);
        return interaction.update({ embeds: [embed(0xED4245).setTitle('🃏 Blackjack — Bust!').setDescription(`**Your hand:** ${handStr(game.player)}\n\n💸 Bust! You lost 🪙 **${formatNumber(game.bet)}**.`)], components: [] });
      }
      if (pv === 21) return handleStand(interaction, game);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bj_hit_${interaction.user.id}`).setLabel('Hit').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bj_stand_${interaction.user.id}`).setLabel('Stand').setStyle(ButtonStyle.Secondary),
      );
      return interaction.update({ embeds: [embed(0x5865F2).setTitle('🃏 Blackjack').setDescription(`**Your hand:** ${handStr(game.player)}\n**Dealer shows:** \`${game.dealer[0].r}${game.dealer[0].s}\` | \`?\``)], components: [row] });
    }

    if (type === 'stand' || type === 'double') {
      if (type === 'double') {
        const eco = db.getEconomy(game.guildId, interaction.user.id);
        if (eco.wallet < game.bet) return interaction.reply({ content: 'Not enough coins to double.', ephemeral: true });
        db.removeCoins(game.guildId, interaction.user.id, game.bet);
        game.bet *= 2;
        game.player.push(game.deck.pop());
        if (handVal(game.player) > 21) {
          activeGames.delete(interaction.user.id);
          return interaction.update({ embeds: [embed(0xED4245).setTitle('🃏 Blackjack — Bust!').setDescription(`**Your hand:** ${handStr(game.player)}\n\n💸 Bust after double! Lost 🪙 **${formatNumber(game.bet)}**.`)], components: [] });
        }
      }
      return handleStand(interaction, game);
    }
  },
};

async function handleStand(interaction, game) {
  while (handVal(game.dealer) < 17) game.dealer.push(game.deck.pop());
  const pv = handVal(game.player), dv = handVal(game.dealer);
  activeGames.delete(interaction.user.id);

  let resultMsg, color;
  if (dv > 21 || pv > dv) {
    const win = game.bet * 2;
    db.addCoins(game.guildId, interaction.user.id, win);
    resultMsg = `🎉 **You win! +🪙 ${formatNumber(game.bet)}**`;
    color = 0x57F287;
  } else if (pv === dv) {
    db.addCoins(game.guildId, interaction.user.id, game.bet);
    resultMsg = `🤝 **Push! Bet returned.**`;
    color = 0xFEE75C;
  } else {
    resultMsg = `💸 **Dealer wins. Lost 🪙 ${formatNumber(game.bet)}.**`;
    color = 0xED4245;
  }

  interaction.update({
    embeds: [embed(color).setTitle('🃏 Blackjack — Result').setDescription(
      `**Your hand:** ${handStr(game.player)}\n**Dealer hand:** ${handStr(game.dealer)}\n\n${resultMsg}`
    )],
    components: [],
  });
}
