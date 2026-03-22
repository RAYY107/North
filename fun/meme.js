// modules/fun/meme.js — random meme embed using Reddit meme API
const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const { embed, error } = require('../../utils/embed');

const SUBREDDITS = ['memes','dankmemes','me_irl','programmerhumor','AdviceAnimals','wholesomememes'];

module.exports = {
  module: 'fun',
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Get a random meme')
    .addStringOption(o => o.setName('category').setDescription('Meme category').setRequired(false)
      .addChoices(
        { name: 'General',       value: 'memes'          },
        { name: 'Dank',          value: 'dankmemes'       },
        { name: 'Programmer',    value: 'programmerhumor' },
        { name: 'Wholesome',     value: 'wholesomememes'  },
      )),

  async execute(interaction) {
    await interaction.deferReply();
    const sub = interaction.options.getString('category') || SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)];

    try {
      const res  = await axios.get(`https://www.reddit.com/r/${sub}/random/.json?limit=1`, { headers: { 'User-Agent': 'NorthBot/1.0' } });
      const post = res.data?.[0]?.data?.children?.[0]?.data;
      if (!post || post.over_18) throw new Error('No safe content');

      interaction.editReply({ embeds: [embed(0xFF4500)
        .setTitle(post.title.slice(0, 256))
        .setImage(post.url)
        .setFooter({ text: `r/${sub} • 👍 ${post.ups} • 💬 ${post.num_comments}` })
        .setURL(`https://reddit.com${post.permalink}`)] });
    } catch {
      interaction.editReply({ embeds: [error('Meme Failed', 'Could not fetch a meme. Try again!')] });
    }
  },
};
