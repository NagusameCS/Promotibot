const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('View all Promotibot commands'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('Promotibot - Help')
            .setDescription('Promotibot helps you manage member ranks and promotions in your server!')
            .addFields(
                {
                    name: '**General Commands**',
                    value: [
                        '`/rank [user]` - View rank stats for yourself or another user',
                        '`/ranks` - View all configured ranks',
                        '`/leaderboard [limit]` - View the rank leaderboard',
                        '`/help` - Show this help message',
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '**Promotion Commands** (Manage Roles permission)',
                    value: [
                        '`/promote <user>` - Promote a user to the next rank',
                        '`/demote <user>` - Demote a user to the previous rank',
                        '`/setrank <user> <rank>` - Set a user to a specific rank',
                        '`/resetuser <user>` - Remove a user from the ranking system',
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '**Admin Commands** (Administrator permission)',
                    value: [
                        '`/setranks <roles>` - Set up rank hierarchy using Discord roles',
                        '`/addrank <role> [position]` - Add a Discord role as a rank',
                        '`/removerank <rank>` - Remove a rank from the hierarchy',
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '**Getting Started**',
                    value: [
                        '1. Create Discord roles for your ranks (e.g., Rookie, Member, Elite)',
                        '2. Use `/setranks` with those role names (lowest to highest)',
                        '   Example: `/setranks Rookie, Member, Veteran, Elite`',
                        '3. Use `/promote` to rank up members (roles auto-assigned)',
                        '4. Check progress with `/rank` and `/leaderboard`',
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({ text: 'Promotibot • Making promotions easy!' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
