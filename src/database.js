const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const ranksFile = path.join(dataDir, 'ranks.json');
const usersFile = path.join(dataDir, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize files if they don't exist
function initializeFiles() {
    if (!fs.existsSync(ranksFile)) {
        fs.writeFileSync(ranksFile, JSON.stringify({}, null, 2));
    }
    if (!fs.existsSync(usersFile)) {
        fs.writeFileSync(usersFile, JSON.stringify({}, null, 2));
    }
}

initializeFiles();

// Load data from file
function loadData(file) {
    try {
        const data = fs.readFileSync(file, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error loading ${file}:`, error);
        return {};
    }
}

// Save data to file
function saveData(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error saving ${file}:`, error);
        return false;
    }
}

// ==================== RANKS MANAGEMENT ====================
// Ranks are now stored as arrays of objects: [{ name: "Rookie", roleId: "123..." }, ...]

// Get all ranks for a guild
function getGuildRanks(guildId) {
    const ranks = loadData(ranksFile);
    return ranks[guildId] || [];
}

// Get rank names only (for display)
function getGuildRankNames(guildId) {
    const ranks = getGuildRanks(guildId);
    return ranks.map(r => r.name);
}

// Find rank by name
function findRankByName(guildId, rankName) {
    const ranks = getGuildRanks(guildId);
    return ranks.find(r => r.name.toLowerCase() === rankName.toLowerCase());
}

// Find rank index by name
function findRankIndexByName(guildId, rankName) {
    const ranks = getGuildRanks(guildId);
    return ranks.findIndex(r => r.name.toLowerCase() === rankName.toLowerCase());
}

// Set ranks for a guild (array of rank objects with name and roleId)
function setGuildRanks(guildId, rankList) {
    const ranks = loadData(ranksFile);
    ranks[guildId] = rankList;
    return saveData(ranksFile, ranks);
}

// Add a rank to a guild
function addRank(guildId, rankName, roleId, position = null) {
    const ranks = loadData(ranksFile);
    if (!ranks[guildId]) {
        ranks[guildId] = [];
    }

    // Check if rank already exists
    if (ranks[guildId].some(r => r.name.toLowerCase() === rankName.toLowerCase())) {
        return { success: false, message: 'Rank already exists!' };
    }

    const newRank = { name: rankName, roleId: roleId };

    if (position !== null && position >= 0 && position <= ranks[guildId].length) {
        ranks[guildId].splice(position, 0, newRank);
    } else {
        ranks[guildId].push(newRank);
    }

    saveData(ranksFile, ranks);
    return { success: true, message: `Rank "${rankName}" added successfully!` };
}

// Remove a rank from a guild
function removeRank(guildId, rankName) {
    const ranks = loadData(ranksFile);
    if (!ranks[guildId]) {
        return { success: false, message: 'No ranks configured for this server!' };
    }

    const index = ranks[guildId].findIndex(r => r.name.toLowerCase() === rankName.toLowerCase());
    if (index === -1) {
        return { success: false, message: 'Rank not found!' };
    }

    ranks[guildId].splice(index, 1);
    saveData(ranksFile, ranks);
    return { success: true, message: `Rank "${rankName}" removed successfully!` };
}

// ==================== USER MANAGEMENT ====================

// Get user data
function getUser(guildId, userId) {
    const users = loadData(usersFile);
    if (!users[guildId]) {
        users[guildId] = {};
    }
    return users[guildId][userId] || null;
}

// Get all users for a guild
function getGuildUsers(guildId) {
    const users = loadData(usersFile);
    return users[guildId] || {};
}

// Set user rank
function setUserRank(guildId, userId, username, rankName) {
    const users = loadData(usersFile);
    if (!users[guildId]) {
        users[guildId] = {};
    }

    const now = new Date().toISOString();

    if (!users[guildId][userId]) {
        users[guildId][userId] = {
            username: username,
            rank: rankName,
            promotions: 0,
            demotions: 0,
            joinedAt: now,
            lastUpdated: now,
            history: []
        };
    } else {
        const oldRank = users[guildId][userId].rank;
        users[guildId][userId].rank = rankName;
        users[guildId][userId].username = username;
        users[guildId][userId].lastUpdated = now;
        users[guildId][userId].history.push({
            from: oldRank,
            to: rankName,
            date: now
        });
    }

    saveData(usersFile, users);
    return users[guildId][userId];
}

// Promote user to next rank
function promoteUser(guildId, userId, username) {
    const ranks = getGuildRanks(guildId);
    if (ranks.length === 0) {
        return { success: false, message: 'No ranks configured! Use `/setranks` first.' };
    }

    const users = loadData(usersFile);
    if (!users[guildId]) {
        users[guildId] = {};
    }

    const now = new Date().toISOString();
    let currentRankIndex = -1;

    if (users[guildId][userId]) {
        currentRankIndex = ranks.findIndex(r => r.name === users[guildId][userId].rank);
    }

    // If user has no rank or rank not found, assign first rank
    if (currentRankIndex === -1) {
        const newRank = ranks[0];
        users[guildId][userId] = {
            username: username,
            rank: newRank.name,
            promotions: 1,
            demotions: 0,
            joinedAt: now,
            lastUpdated: now,
            history: [{ from: null, to: newRank.name, date: now, type: 'promotion' }]
        };
        saveData(usersFile, users);
        return {
            success: true,
            message: `${username} has been assigned their first rank: **${newRank.name}**!`,
            oldRank: null,
            newRank: newRank.name,
            oldRoleId: null,
            newRoleId: newRank.roleId
        };
    }

    // Check if already at max rank
    if (currentRankIndex >= ranks.length - 1) {
        return {
            success: false,
            message: `${username} is already at the highest rank: **${ranks[currentRankIndex].name}**!`
        };
    }

    // Promote to next rank
    const oldRank = ranks[currentRankIndex];
    const newRank = ranks[currentRankIndex + 1];

    users[guildId][userId].rank = newRank.name;
    users[guildId][userId].username = username;
    users[guildId][userId].promotions += 1;
    users[guildId][userId].lastUpdated = now;
    users[guildId][userId].history.push({ from: oldRank.name, to: newRank.name, date: now, type: 'promotion' });

    saveData(usersFile, users);
    return {
        success: true,
        message: `[PROMOTED] ${username} has been promoted from **${oldRank.name}** to **${newRank.name}**!`,
        oldRank: oldRank.name,
        newRank: newRank.name,
        oldRoleId: oldRank.roleId,
        newRoleId: newRank.roleId
    };
}

// Demote user to previous rank
function demoteUser(guildId, userId, username) {
    const ranks = getGuildRanks(guildId);
    if (ranks.length === 0) {
        return { success: false, message: 'No ranks configured! Use `/setranks` first.' };
    }

    const users = loadData(usersFile);
    if (!users[guildId] || !users[guildId][userId]) {
        return { success: false, message: `${username} has no rank to demote from!` };
    }

    const currentRankIndex = ranks.findIndex(r => r.name === users[guildId][userId].rank);

    if (currentRankIndex === -1) {
        return { success: false, message: `${username}'s current rank is not in the rank list!` };
    }

    if (currentRankIndex === 0) {
        return {
            success: false,
            message: `${username} is already at the lowest rank: **${ranks[0].name}**!`
        };
    }

    const now = new Date().toISOString();
    const oldRank = ranks[currentRankIndex];
    const newRank = ranks[currentRankIndex - 1];

    users[guildId][userId].rank = newRank.name;
    users[guildId][userId].username = username;
    users[guildId][userId].demotions += 1;
    users[guildId][userId].lastUpdated = now;
    users[guildId][userId].history.push({ from: oldRank.name, to: newRank.name, date: now, type: 'demotion' });

    saveData(usersFile, users);
    return {
        success: true,
        message: `[DEMOTED] ${username} has been demoted from **${oldRank.name}** to **${newRank.name}**.`,
        oldRank: oldRank.name,
        newRank: newRank.name,
        oldRoleId: oldRank.roleId,
        newRoleId: newRank.roleId
    };
}

// Set user to specific rank
function setUserToRank(guildId, userId, username, rankName) {
    const ranks = getGuildRanks(guildId);
    if (ranks.length === 0) {
        return { success: false, message: 'No ranks configured! Use `/setranks` first.' };
    }

    const targetRank = ranks.find(r => r.name.toLowerCase() === rankName.toLowerCase());
    if (!targetRank) {
        return { success: false, message: `Rank "${rankName}" does not exist!` };
    }

    const users = loadData(usersFile);
    if (!users[guildId]) {
        users[guildId] = {};
    }

    const now = new Date().toISOString();
    const oldRankName = users[guildId][userId]?.rank || null;
    const oldRank = oldRankName ? ranks.find(r => r.name === oldRankName) : null;

    if (oldRankName === targetRank.name) {
        return { success: false, message: `${username} is already at rank **${targetRank.name}**!` };
    }

    if (!users[guildId][userId]) {
        users[guildId][userId] = {
            username: username,
            rank: targetRank.name,
            promotions: 0,
            demotions: 0,
            joinedAt: now,
            lastUpdated: now,
            history: [{ from: null, to: targetRank.name, date: now, type: 'set' }]
        };
    } else {
        users[guildId][userId].rank = targetRank.name;
        users[guildId][userId].username = username;
        users[guildId][userId].lastUpdated = now;
        users[guildId][userId].history.push({ from: oldRankName, to: targetRank.name, date: now, type: 'set' });
    }

    saveData(usersFile, users);
    return {
        success: true,
        message: `[OK] ${username}'s rank has been set to **${targetRank.name}**!`,
        oldRank: oldRankName,
        newRank: targetRank.name,
        oldRoleId: oldRank ? oldRank.roleId : null,
        newRoleId: targetRank.roleId
    };
}

// Remove user from ranking system
function removeUser(guildId, userId) {
    const users = loadData(usersFile);
    if (!users[guildId] || !users[guildId][userId]) {
        return { success: false, message: 'User not found in the ranking system!' };
    }

    const username = users[guildId][userId].username;
    const currentRank = users[guildId][userId].rank;
    const ranks = getGuildRanks(guildId);
    const rankData = ranks.find(r => r.name === currentRank);

    delete users[guildId][userId];
    saveData(usersFile, users);
    return {
        success: true,
        message: `${username} has been removed from the ranking system.`,
        removedRoleId: rankData ? rankData.roleId : null
    };
}

// Get leaderboard
function getLeaderboard(guildId, limit = 10) {
    const ranks = getGuildRanks(guildId);
    const users = getGuildUsers(guildId);

    if (ranks.length === 0) {
        return { success: false, message: 'No ranks configured!' };
    }

    const userList = Object.entries(users).map(([odiedUserId, data]) => ({
        odiedUserId,
        ...data,
        rankIndex: ranks.findIndex(r => r.name === data.rank)
    }));

    // Sort by rank (highest first), then by promotions
    userList.sort((a, b) => {
        if (b.rankIndex !== a.rankIndex) {
            return b.rankIndex - a.rankIndex;
        }
        return b.promotions - a.promotions;
    });

    return { success: true, users: userList.slice(0, limit), ranks: ranks.map(r => r.name) };
}

module.exports = {
    getGuildRanks,
    getGuildRankNames,
    findRankByName,
    findRankIndexByName,
    setGuildRanks,
    addRank,
    removeRank,
    getUser,
    getGuildUsers,
    setUserRank,
    promoteUser,
    demoteUser,
    setUserToRank,
    removeUser,
    getLeaderboard
};
