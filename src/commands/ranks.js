const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ranks')
        .setDescription('View all ranks configured for this server'),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const ranks = db.getGuildRanks(guildId);

        if (ranks.length === 0) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('No Ranks Configured')
                .setDescription('This server hasn\'t set up a rank hierarchy yet.')
                .addFields({
                    name: 'How to Set Up',
                    value: '```\n/setranks RoleName1, RoleName2, RoleName3\n```\nList your Discord roles from **lowest** to **highest** rank.'
                })
                .setFooter({ text: 'Requires Administrator permission' });
            
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Count users at each rank
        const users = db.getGuildUsers(guildId);
        const rankCounts = {};
        const rankName = r => typeof r === 'string' ? r : r.name;
        ranks.forEach(r => rankCounts[rankName(r)] = 0);

        Object.values(users).forEach(user => {
            if (rankCounts[user.rank] !== undefined) {
                rankCounts[user.rank]++;
            }
        });

        // Build visual rank ladder (highest first)
        const totalUsers = Object.keys(users).length;
        const reversedRanks = [...ranks].reverse();
        
        const rankLines = reversedRanks.map((r, i) => {
            const rName = rankName(r);
            const roleId = typeof r === 'string' ? null : r.roleId;
            const count = rankCounts[rName] || 0;
            const role = roleId ? interaction.guild.roles.cache.get(roleId) : null;
            const tierNum = ranks.length - i;
            
            // Visual tier indicator
            const tierIcon = getTierIcon(i, ranks.length);
            const memberBar = createMemberBar(count, totalUsers || 1);
            const roleMention = role ? `<@&${role.id}>` : `**${rName}**`;
            const warning = (roleId && !role) ? ' *(role deleted)*' : '';
            
            return `${tierIcon} **Tier ${tierNum}** ${roleMention}${warning}\n` +
                   `    ${memberBar} \`${count}\` member${count !== 1 ? 's' : ''}`;
        });

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setAuthor({ 
                name: interaction.guild.name, 
                iconURL: interaction.guild.iconURL({ dynamic: true }) 
            })
            .setTitle('Rank Hierarchy')
            .setDescription(
                '```\n' +
                '    HIGHEST RANK\n' +
                '         ^\n' +
                '         |\n' +
                '```\n' +
                rankLines.join('\n\n') +
                '\n```\n' +
                '         |\n' +
                '         v\n' +
                '    LOWEST RANK\n' +
                '```'
            )
            .addFields(
                { name: 'Total Ranks', value: `\`${ranks.length}\``, inline: true },
                { name: 'Ranked Members', value: `\`${totalUsers}\``, inline: true },
                { name: 'Unranked', value: `\`${interaction.guild.memberCount - totalUsers}\``, inline: true }
            )
            .setFooter({ text: 'Use /promote to move members up the ladder' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

function getTierIcon(index, total) {
    const icons = ['', '', '', '', '', '', '', '', '', ''];
    const ratio = index / (total - 1 || 1);
    if (ratio <= 0.1) return '';
    if (ratio <= 0.3) return '';
    if (ratio <= 0.5) return '';
    if (ratio <= 0.7) return '';
    return '';
}

function createMemberBar(count, total) {
    const percentage = Math.min((count / total) * 100, 100);
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return '' + ''.repeat(filled) + ''.repeat(empty) + '';
}
