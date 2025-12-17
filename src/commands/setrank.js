const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setrank')
        .setDescription('Set a user to a specific rank')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to set the rank for')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('rank')
                .setDescription('The rank to assign')
                .setRequired(true)
                .setAutocomplete(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async autocomplete(interaction) {
        const guildId = interaction.guildId;
        const ranks = db.getGuildRanks(guildId);
        const focusedValue = interaction.options.getFocused().toLowerCase();

        const filtered = ranks.filter(rank =>
            rank.name.toLowerCase().includes(focusedValue)
        );

        await interaction.respond(
            filtered.slice(0, 25).map(rank => ({ name: rank.name, value: rank.name }))
        );
    },

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const rankName = interaction.options.getString('rank');
        const guildId = interaction.guildId;
        const guild = interaction.guild;

        // Get the member object to modify roles
        const member = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) {
            return await interaction.reply({
                content: '[ERROR] Could not find that user in this server.',
                ephemeral: true
            });
        }

        const result = db.setUserToRank(guildId, targetUser.id, targetUser.username, rankName);

        if (result.success) {
            // Update Discord roles
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
                    }
                }
            } catch (roleError) {
                console.error('Error updating roles:', roleError);
                return await interaction.reply({
                    content: `${result.message}\n\n[WARNING] Could not update Discord roles. Make sure the bot has permission and its role is above the rank roles.`,
                    allowedMentions: { users: [targetUser.id] }
                });
            }

            await interaction.reply({
                content: result.message,
                allowedMentions: { users: [targetUser.id] }
            });
        } else {
            await interaction.reply({
                content: `[ERROR] ${result.message}`,
                ephemeral: true
            });
        }
    }
};
