const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetuser')
        .setDescription('Remove a user from the ranking system')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to reset')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const guildId = interaction.guildId;
        const guild = interaction.guild;

        // Get the member object to modify roles
        const member = await guild.members.fetch(targetUser.id).catch(() => null);

        const result = db.removeUser(guildId, targetUser.id);

        if (result.success) {
            // Remove the rank role if member exists and has it
            if (member && result.removedRoleId) {
                try {
                    const role = guild.roles.cache.get(result.removedRoleId);
                    if (role && member.roles.cache.has(role.id)) {
                        await member.roles.remove(role);
                    }
                } catch (roleError) {
                    console.error('Error removing role:', roleError);
                }
            }

            await interaction.reply({
                content: `[OK] ${result.message}`,
            });
        } else {
            await interaction.reply({
                content: `[ERROR] ${result.message}`,
                ephemeral: true
            });
        }
    }
};
