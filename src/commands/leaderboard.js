const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the rank leaderboard')
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Number of users to show (default: 10)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(25)),

    async execute(interaction) {
        const limit = interaction.options.getInteger('limit') || 10;
        const guildId = interaction.guildId;

        const result = db.getLeaderboard(guildId, limit);

        if (!result.success) {
            return await interaction.reply({
                content: `[ERROR] ${result.message}`,
                ephemeral: true
            });
        }

        if (result.users.length === 0) {
            return await interaction.reply({
                content: '[STATS] No ranked members yet! Use `/promote` or `/setrank` to assign ranks.',
                ephemeral: true
            });
        }

        const leaderboardText = result.users.map((user, index) => {
            const medal = getMedal(index);
            const rankPosition = result.ranks.indexOf(user.rank) + 1;
            return `${medal} **${user.username}**\n   - ${user.rank} (Rank ${rankPosition}/${result.ranks.length}) | +${user.promotions} | -${user.demotions}`;
        }).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle(`Rank Leaderboard - ${interaction.guild.name}`)
            .setDescription(leaderboardText)
            .setFooter({ text: `Showing top ${result.users.length} members` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

function getMedal(index) {
    switch (index) {
        case 0: return '[1st]';
        case 1: return '[2nd]';
        case 2: return '[3rd]';
        default: return `**${index + 1}.**`;
    }
}
