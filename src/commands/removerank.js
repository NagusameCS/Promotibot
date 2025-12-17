const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removerank')
        .setDescription('Remove a rank from the hierarchy')
        .addStringOption(option =>
            option.setName('rank')
                .setDescription('The rank to remove')
                .setRequired(true)
                .setAutocomplete(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

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
        const rankName = interaction.options.getString('rank');
        const guildId = interaction.guildId;

        const result = db.removeRank(guildId, rankName);

        if (result.success) {
            const updatedRanks = db.getGuildRanks(guildId);
            let response = `[OK] ${result.message}`;

            if (updatedRanks.length > 0) {
                const rankList = updatedRanks.map((r, i) => `${i + 1}. ${r.name}`).join('\n');
                response += `\n\n**Remaining Ranks:**\n${rankList}`;
            } else {
                response += '\n\n[WARNING] No ranks remaining! Use `/setranks` or `/addrank` to add new ranks.';
            }

            await interaction.reply({ content: response });
        } else {
            await interaction.reply({
                content: `[ERROR] ${result.message}`,
                ephemeral: true
            });
        }
    }
};
