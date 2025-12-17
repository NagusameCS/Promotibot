const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('promote')
        .setDescription('Promote a user to the next rank')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to promote')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const guildId = interaction.guildId;
        const guild = interaction.guild;

        // Get the member object to modify roles
        const member = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('User Not Found')
                .setDescription('Could not find that user in this server.');
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const result = db.promoteUser(guildId, targetUser.id, targetUser.username);

        if (result.success) {
            // Update Discord roles
            let roleWarning = '';
            try {
                // Remove old rank role if exists
                if (result.oldRoleId) {
                    const oldRole = guild.roles.cache.get(result.oldRoleId);
                    if (oldRole && member.roles.cache.has(oldRole.id)) {
                        await member.roles.remove(oldRole);
                    }
                }

                // Add new rank role
                if (result.newRoleId) {
                    const newRole = guild.roles.cache.get(result.newRoleId);
                    if (newRole) {
                        await member.roles.add(newRole);
                    } else {
                        roleWarning = '\n\n *Role not found - please reconfigure ranks*';
                    }
                }
            } catch (roleError) {
                console.error('Error updating roles:', roleError);
                roleWarning = '\n\n *Could not update roles - check bot permissions*';
            }

            // Get rank info for visual
            const ranks = db.getGuildRanks(guildId);
            const getRankName = (r) => typeof r === 'string' ? r : r.name;
            const rankNames = ranks.map(getRankName);
            const newRankIndex = rankNames.indexOf(result.newRank);
            const progress = ((newRankIndex + 1) / rankNames.length) * 100;

            // Create progress visualization
            const progressBar = createProgressBar(newRankIndex + 1, rankNames.length);

            const embed = new EmbedBuilder()
                .setColor(0x57F287)
                .setAuthor({
                    name: 'PROMOTION',
                    iconURL: targetUser.displayAvatarURL({ dynamic: true })
                })
                .setTitle(` ${targetUser.username} has been promoted!`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
                .setDescription(
                    result.oldRank 
                        ? `**${result.oldRank}**  **${result.newRank}**`
                        : `Welcome to **${result.newRank}**!`
                )
                .addFields(
                    { name: 'New Rank', value: `**${result.newRank}**`, inline: true },
                    { name: 'Tier', value: `${newRankIndex + 1} / ${rankNames.length}`, inline: true },
                    { name: 'Progress', value: `${progress.toFixed(0)}%`, inline: true },
                    { name: '\u200B', value: progressBar, inline: false }
                )
                .setFooter({ 
                    text: `Promoted by ${interaction.user.username}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            if (roleWarning) {
                embed.addFields({ name: 'Warning', value: roleWarning, inline: false });
            }

            // Check if max rank
            if (newRankIndex === rankNames.length - 1) {
                embed.addFields({ 
                    name: ' Max Rank Achieved!', 
                    value: `${targetUser.username} has reached the highest rank!`,
                    inline: false 
                });
            }

            await interaction.reply({ 
                embeds: [embed],
                allowedMentions: { users: [targetUser.id] }
            });
        } else {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('Cannot Promote')
                .setDescription(result.message)
                .setFooter({ text: 'No changes were made' });
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};

function createProgressBar(current, total) {
    const width = 20;
    const filled = Math.round((current / total) * width);
    const empty = width - filled;
    
    let bar = '';
    for (let i = 0; i < width; i++) {
        if (i < filled - 1) bar += '';
        else if (i === filled - 1) bar += '';
        else bar += '';
    }
    
    return `\`1\` ${bar} \`${total}\``;
}
