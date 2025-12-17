const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
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
            const errorEmbed = new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle(' Invalid Input')
                .setDescription('Please provide at least **2 roles** separated by commas.')
                .addFields({
                    name: 'Example',
                    value: '```\n/setranks Recruit, Member, Veteran, Elite\n```'
                });
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Check for duplicates
        const uniqueRoles = [...new Set(roleNames.map(r => r.toLowerCase()))];
        if (uniqueRoles.length !== roleNames.length) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle(' Duplicate Roles')
                .setDescription('Each role must be unique in the hierarchy.');
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
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
            const errorEmbed = new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle(' Roles Not Found')
                .setDescription('The following roles don\'t exist in this server:')
                .addFields(
                    { name: 'Missing Roles', value: notFound.map(r => `\`${r}\``).join(', ') },
                    { name: 'Tip', value: 'Role names are case-insensitive but must match exactly.' }
                );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Check bot can manage these roles
        const botMember = guild.members.me;
        const unmanageable = rankData.filter(r => {
            const role = guild.roles.cache.get(r.roleId);
            return role && role.position >= botMember.roles.highest.position;
        });

        if (unmanageable.length > 0) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle(' Permission Error')
                .setDescription('The bot cannot manage these roles (they\'re higher than the bot\'s role):')
                .addFields(
                    { name: 'Unmanageable', value: unmanageable.map(r => `<@&${r.roleId}>`).join(', ') },
                    { name: 'Fix', value: 'Go to **Server Settings  Roles** and drag the bot\'s role above these roles.' }
                );
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        db.setGuildRanks(guildId, rankData);

        // Create visual hierarchy
        const hierarchyViz = rankData.map((r, i) => {
            const tier = i + 1;
            const icon = i === rankData.length - 1 ? '' : i === 0 ? '' : '';
            return `${icon} **Tier ${tier}** <@&${r.roleId}>`;
        }).reverse().join('\n');

        const successEmbed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle(' Rank Hierarchy Configured!')
            .setDescription('Roles will be automatically assigned when promoting/demoting members.\n\u200B')
            .addFields(
                {
                    name: ' Hierarchy (Top to Bottom)',
                    value: hierarchyViz,
                    inline: false
                },
                {
                    name: '\u200B',
                    value: '\u200B',
                    inline: false
                },
                {
                    name: ' What\'s Next?',
                    value: [
                        '` /promote @user ` Promote a member',
                        '` /rank @user ` Check someone\'s progress',
                        '` /leaderboard ` See top members'
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({ 
                text: `${rankData.length} ranks configured`,
                iconURL: guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [successEmbed] });
    }
};
