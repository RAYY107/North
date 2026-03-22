// modules/economy/heist.js  — group heist mini-game
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database');
const { embed, success, error } = require('../../utils/embed');
const { formatNumber, randomInt } = require('../../utils/format');

const activeHeists = new Map();
const HEIST_WAIT = 30000; // 30s join window
const MIN_BET = 200;

module.exports = {
  module: 'economy',
  data: new SlashCommandBuilder()
    .setName('heist')
    .setDescription('Start a group heist — recruit crew members to steal big!')
    .addIntegerOption(o => o.setName('bet').setDescription('Your bet amount').setRequired(true).setMinValue(MIN_BET)),

  async execute(interaction, client) {
    if (activeHeists.has(interaction.guildId)) return interaction.reply({ embeds: [error('Heist Active', 'A heist is already in progress. Join it!')], ephemeral: true });

    const bet = interaction.options.getInteger('bet');
    const eco = db.getEconomy(interaction.guildId, interaction.user.id);
    if (eco.wallet < bet) return interaction.reply({ embeds: [error('Insufficient Funds', `You need 🪙 **${formatNumber(bet)}** in your wallet.`)], ephemeral: true });

    const heist = { leader: interaction.user.id, crew: [{ id: interaction.user.id, bet }], guildId: interaction.guildId };
    activeHeists.set(interaction.guildId, heist);
    db.removeCoins(interaction.guildId, interaction.user.id, bet);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('heist:join').setLabel('🦹 Join Heist').setStyle(ButtonStyle.Danger),
    );

    const msg = await interaction.reply({
      embeds: [embed(0xED4245)
        .setTitle('🏦 HEIST FORMING!')
        .setDescription(`**${interaction.user.username}** is planning a heist!\nJoin in the next **30 seconds** to get a cut.\n\n💰 Min bet to join: 🪙 **${formatNumber(MIN_BET)}**\nCrew: 1 member`)
        .setFooter({ text: 'More crew = higher success chance!' })],
      components: [row],
      fetchReply: true,
    });

    setTimeout(async () => {
      activeHeists.delete(interaction.guildId);
      const crew = heist.crew;
      const totalPot = crew.reduce((s, m) => s + m.bet, 0);

      // Success chance scales with crew size (40% base + 10% per member, max 90%)
      const successChance = Math.min(90, 40 + (crew.length - 1) * 10);
      const won = randomInt(1, 100) <= successChance;

      if (won) {
        const multiplier = 1.5 + (crew.length * 0.2);
        const totalWin   = Math.floor(totalPot * multiplier);
        const perMember  = Math.floor(totalWin / crew.length);

        for (const m of crew) {
          db.addCoins(interaction.guildId, m.id, perMember);
        }

        const mentions = crew.map(m => `<@${m.id}>`).join(', ');
        await msg.edit({
          embeds: [embed(0x57F287)
            .setTitle('🎉 HEIST SUCCESSFUL!')
            .setDescription(`The crew pulled it off!\n\n**Crew:** ${mentions}\n**Total stolen:** 🪙 ${formatNumber(totalWin)}\n**Each member earned:** 🪙 ${formatNumber(perMember)}`)],
          components: [],
        }).catch(() => {});
      } else {
        const mentions = crew.map(m => `<@${m.id}>`).join(', ');
        await msg.edit({
          embeds: [embed(0xED4245)
            .setTitle('🚔 HEIST FAILED!')
            .setDescription(`The crew got caught!\n\n**Crew:** ${mentions}\n**Total lost:** 🪙 ${formatNumber(totalPot)}\n\nBetter luck next time!`)],
          components: [],
        }).catch(() => {});
      }
    }, HEIST_WAIT);
  },

  async handleButton(interaction, client) {
    if (interaction.customId !== 'heist:join') return;
    const heist = activeHeists.get(interaction.guildId);
    if (!heist) return interaction.reply({ content: 'Heist already started or ended.', ephemeral: true });
    if (heist.crew.find(m => m.id === interaction.user.id)) return interaction.reply({ content: 'You\'re already in the heist!', ephemeral: true });

    const eco = db.getEconomy(interaction.guildId, interaction.user.id);
    if (eco.wallet < MIN_BET) return interaction.reply({ content: `You need 🪙 **${formatNumber(MIN_BET)}** to join!`, ephemeral: true });

    db.removeCoins(interaction.guildId, interaction.user.id, MIN_BET);
    heist.crew.push({ id: interaction.user.id, bet: MIN_BET });

    const mentions = heist.crew.map(m => `<@${m.id}>`).join(', ');
    await interaction.update({
      embeds: [embed(0xED4245)
        .setTitle('🏦 HEIST FORMING!')
        .setDescription(`**Crew (${heist.crew.length}):** ${mentions}\n\nHeist starts soon...`)],
    }).catch(() => {});
  },
};
