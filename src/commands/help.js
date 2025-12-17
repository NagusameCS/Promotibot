const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('View all Promotibot commands'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setAuthor({
                name: 'Promotibot',
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTitle(' Command Reference')
            .setDescription('Manage member ranks and promotions with ease!\n\u200B')
            .addFields(
                {
                    name: ' User Commands',
                    value: [
                        '` /rank `  View your rank profile',
                        '` /rank @user `  View someone else\'s profile',
                        '` /ranks `  See the rank hierarchy',
                        '` /leaderboard `  View top ranked members',
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '\u200B',
                    value: '\u200B',
                    inline: false
                },
                {
                    name: ' Moderator Commands',
                    value: [
                        '` /promote @user `  Promote to next rank',
                        '` /demote @user `  Demote to previous rank',
                        '` /setrank @user <rank> `  Set specific rank',
                        '` /resetuser @user `  Remove from ranking',
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '\u200B',
                    value: '\u200B',
                    inline: false
                },
                {
                    name: ' Admin Commands',
                    value: [
                        '` /setranks <roles> `  Set up rank hierarchy',
                        '` /addrank @role `  Add a role as a rank',
                        '` /removerank <rank> `  Remove a rank',
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '\u200B',
                    value: '\u200B',
                    inline: false
                },
                {
                    name: ' Quick Start Guide',
                    value: [
                        '**1.** Create Discord roles for your ranks',
                        '**2.** Run `/setranks` with role names (lowest to highest)',
                        '**3.** Use `/promote` to start ranking members!',
                        '',
                        '*Example:* `/setranks Recruit, Member, Veteran, Elite`'
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({ 
                text: 'Promotibot • Roles are automatically assigned on promotion',
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTimestamp();

        // Add helpful buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_ranks')
                    .setLabel('View Ranks')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(''),
                new ButtonBuilder()
                    .setCustomId('help_leaderboard')
                    .setLabel('Leaderboard')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(''),
                new ButtonBuilder()
                    .setURL('https://github.com/NagusameCS/Promotibot')
                    .setLabel('GitHub')
                    .setStyle(ButtonStyle.Link)
            );

        const response = await interaction.reply({ 
            embeds: [embed], 
            components: [row],
            fetchReply: true 
        });

        // Handle button interactions
        const collector = response.createMessageComponentCollector({ 
            time: 60000 
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ 
                    content: 'These buttons are for the person who used the command.',
                    ephemeral: true 
                });
            }

            if (i.customId === 'help_ranks') {
                await i.deferUpdate();
                await interaction.followUp({ 
                    content: 'Use `/ranks` to see the rank hierarchy!',
                    ephemeral: true 
                });
            } else if (i.customId === 'help_leaderboard') {
                await i.deferUpdate();
                await interaction.followUp({ 
                    content: 'Use `/leaderboard` to see top members!',
                    ephemeral: true 
                });
            }
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('help_ranks')
                        .setLabel('View Ranks')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('')
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('help_leaderboard')
                        .setLabel('Leaderboard')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('')
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setURL('https://github.com/NagusameCS/Promotibot')
                        .setLabel('GitHub')
                        .setStyle(ButtonStyle.Link)
                );
            interaction.editReply({ components: [disabledRow] }).catch(() => {});
        });
    }
};
