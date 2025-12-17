const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('View rank statistics for a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check (defaults to yourself)')
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guildId;

        const userData = db.getUser(guildId, targetUser.id);
        const ranks = db.getGuildRanks(guildId);

        if (ranks.length === 0) {
            return await interaction.reply({
                content: '[ERROR] No ranks configured for this server! An admin needs to use `/setranks` first.',
                ephemeral: true
            });
        }

        if (!userData) {
            return await interaction.reply({
                content: `[STATS] **${targetUser.username}** has not been assigned a rank yet.`,
                ephemeral: true
            });
        }

        const currentRankIndex = ranks.indexOf(userData.rank);
        const nextRank = currentRankIndex < ranks.length - 1 ? ranks[currentRankIndex + 1] : null;
        const prevRank = currentRankIndex > 0 ? ranks[currentRankIndex - 1] : null;

        // Create progress bar
        const progress = ((currentRankIndex + 1) / ranks.length) * 100;
        const progressBar = createProgressBar(progress);

        // Format history (last 5 entries)
        const recentHistory = userData.history.slice(-5).reverse();
        const historyText = recentHistory.length > 0
            ? recentHistory.map(h => {
                const date = new Date(h.date).toLocaleDateString();
                const marker = h.type === 'promotion' ? '[UP]' : h.type === 'demotion' ? '[DOWN]' : '[SET]';
                return `${marker} ${h.from || 'None'} -> ${h.to} (${date})`;
            }).join('\n')
            : 'No history yet';

        const embed = new EmbedBuilder()
            .setColor(getRankColor(currentRankIndex, ranks.length))
            .setTitle(`Rank Stats: ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
                {
                    name: 'Current Rank',
                    value: `**${userData.rank}**\n(${currentRankIndex + 1}/${ranks.length})`,
                    inline: true
                },
                {
                    name: 'Progress',
                    value: `${progressBar} ${progress.toFixed(0)}%`,
                    inline: true
                },
                {
                    name: '\u200B',
                    value: '\u200B',
                    inline: true
                },
                {
                    name: 'Promotions',
                    value: `${userData.promotions}`,
                    inline: true
                },
                {
                    name: 'Demotions',
                    value: `${userData.demotions}`,
                    inline: true
                },
                {
                    name: 'Member Since',
                    value: new Date(userData.joinedAt).toLocaleDateString(),
                    inline: true
                },
                {
                    name: 'Next Rank',
                    value: nextRank ? `**${nextRank}**` : '*Highest rank achieved!*',
                    inline: true
                },
                {
                    name: 'Previous Rank',
                    value: prevRank ? `**${prevRank}**` : '*Lowest rank*',
                    inline: true
                },
                {
                    name: '\u200B',
                    value: '\u200B',
                    inline: true
                },
                {
                    name: 'Recent History',
                    value: historyText,
                    inline: false
                }
            )
            .setFooter({ text: `Last updated: ${new Date(userData.lastUpdated).toLocaleString()}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

function createProgressBar(percentage) {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

function getRankColor(currentIndex, totalRanks) {
    const ratio = currentIndex / (totalRanks - 1 || 1);
    if (ratio >= 0.8) return 0xFFD700; // Gold
    if (ratio >= 0.6) return 0xC0C0C0; // Silver
    if (ratio >= 0.4) return 0xCD7F32; // Bronze
    if (ratio >= 0.2) return 0x00FF00; // Green
    return 0x3498DB; // Blue
}
