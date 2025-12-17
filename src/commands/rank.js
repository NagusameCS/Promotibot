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
            const errorEmbed = new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('No Ranks Configured')
                .setDescription('This server hasn\'t set up a rank hierarchy yet.\nAn admin needs to use `/setranks` first.');
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Helper to get rank name (handles both string and object formats)
        const getRankName = (r) => typeof r === 'string' ? r : r.name;
        const rankNames = ranks.map(getRankName);

        if (!userData) {
            const unrankedEmbed = new EmbedBuilder()
                .setColor(0x99AAB5)
                .setAuthor({ 
                    name: targetUser.username,
                    iconURL: targetUser.displayAvatarURL({ dynamic: true })
                })
                .setTitle('Unranked Member')
                .setDescription(`${targetUser} hasn't been assigned a rank yet.`)
                .addFields({
                    name: 'Available Ranks',
                    value: rankNames.map((r, i) => `${i + 1}. ${r}`).join('\n')
                })
                .setFooter({ text: 'Use /promote to assign their first rank' });
            return await interaction.reply({ embeds: [unrankedEmbed] });
        }

        const currentRankIndex = rankNames.indexOf(userData.rank);
        const nextRank = currentRankIndex < ranks.length - 1 ? getRankName(ranks[currentRankIndex + 1]) : null;
        const prevRank = currentRankIndex > 0 ? getRankName(ranks[currentRankIndex - 1]) : null;

        // Create visual progress through ranks
        const progress = ((currentRankIndex + 1) / ranks.length) * 100;
        const progressBar = createAdvancedProgressBar(currentRankIndex, ranks.length);
        
        // Create rank ladder visualization
        const ladderViz = createRankLadder(rankNames, currentRankIndex);
        
        // Format history with better visuals
        const recentHistory = userData.history.slice(-5).reverse();
        const historyText = recentHistory.length > 0
            ? recentHistory.map(h => {
                const date = new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const icon = h.type === 'promotion' ? '' : h.type === 'demotion' ? '' : '';
                return `${icon} \`${date}\` ${h.from || 'None'}  ${h.to}`;
            }).join('\n')
            : '*No activity yet*';

        // Calculate streak (consecutive promotions/demotions)
        const streak = calculateStreak(userData.history);

        const embed = new EmbedBuilder()
            .setColor(getRankColor(currentRankIndex, ranks.length))
            .setAuthor({
                name: `${targetUser.username}'s Profile`,
                iconURL: targetUser.displayAvatarURL({ dynamic: true })
            })
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
            .setDescription(
                `**Current Rank:** ${userData.rank}\n` +
                `**Tier:** ${currentRankIndex + 1} of ${ranks.length}\n\n` +
                progressBar
            )
            .addFields(
                {
                    name: ' Progress',
                    value: ladderViz,
                    inline: false
                },
                {
                    name: ' Promotions',
                    value: `\`${userData.promotions}\``,
                    inline: true
                },
                {
                    name: ' Demotions',
                    value: `\`${userData.demotions}\``,
                    inline: true
                },
                {
                    name: streak.icon + ' Streak',
                    value: streak.text,
                    inline: true
                },
                {
                    name: ' Next Rank',
                    value: nextRank ? `**${nextRank}**` : ' *Max Rank!*',
                    inline: true
                },
                {
                    name: ' Previous',
                    value: prevRank ? `${prevRank}` : '*Entry Level*',
                    inline: true
                },
                {
                    name: ' Joined',
                    value: `<t:${Math.floor(new Date(userData.joinedAt).getTime() / 1000)}:R>`,
                    inline: true
                },
                {
                    name: ' Recent Activity',
                    value: historyText,
                    inline: false
                }
            )
            .setFooter({ 
                text: `${progress.toFixed(0)}% through the ranks`,
                iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        // Add banner if at max rank
        if (currentRankIndex === ranks.length - 1) {
            embed.setImage('https://i.imgur.com/AfFp7pu.png'); // Placeholder - you can use a custom image
        }

        await interaction.reply({ embeds: [embed] });
    }
};

function createAdvancedProgressBar(currentIndex, total) {
    const segments = total;
    const filled = currentIndex + 1;
    
    let bar = '';
    for (let i = 0; i < segments; i++) {
        if (i < filled - 1) {
            bar += '';
        } else if (i === filled - 1) {
            bar += '';
        } else {
            bar += '';
        }
    }
    
    return `\`Lvl 1\` ${bar} \`Lvl ${total}\``;
}

function createRankLadder(rankNames, currentIndex) {
    const display = [];
    const showCount = Math.min(5, rankNames.length);
    
    // Determine which ranks to show (centered around current)
    let start = Math.max(0, currentIndex - 2);
    let end = Math.min(rankNames.length, start + showCount);
    start = Math.max(0, end - showCount);
    
    for (let i = end - 1; i >= start; i--) {
        const marker = i === currentIndex ? '' : '';
        const opacity = i === currentIndex ? '**' : '';
        const arrow = i === currentIndex ? ' ' : '   ';
        display.push(`${arrow}${marker} ${opacity}${rankNames[i]}${opacity}`);
    }
    
    if (start > 0) display.push(`    *...${start} more below*`);
    if (end < rankNames.length) display.unshift(`    *...${rankNames.length - end} more above*`);
    
    return display.join('\n');
}

function calculateStreak(history) {
    if (!history || history.length === 0) return { icon: '', text: 'No activity' };
    
    let streak = 0;
    let lastType = history[history.length - 1]?.type;
    
    for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].type === lastType) {
            streak++;
        } else {
            break;
        }
    }
    
    if (lastType === 'promotion') {
        return { icon: '', text: `${streak} promotion${streak > 1 ? 's' : ''}` };
    } else if (lastType === 'demotion') {
        return { icon: '', text: `${streak} demotion${streak > 1 ? 's' : ''}` };
    }
    return { icon: '', text: 'Assigned' };
}

function getRankColor(currentIndex, totalRanks) {
    const ratio = currentIndex / (totalRanks - 1 || 1);
    if (ratio >= 0.9) return 0xFFD700; // Gold
    if (ratio >= 0.7) return 0xE91E63; // Pink/Magenta
    if (ratio >= 0.5) return 0x9B59B6; // Purple
    if (ratio >= 0.3) return 0x3498DB; // Blue
    if (ratio >= 0.1) return 0x2ECC71; // Green
    return 0x95A5A6; // Gray
}
