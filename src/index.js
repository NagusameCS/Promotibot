require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const express = require('express');

// Create express app for health checks (keeps Render awake)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.json({ 
        status: 'online',
        bot: 'Promotibot',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.listen(PORT, () => {
    console.log(`[SERVER] Health check server running on port ${PORT}`);
});

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
    ]
});

// Load commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`[OK] Loaded command: ${command.data.name}`);
    } else {
        console.log(`[WARN] Command at ${filePath} is missing required "data" or "execute" property.`);
    }
}

// Handle slash commands
client.on(Events.InteractionCreate, async interaction => {
    // Handle autocomplete
    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);

        if (!command || !command.autocomplete) {
            return;
        }

        try {
            await command.autocomplete(interaction);
        } catch (error) {
            console.error(`Error handling autocomplete for ${interaction.commandName}:`, error);
        }
        return;
    }

    // Handle slash commands
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);

        const errorMessage = {
            content: '[ERROR] There was an error executing this command!',
            ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, readyClient => {
    console.log('----------------------------------------');
    console.log(`Promotibot is online!`);
    console.log(`Logged in as: ${readyClient.user.tag}`);
    console.log(`Serving ${readyClient.guilds.cache.size} server(s)`);
    console.log('----------------------------------------');
});

// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
