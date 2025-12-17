const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setranks')
        .setDescription('Set up the rank hierarchy using existing server roles (lowest to highest)')
        .addStringOption(option =>
            option.setName('roles')
                .setDescription('Comma-separated role names from lowest to highest (must match existing roles exactly)')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const rolesInput = interaction.options.getString('roles');
        const guildId = interaction.guildId;
        const guild = interaction.guild;

        // Parse role names from comma-separated string
        const roleNames = rolesInput.split(',').map(r => r.trim()).filter(r => r.length > 0);

        if (roleNames.length < 2) {
            return await interaction.reply({
                content: '[ERROR] Please provide at least 2 roles separated by commas!',
                ephemeral: true
            });
        }

        // Check for duplicates
        const uniqueRoles = [...new Set(roleNames.map(r => r.toLowerCase()))];
        if (uniqueRoles.length !== roleNames.length) {
            return await interaction.reply({
                content: '[ERROR] Duplicate roles detected! Each role must be unique.',
                ephemeral: true
            });
        }

        // Verify all roles exist in the server
        const rankData = [];
        const notFound = [];
        
        for (const roleName of roleNames) {
            const role = guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
            if (role) {
                rankData.push({
                    name: role.name,
                    roleId: role.id
                });
            } else {
                notFound.push(roleName);
            }
        }

        if (notFound.length > 0) {
            return await interaction.reply({
                content: `[ERROR] The following roles were not found in this server:\n${notFound.join(', ')}\n\nMake sure the role names match exactly (case-insensitive).`,
                ephemeral: true
            });
        }

        // Check bot can manage these roles
        const botMember = guild.members.me;
        const unmanageable = rankData.filter(r => {
            const role = guild.roles.cache.get(r.roleId);
            return role && role.position >= botMember.roles.highest.position;
        });

        if (unmanageable.length > 0) {
            return await interaction.reply({
                content: `[ERROR] The bot cannot manage these roles (they are higher than the bot's role):\n${unmanageable.map(r => r.name).join(', ')}\n\nMove the bot's role above these roles in Server Settings > Roles.`,
                ephemeral: true
            });
        }

        db.setGuildRanks(guildId, rankData);

        const rankList = rankData.map((r, i) => `${i + 1}. ${r.name}`).join('\n');

        await interaction.reply({
            content: `[OK] **Rank hierarchy has been set!**\n\n**Ranks (lowest to highest):**\n${rankList}\n\nThese Discord roles will be assigned/removed when promoting/demoting users.`,
        });
    }
};
