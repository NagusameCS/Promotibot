const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addrank')
        .setDescription('Add a new rank to the hierarchy (must be an existing Discord role)')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The Discord role to use as a rank')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('position')
                .setDescription('Position in hierarchy (1 = lowest). Leave empty to add at the top.')
                .setRequired(false)
                .setMinValue(1))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const role = interaction.options.getRole('role');
        const position = interaction.options.getInteger('position');
        const guildId = interaction.guildId;
        const guild = interaction.guild;

        // Check bot can manage this role
        const botMember = guild.members.me;
        if (role.position >= botMember.roles.highest.position) {
            return await interaction.reply({
                content: `[ERROR] The bot cannot manage the role "${role.name}" (it is higher than the bot's role). Move the bot's role above this role in Server Settings > Roles.`,
                ephemeral: true
            });
        }

        // Calculate actual position (0-indexed)
        let insertPosition = null;
        if (position !== null) {
            insertPosition = position - 1; // Convert to 0-indexed
        }

        const result = db.addRank(guildId, role.name, role.id, insertPosition);

        if (result.success) {
            const updatedRanks = db.getGuildRanks(guildId);
            const rankList = updatedRanks.map((r, i) => `${i + 1}. ${r.name}`).join('\n');

            await interaction.reply({
                content: `[OK] ${result.message}\n\n**Updated Ranks:**\n${rankList}`,
            });
        } else {
            await interaction.reply({
                content: `[ERROR] ${result.message}`,
                ephemeral: true
            });
        }
    }
};
