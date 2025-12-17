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
            return await interaction.reply({
                content: '[ERROR] No ranks configured for this server! An admin needs to use `/setranks` first.',
                ephemeral: true
            });
        }

        // Count users at each rank
        const users = db.getGuildUsers(guildId);
        const rankCounts = {};
        ranks.forEach(r => rankCounts[r.name] = 0);

        Object.values(users).forEach(user => {
            if (rankCounts[user.rank] !== undefined) {
                rankCounts[user.rank]++;
            }
        });

        const rankList = ranks.map((r, i) => {
            const position = i + 1;
            const marker = getPositionMarker(i, ranks.length);
            const count = rankCounts[r.name];
            const role = interaction.guild.roles.cache.get(r.roleId);
            const roleStatus = role ? '' : ' [ROLE MISSING]';
            return `${marker} **${position}.** ${r.name}${roleStatus} - ${count} member${count !== 1 ? 's' : ''}`;
        }).reverse().join('\n'); // Reverse to show highest first

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`Rank Hierarchy - ${interaction.guild.name}`)
            .setDescription(rankList)
            .setFooter({ text: `Total ranks: ${ranks.length} | Total ranked members: ${Object.keys(users).length}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

function getPositionMarker(index, total) {
    const ratio = index / (total - 1 || 1);
    if (ratio >= 0.8) return '[MAX]';
    if (ratio >= 0.6) return '[HIGH]';
    if (ratio >= 0.4) return '[MID]';
    if (ratio >= 0.2) return '[LOW]';
    return '[MIN]';
}
