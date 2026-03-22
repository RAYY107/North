// modules/economy/economy.js
// All economy commands consolidated into /eco subcommands
// Developed by Rayy @qwxlr | North Store

const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { embed, success, error } = require('../../utils/embed');
const { formatNumber, formatDurationCompact, randomInt, progressBar } = require('../../utils/format');

// ─── Slots symbols ───────────────────────────────────────────
const SYMBOLS  = ['🍒','🍋','🍊','🍇','⭐','💎','7️⃣'];
const PAYOUTS  = { '💎':10,'7️⃣':7,'⭐':5,'🍇':4,'🍊':3,'🍋':2,'🍒':1.5 };

// ─── Blackjack helpers ────────────────────────────────────────
const SUITS = ['♠','♥','♦','♣'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
function buildDeck() { return SUITS.flatMap(s => RANKS.map(r => ({ s, r }))).sort(() => Math.random()-0.5); }
function cardVal(r)  { return r==='A'?11:['J','Q','K'].includes(r)?10:parseInt(r); }
function handVal(h)  { let v=0,a=0; for(const c of h){v+=cardVal(c.r);if(c.r==='A')a++;} while(v>21&&a){v-=10;a--;} return v; }
function handStr(h)  { return h.map(c=>`\`${c.r}${c.s}\``).join(' ')+` (${handVal(h)})`; }
const bjGames = new Map();

// ─── Work jobs ────────────────────────────────────────────────
const JOBS   = [['programmer','You shipped a feature'],['chef','You cooked a meal'],['teacher','You taught a class'],['driver','You delivered packages'],['designer','You designed a logo'],['streamer','You went live'],['doctor','You treated patients'],['trader','You made a trade']];
const CRIMES = [['robbed a store',[400,900],[100,300]],['pickpocketed someone',[200,500],[50,200]],['hacked a server',[600,1200],[200,500]],['ran a scam',[300,700],[100,400]]];
const FISH   = [['🐟 common fish',150,300],['🐠 tropical fish',250,500],['🐡 pufferfish',300,600],['🦈 shark',800,1500],['🎣 old boot',10,50]];
const ANIMALS= [['🐇 rabbit',100,250],['🦊 fox',200,400],['🐗 boar',300,600],['🦌 deer',400,800],['🐺 wolf',600,1200],['🦁 lion',1000,2000]];
const ORES   = [['🪨 stone',50,150],['🔩 iron',150,300],['🥇 gold',300,600],['💎 diamond',600,1200],['🌟 stardust',1500,3000]];

module.exports = {
  module: 'economy',
  data: new SlashCommandBuilder()
    .setName('eco')
    .setDescription('Economy system — earn, spend, and gamble coins')

    // ── Balance ─────────────────────────────────────────────
    .addSubcommand(s => s.setName('balance').setDescription('Check your coin balance')
      .addUserOption(o => o.setName('user').setDescription('Check another user').setRequired(false)))

    // ── Daily ───────────────────────────────────────────────
    .addSubcommand(s => s.setName('daily').setDescription('Claim your daily coins'))

    // ── Weekly ──────────────────────────────────────────────
    .addSubcommand(s => s.setName('weekly').setDescription('Claim your weekly coin bonus'))

    // ── Work ────────────────────────────────────────────────
    .addSubcommand(s => s.setName('work').setDescription('Work to earn coins (1hr cooldown)'))

    // ── Crime ───────────────────────────────────────────────
    .addSubcommand(s => s.setName('crime').setDescription('Commit a crime for big coins — risky! (2hr cooldown)'))

    // ── Rob ─────────────────────────────────────────────────
    .addSubcommand(s => s.setName('rob').setDescription('Attempt to rob another user')
      .addUserOption(o => o.setName('user').setDescription('User to rob').setRequired(true)))

    // ── Pay ─────────────────────────────────────────────────
    .addSubcommand(s => s.setName('pay').setDescription('Send coins to another user')
      .addUserOption(o => o.setName('user').setDescription('Recipient').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('Amount to send').setRequired(true).setMinValue(1)))

    // ── Deposit ─────────────────────────────────────────────
    .addSubcommand(s => s.setName('deposit').setDescription('Deposit coins into your bank')
      .addStringOption(o => o.setName('amount').setDescription('Amount or "all"').setRequired(true)))

    // ── Withdraw ────────────────────────────────────────────
    .addSubcommand(s => s.setName('withdraw').setDescription('Withdraw coins from your bank')
      .addStringOption(o => o.setName('amount').setDescription('Amount or "all"').setRequired(true)))

    // ── Slots ───────────────────────────────────────────────
    .addSubcommand(s => s.setName('slots').setDescription('Play the slot machine')
      .addIntegerOption(o => o.setName('bet').setDescription('Amount to bet').setRequired(true).setMinValue(10)))

    // ── Coinflip ────────────────────────────────────────────
    .addSubcommand(s => s.setName('coinflip').setDescription('Flip a coin and bet on the outcome')
      .addStringOption(o => o.setName('choice').setDescription('Heads or Tails').setRequired(true)
        .addChoices({ name: 'Heads', value: 'heads' }, { name: 'Tails', value: 'tails' }))
      .addIntegerOption(o => o.setName('bet').setDescription('Amount to bet').setRequired(true).setMinValue(10)))

    // ── Fish ────────────────────────────────────────────────
    .addSubcommand(s => s.setName('fish').setDescription('Go fishing to earn coins (30m cooldown)'))

    // ── Hunt ────────────────────────────────────────────────
    .addSubcommand(s => s.setName('hunt').setDescription('Go hunting to earn coins (1hr cooldown)'))

    // ── Mine ────────────────────────────────────────────────
    .addSubcommand(s => s.setName('mine').setDescription('Mine for coins (1hr cooldown)'))

    // ── Richlist ────────────────────────────────────────────
    .addSubcommand(s => s.setName('richlist').setDescription('Top richest members in this server')
      .addIntegerOption(o => o.setName('limit').setDescription('Number of users to show').setRequired(false)
        .addChoices({ name: 'Top 10', value: 10 }, { name: 'Top 20', value: 20 })))

    // ── Inventory ───────────────────────────────────────────
    .addSubcommand(s => s.setName('inventory').setDescription('View your inventory')
      .addUserOption(o => o.setName('user').setDescription("View another user's inventory").setRequired(false)))

    // ── Give (admin) ─────────────────────────────────────────
    .addSubcommand(s => s.setName('give').setDescription('Give coins to a user (Admin)')
      .addUserOption(o => o.setName('user').setDescription('User to give coins to').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true).setMinValue(1)))

    // ── Take (admin) ─────────────────────────────────────────
    .addSubcommand(s => s.setName('take').setDescription('Take coins from a user (Admin)')
      .addUserOption(o => o.setName('user').setDescription('User to take coins from').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true).setMinValue(1)))

    // ── Reset (admin) ────────────────────────────────────────
    .addSubcommand(s => s.setName('reset').setDescription('Reset a user\'s economy data (Admin)')
      .addUserOption(o => o.setName('user').setDescription('User to reset').setRequired(true))),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    // ── Balance ─────────────────────────────────────────────
    if (sub === 'balance') {
      const target = interaction.options.getUser('user') || interaction.user;
      const eco    = db.getEconomy(interaction.guildId, target.id);
      const rank   = db.get('SELECT COUNT(*)+1 AS r FROM economy WHERE guild_id=? AND wallet+bank>?', interaction.guildId, eco.wallet+eco.bank)?.r || 1;
      return interaction.reply({ embeds: [embed(0xFFD700)
        .setTitle(`💰 ${target.username}'s Balance`)
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: '👛 Wallet',       value: `🪙 ${formatNumber(eco.wallet)}`,            inline: true },
          { name: '🏦 Bank',         value: `🪙 ${formatNumber(eco.bank)}`,              inline: true },
          { name: '💎 Total',        value: `🪙 ${formatNumber(eco.wallet+eco.bank)}`,   inline: true },
          { name: '📈 Total Earned', value: `🪙 ${formatNumber(eco.total_earned)}`,      inline: true },
          { name: '🏆 Server Rank',  value: `#${rank}`,                                  inline: true },
        )] });
    }

    // ── Daily ───────────────────────────────────────────────
    if (sub === 'daily') {
      const eco  = db.getEconomy(interaction.guildId, interaction.user.id);
      const now  = Math.floor(Date.now()/1000);
      const diff = now - eco.last_daily;
      if (diff < 86400) {
        const left = 86400 - diff;
        return interaction.reply({ embeds: [error('On Cooldown', `Come back in **${Math.floor(left/3600)}h ${Math.floor((left%3600)/60)}m**.`)], ephemeral: true });
      }
      const streakBroken = diff > 172800;
      const streak = streakBroken ? 1 : eco.streak_daily + 1;
      const amount = 500 + streak * 50;
      db.addCoins(interaction.guildId, interaction.user.id, amount);
      db.run('UPDATE economy SET last_daily=?, streak_daily=? WHERE guild_id=? AND user_id=?', now, streak, interaction.guildId, interaction.user.id);
      return interaction.reply({ embeds: [success('Daily Claimed!', `You received 🪙 **${formatNumber(amount)}** coins!\n🔥 Streak: **${streak}** day${streak!==1?'s':''}${streakBroken?' (streak reset)':''}`)] });
    }

    // ── Weekly ──────────────────────────────────────────────
    if (sub === 'weekly') {
      const eco  = db.getEconomy(interaction.guildId, interaction.user.id);
      const now  = Math.floor(Date.now()/1000);
      const diff = now - (eco.last_weekly||0);
      if (diff < 604800) {
        const left = 604800 - diff;
        const d=Math.floor(left/86400), h=Math.floor((left%86400)/3600), m=Math.floor((left%3600)/60);
        return interaction.reply({ embeds: [error('On Cooldown', `Come back in **${d}d ${h}h ${m}m**.`)], ephemeral: true });
      }
      db.addCoins(interaction.guildId, interaction.user.id, 2500);
      db.run('UPDATE economy SET last_weekly=? WHERE guild_id=? AND user_id=?', now, interaction.guildId, interaction.user.id);
      return interaction.reply({ embeds: [success('Weekly Claimed!', `You received 🪙 **${formatNumber(2500)}** coins!`)] });
    }

    // ── Work ────────────────────────────────────────────────
    if (sub === 'work') {
      const eco = db.getEconomy(interaction.guildId, interaction.user.id);
      const now = Math.floor(Date.now()/1000);
      if (now - eco.last_work < 3600) {
        const left = 3600 - (now - eco.last_work);
        return interaction.reply({ embeds: [error('On Cooldown', `Come back in **${Math.floor(left/60)}m**.`)], ephemeral: true });
      }
      const amount = randomInt(150, 400);
      const job    = JOBS[randomInt(0, JOBS.length-1)];
      db.addCoins(interaction.guildId, interaction.user.id, amount);
      db.run('UPDATE economy SET last_work=? WHERE guild_id=? AND user_id=?', now, interaction.guildId, interaction.user.id);
      return interaction.reply({ embeds: [success('Work Complete', `💼 As a **${job[0]}**, ${job[1]} and earned 🪙 **${formatNumber(amount)}** coins!`)] });
    }

    // ── Crime ───────────────────────────────────────────────
    if (sub === 'crime') {
      const eco = db.getEconomy(interaction.guildId, interaction.user.id);
      const now = Math.floor(Date.now()/1000);
      if (now - eco.last_crime < 7200) {
        const left = 7200 - (now - eco.last_crime);
        return interaction.reply({ embeds: [error('Laying Low', `Stay out of trouble for **${Math.floor(left/60)}m**.`)], ephemeral: true });
      }
      db.run('UPDATE economy SET last_crime=? WHERE guild_id=? AND user_id=?', now, interaction.guildId, interaction.user.id);
      const crime = CRIMES[randomInt(0, CRIMES.length-1)];
      const won   = randomInt(1,100) <= 60;
      if (won) {
        const amount = randomInt(...crime[1]);
        db.addCoins(interaction.guildId, interaction.user.id, amount);
        return interaction.reply({ embeds: [success('Crime Successful!', `🦹 You **${crime[0]}** and got away with 🪙 **${formatNumber(amount)}** coins!`)] });
      } else {
        const fine = randomInt(...crime[2]);
        db.removeCoins(interaction.guildId, interaction.user.id, fine);
        return interaction.reply({ embeds: [error('Busted!', `🚔 You **${crime[0]}** but got caught! Paid 🪙 **${formatNumber(fine)}** in fines.`)] });
      }
    }

    // ── Rob ─────────────────────────────────────────────────
    if (sub === 'rob') {
      const target = interaction.options.getUser('user');
      if (target.id===interaction.user.id||target.bot) return interaction.reply({ embeds: [error('Invalid Target','Cannot rob yourself or a bot.')], ephemeral: true });
      const robber = db.getEconomy(interaction.guildId, interaction.user.id);
      const victim = db.getEconomy(interaction.guildId, target.id);
      const now    = Math.floor(Date.now()/1000);
      if (now - robber.last_rob < 10800) {
        const left = 10800 - (now-robber.last_rob);
        return interaction.reply({ embeds: [error('Laying Low', `Wait **${Math.floor(left/60)}m** before robbing again.`)], ephemeral: true });
      }
      if (victim.wallet < 200) return interaction.reply({ embeds: [error('Broke Target', `**${target.username}** doesn't have enough to rob (min 🪙 200).`)], ephemeral: true });
      db.run('UPDATE economy SET last_rob=? WHERE guild_id=? AND user_id=?', now, interaction.guildId, interaction.user.id);
      if (randomInt(1,100)<=55) {
        const stolen = randomInt(Math.floor(victim.wallet*0.1), Math.floor(victim.wallet*0.4));
        db.removeCoins(interaction.guildId, target.id, stolen);
        db.addCoins(interaction.guildId, interaction.user.id, stolen);
        return interaction.reply({ embeds: [success('Robbery Successful!', `💰 You stole 🪙 **${formatNumber(stolen)}** from **${target.username}**!`)] });
      } else {
        const fine = randomInt(100, Math.min(robber.wallet||100, 500));
        db.removeCoins(interaction.guildId, interaction.user.id, fine);
        return interaction.reply({ embeds: [error('Caught!', `🚔 You failed and paid 🪙 **${formatNumber(fine)}** as a fine.`)] });
      }
    }

    // ── Pay ─────────────────────────────────────────────────
    if (sub === 'pay') {
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      if (target.id===interaction.user.id||target.bot) return interaction.reply({ embeds: [error('Invalid','Cannot pay yourself or bots.')], ephemeral: true });
      const sender = db.getEconomy(interaction.guildId, interaction.user.id);
      if (sender.wallet < amount) return interaction.reply({ embeds: [error('Insufficient Funds', `You only have 🪙 **${formatNumber(sender.wallet)}** in your wallet.`)], ephemeral: true });
      db.removeCoins(interaction.guildId, interaction.user.id, amount);
      db.addCoins(interaction.guildId, target.id, amount);
      return interaction.reply({ embeds: [success('Payment Sent', `💸 You sent 🪙 **${formatNumber(amount)}** to **${target.username}**.`)] });
    }

    // ── Deposit ─────────────────────────────────────────────
    if (sub === 'deposit') {
      const eco    = db.getEconomy(interaction.guildId, interaction.user.id);
      const amtStr = interaction.options.getString('amount');
      const amount = amtStr==='all' ? eco.wallet : parseInt(amtStr);
      if (isNaN(amount)||amount<1) return interaction.reply({ embeds: [error('Invalid Amount','Enter a number or "all".')], ephemeral: true });
      if (eco.wallet < amount) return interaction.reply({ embeds: [error('Insufficient Funds',`You only have 🪙 **${formatNumber(eco.wallet)}** in your wallet.`)], ephemeral: true });
      db.run('UPDATE economy SET wallet=wallet-?, bank=bank+? WHERE guild_id=? AND user_id=?', amount, amount, interaction.guildId, interaction.user.id);
      return interaction.reply({ embeds: [success('Deposited', `🏦 Deposited 🪙 **${formatNumber(amount)}** into your bank.`)] });
    }

    // ── Withdraw ────────────────────────────────────────────
    if (sub === 'withdraw') {
      const eco    = db.getEconomy(interaction.guildId, interaction.user.id);
      const amtStr = interaction.options.getString('amount');
      const amount = amtStr==='all' ? eco.bank : parseInt(amtStr);
      if (isNaN(amount)||amount<1) return interaction.reply({ embeds: [error('Invalid Amount','Enter a number or "all".')], ephemeral: true });
      if (eco.bank < amount) return interaction.reply({ embeds: [error('Insufficient Funds',`You only have 🪙 **${formatNumber(eco.bank)}** in your bank.`)], ephemeral: true });
      db.run('UPDATE economy SET bank=bank-?, wallet=wallet+? WHERE guild_id=? AND user_id=?', amount, amount, interaction.guildId, interaction.user.id);
      return interaction.reply({ embeds: [success('Withdrawn', `👛 Withdrew 🪙 **${formatNumber(amount)}** from your bank.`)] });
    }

    // ── Slots ───────────────────────────────────────────────
    if (sub === 'slots') {
      const bet = interaction.options.getInteger('bet');
      const eco = db.getEconomy(interaction.guildId, interaction.user.id);
      if (eco.wallet < bet) return interaction.reply({ embeds: [error('Insufficient Funds',`You only have 🪙 **${formatNumber(eco.wallet)}**.`)], ephemeral: true });
      const spin  = () => SYMBOLS[randomInt(0,SYMBOLS.length-1)];
      const reels = [spin(),spin(),spin()];
      let won=0, msg='';
      if (reels[0]===reels[1]&&reels[1]===reels[2]) { won=Math.floor(bet*(PAYOUTS[reels[0]]||2)); msg=`🎉 **JACKPOT!** Three ${reels[0]}! You won 🪙 **${formatNumber(won)}**!`; }
      else if (reels[0]===reels[1]||reels[1]===reels[2]||reels[0]===reels[2]) { won=Math.floor(bet*1.5); msg=`✨ Two of a kind! You won 🪙 **${formatNumber(won)}**!`; }
      else { msg=`💸 No match. You lost 🪙 **${formatNumber(bet)}**.`; }
      if (won>0) db.addCoins(interaction.guildId, interaction.user.id, won-bet);
      else db.removeCoins(interaction.guildId, interaction.user.id, bet);
      return interaction.reply({ embeds: [embed(won>0?0xFFD700:0xED4245).setTitle('🎰 Slot Machine').setDescription(`[ ${reels.join(' | ')} ]\n\n${msg}`)] });
    }

    // ── Coinflip ────────────────────────────────────────────
    if (sub === 'coinflip') {
      const choice = interaction.options.getString('choice');
      const bet    = interaction.options.getInteger('bet');
      const eco    = db.getEconomy(interaction.guildId, interaction.user.id);
      if (eco.wallet < bet) return interaction.reply({ embeds: [error('Insufficient Funds',`You only have 🪙 **${formatNumber(eco.wallet)}**.`)], ephemeral: true });
      const result = randomInt(0,1)===0 ? 'heads' : 'tails';
      const won    = result===choice;
      if (won) db.addCoins(interaction.guildId, interaction.user.id, bet);
      else db.removeCoins(interaction.guildId, interaction.user.id, bet);
      return interaction.reply({ embeds: [embed(won?0xFFD700:0xED4245).setTitle(`${result==='heads'?'🪙':'🌙'} Coin Flip — ${result.toUpperCase()}`).setDescription(won ? `✅ Correct! You won 🪙 **${formatNumber(bet)}**!` : `❌ Wrong! You lost 🪙 **${formatNumber(bet)}**.`)] });
    }

    // ── Fish ────────────────────────────────────────────────
    if (sub === 'fish') {
      const eco = db.getEconomy(interaction.guildId, interaction.user.id);
      const now = Math.floor(Date.now()/1000);
      if (now - eco.last_fish < 1800) { const left=1800-(now-eco.last_fish); return interaction.reply({ embeds: [error('Fishing Cooldown',`Cast again in **${Math.floor(left/60)}m**.`)], ephemeral: true }); }
      const catch_ = FISH[randomInt(0,FISH.length-1)];
      const amount = randomInt(catch_[1],catch_[2]);
      db.addCoins(interaction.guildId, interaction.user.id, amount);
      db.run('UPDATE economy SET last_fish=? WHERE guild_id=? AND user_id=?', now, interaction.guildId, interaction.user.id);
      return interaction.reply({ embeds: [success('Gone Fishing!',`🎣 You caught a **${catch_[0]}** and earned 🪙 **${formatNumber(amount)}**!`)] });
    }

    // ── Hunt ────────────────────────────────────────────────
    if (sub === 'hunt') {
      const eco = db.getEconomy(interaction.guildId, interaction.user.id);
      const now = Math.floor(Date.now()/1000);
      if (now - eco.last_hunt < 3600) { const left=3600-(now-eco.last_hunt); return interaction.reply({ embeds: [error('Hunting Cooldown',`Hunt again in **${Math.floor(left/60)}m**.`)], ephemeral: true }); }
      db.run('UPDATE economy SET last_hunt=? WHERE guild_id=? AND user_id=?', now, interaction.guildId, interaction.user.id);
      if (randomInt(1,100)<=20) return interaction.reply({ embeds: [error('Missed!','🏹 You went hunting but came back empty-handed.')] });
      const animal = ANIMALS[randomInt(0,ANIMALS.length-1)];
      const amount = randomInt(animal[1],animal[2]);
      db.addCoins(interaction.guildId, interaction.user.id, amount);
      return interaction.reply({ embeds: [success('Successful Hunt!',`🏹 You hunted a **${animal[0]}** and earned 🪙 **${formatNumber(amount)}**!`)] });
    }

    // ── Mine ────────────────────────────────────────────────
    if (sub === 'mine') {
      const eco = db.getEconomy(interaction.guildId, interaction.user.id);
      const now = Math.floor(Date.now()/1000);
      if (now - eco.last_mine < 3600) { const left=3600-(now-eco.last_mine); return interaction.reply({ embeds: [error('Mining Cooldown',`Mine again in **${Math.floor(left/60)}m**.`)], ephemeral: true }); }
      const ore    = ORES[randomInt(0,ORES.length-1)];
      const amount = randomInt(ore[1],ore[2]);
      db.addCoins(interaction.guildId, interaction.user.id, amount);
      db.run('UPDATE economy SET last_mine=? WHERE guild_id=? AND user_id=?', now, interaction.guildId, interaction.user.id);
      return interaction.reply({ embeds: [success('Mining Complete!',`⛏️ You mined **${ore[0]}** and earned 🪙 **${formatNumber(amount)}**!`)] });
    }

    // ── Richlist ────────────────────────────────────────────
    if (sub === 'richlist') {
      await interaction.deferReply();
      const limit = interaction.options.getInteger('limit') || 10;
      const rows  = db.all('SELECT user_id, wallet+bank AS total FROM economy WHERE guild_id=? ORDER BY total DESC LIMIT ?', interaction.guildId, limit);
      if (!rows.length) return interaction.editReply({ embeds: [embed().setTitle('💰 Rich List').setDescription('No economy data yet.')] });
      const { getMedal } = require('../../utils/format');
      const lines = await Promise.all(rows.map(async (r,i) => {
        let name; try { const m=await interaction.guild.members.fetch(r.user_id); name=m.displayName; } catch { name='Unknown'; }
        return `${getMedal(i+1)} **${name}** — 🪙 ${formatNumber(r.total)}`;
      }));
      return interaction.editReply({ embeds: [embed(0xFFD700).setTitle('💰 Server Rich List').setDescription(lines.join('\n'))] });
    }

    // ── Inventory ───────────────────────────────────────────
    if (sub === 'inventory') {
      const target = interaction.options.getUser('user') || interaction.user;
      const items  = db.all('SELECT i.*, s.name, s.emoji, s.description FROM inventory i LEFT JOIN shop_items s ON i.item_id=CAST(s.id AS TEXT) WHERE i.guild_id=? AND i.user_id=?', interaction.guildId, target.id);
      if (!items.length) return interaction.reply({ embeds: [embed().setTitle(`🎒 ${target.username}'s Inventory`).setDescription('Inventory is empty.')] });
      const list = items.map(i=>`${i.emoji||'📦'} **${i.name||'Unknown Item'}** x${i.quantity}`).join('\n');
      return interaction.reply({ embeds: [embed(0x9B59B6).setTitle(`🎒 ${target.username}'s Inventory`).setDescription(list).setThumbnail(target.displayAvatarURL())] });
    }

    // ── Give (admin) ─────────────────────────────────────────
    if (sub === 'give') {
      const { isAdmin } = require('../../utils/permissions');
      if (!isAdmin(interaction.member)) return interaction.reply({ embeds: [error('No Permission','Admin only.')], ephemeral: true });
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      db.addCoins(interaction.guildId, target.id, amount);
      return interaction.reply({ embeds: [success('Coins Given',`Gave 🪙 **${formatNumber(amount)}** to **${target.username}**.`)] });
    }

    // ── Take (admin) ─────────────────────────────────────────
    if (sub === 'take') {
      const { isAdmin } = require('../../utils/permissions');
      if (!isAdmin(interaction.member)) return interaction.reply({ embeds: [error('No Permission','Admin only.')], ephemeral: true });
      const target = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      db.removeCoins(interaction.guildId, target.id, amount);
      return interaction.reply({ embeds: [success('Coins Taken',`Took 🪙 **${formatNumber(amount)}** from **${target.username}**.`)] });
    }

    // ── Reset (admin) ────────────────────────────────────────
    if (sub === 'reset') {
      const { isAdmin } = require('../../utils/permissions');
      if (!isAdmin(interaction.member)) return interaction.reply({ embeds: [error('No Permission','Admin only.')], ephemeral: true });
      const target = interaction.options.getUser('user');
      db.run('DELETE FROM economy WHERE guild_id=? AND user_id=?', interaction.guildId, target.id);
      db.run('DELETE FROM inventory WHERE guild_id=? AND user_id=?', interaction.guildId, target.id);
      return interaction.reply({ embeds: [success('Economy Reset',`**${target.username}**'s economy data has been wiped.`)] });
    }
  },
};
