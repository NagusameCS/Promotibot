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
            const errorEmbed = new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('Leaderboard Unavailable')
                .setDescription(result.message);
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        if (result.users.length === 0) {
            const emptyEmbed = new EmbedBuilder()
                .setColor(0x99AAB5)
                .setTitle('Empty Leaderboard')
                .setDescription('No ranked members yet!')
                .addFields({
                    name: 'Get Started',
                    value: 'Use `/promote` or `/setrank` to assign ranks to members.'
                });
            return await interaction.reply({ embeds: [emptyEmbed] });
        }

        // Helper function to get rank name
        const getRankName = (r) => typeof r === 'string' ? r : r.name;
        const rankNames = result.ranks.map(getRankName);

        // Build leaderboard with visual elements
        const leaderboardLines = result.users.map((user, index) => {
            const medal = getMedal(index);
            const rankIndex = rankNames.indexOf(user.rank);
            const tierBadge = getTierBadge(rankIndex, rankNames.length);
            const netChange = user.promotions - user.demotions;
            const trend = netChange > 0 ? ` +${netChange}` : netChange < 0 ? ` ${netChange}` : '';
            
            // Progress indicator
            const progressDots = '';
            const progress = Math.round(((rankIndex + 1) / rankNames.length) * 5);
            const progressViz = '' + ''.repeat(progress) + ''.repeat(5 - progress) + '';
            
            return `${medal} **${user.username}**\n` +
                   `${tierBadge} ${user.rank} ${progressViz}${trend}`;
        });

        // Split into chunks if needed for better display
        const description = leaderboardLines.join('\n\n');

        // Calculate some stats
        const totalPromotions = result.users.reduce((sum, u) => sum + u.promotions, 0);
        const totalDemotions = result.users.reduce((sum, u) => sum + u.demotions, 0);
        const avgRankIndex = result.users.reduce((sum, u) => sum + rankNames.indexOf(u.rank), 0) / result.users.length;

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setAuthor({
                name: interaction.guild.name,
                iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setTitle(' Rank Leaderboard')
            .setDescription(description)
            .addFields(
                { name: ' Total Promotions', value: `\`${totalPromotions}\``, inline: true },
                { name: ' Total Demotions', value: `\`${totalDemotions}\``, inline: true },
                { name: ' Avg. Tier', value: `\`${(avgRankIndex + 1).toFixed(1)}\``, inline: true }
            )
            .setFooter({ 
                text: `Showing ${result.users.length} of ${Object.keys(db.getGuildUsers(guildId)).length} ranked members`
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

function getMedal(index) {
    switch (index) {
        case 0: return '';
        case 1: return '';
        case 2: return '';
        default: return `\`#${index + 1}\``;
    }
}

function getTierBadge(rankIndex, totalRanks) {
    const ratio = rankIndex / (totalRanks - 1 || 1);
    if (ratio >= 0.9) return '';
    if (ratio >= 0.7) return '';
    if (ratio >= 0.5) return '';
    if (ratio >= 0.3) return '';
    return '';
}
