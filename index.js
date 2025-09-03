require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const wiegine = require('fca-mafiya');
const WebSocket = require('ws');
const { broadcast } = require('./utils/broadcast');
const { processNicknameChange } = require('./utils/nicknameUtils');
const { saveCookies, loadAbuseMessages, loadWelcomeMessages } = require('./utils/fileUtils');
const { botConfig } = require('./config/botConfig');
const { botState } = require('./config/botState');
const { MASTER_ID, MASTER_FB_LINK, LEARNED_RESPONSES_PATH } = require('./config/constants');
const { autoreplies } = require('./responses/autoreplies');
const { welcomeMessages } = require('./responses/welcome');
const { goodbyeMessages } = require('./responses/goodbye');
const { adminTagReplies } = require('./responses/adminTagReplies');
const { randomBotReplies } = require('./responses/randomBotReplies');
const { favoriteStickers } = require('./responses/favoriteStickers');

// Command imports with correct naming
const { handleHelp } = require('./commands/help');
const { handleMastercommand } = require('./commands/master/mastercommand');
const { handleStopall } = require('./commands/master/stopall');
const { handleStatus } = require('./commands/master/status');
const { handleKick } = require('./commands/master/kick');
const { handleList } = require('./commands/master/list');
const { handleMasterid } = require('./commands/master/masterid');
const { handleAddadmin } = require('./commands/master/addadmin');
const { handleRemoveadmin } = require('./commands/master/removeadmin');
const { handleListadmins } = require('./commands/master/listadmins');
const { handleGroupNameLock } = require('./commands/admin/groupnamelock');
const { handleNicknameLock } = require('./commands/admin/nicknamelock');
const { handleAntiout } = require('./commands/admin/antiout');
const { handleKickout } = require('./commands/admin/kickout');
const { handleUnsend } = require('./commands/admin/unsend');
const { handleStickerspam } = require('./commands/admin/stickerspam');
const { handleAutospam } = require('./commands/admin/autospam');
const { handleAutomessage } = require('./commands/admin/automessage');
const { handleLoder } = require('./commands/admin/loder');
const { handleTid } = require('./commands/user/tid');
const { handleUid } = require('./commands/user/uid');
const { handleGroupinfo } = require('./commands/user/groupinfo');
const { handleInfo } = require('./commands/user/info');
const { handlePair } = require('./commands/user/pair');
const { handleMusic } = require('./commands/user/music');
const { handleLearn } = require('./commands/user/learn');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'active',
        bot: 'शेलेन्द्र हिन्दू का गुलाम बोट राम इंडिया एफ',
        version: '10.0.0'
    });
});

// Load learned responses
let learnedResponses = { triggers: [], adminList: [MASTER_ID] };
try {
    if (fs.existsSync(LEARNED_RESPONSES_PATH)) {
        learnedResponses = JSON.parse(fs.readFileSync(LEARNED_RESPONSES_PATH, 'utf8'));
        botState.adminList = learnedResponses.adminList || [MASTER_ID];
    } else {
        fs.writeFileSync(LEARNED_RESPONSES_PATH, JSON.stringify({ triggers: [], adminList: [MASTER_ID] }, null, 2));
    }
} catch (err) {
    console.error('Error loading learned_responses.json:', err);
}

function stopBot(userId) {
    if (!botState.sessions[userId]) {
        broadcast({ type: 'log', message: `No active session for user ${userId}`, userId });
        return;
    }

    // Validate nicknameTimers
    if (botState.nicknameTimers && typeof botState.nicknameTimers === 'object') {
        Object.keys(botState.nicknameTimers).forEach(threadID => {
            if (botState.nicknameQueues[threadID]?.botUserId === userId) {
                console.log(`Clearing nickname timer for thread ${threadID} (user ${userId})`);
                clearTimeout(botState.nicknameTimers[threadID]);
                delete botState.nicknameTimers[threadID];
                delete botState.nicknameQueues[threadID];
            }
        });
    } else {
        console.log('nicknameTimers is not initialized, reinitializing');
        botState.nicknameTimers = {};
    }

    // Validate stickerSpam
    if (botState.stickerSpam && typeof botState.stickerSpam === 'object') {
        Object.keys(botState.stickerSpam).forEach(threadID => {
            if (botState.stickerSpam[threadID]) {
                console.log(`Stopping sticker spam for thread ${threadID} (user ${userId})`);
                botState.stickerSpam[threadID].active = false;
                delete botState.stickerSpam[threadID];
            }
        });
    } else {
        console.log('stickerSpam is not initialized, reinitializing');
        botState.stickerSpam = {};
    }

    if (botState.sessions[userId].api) {
        try {
            botState.sessions[userId].api.logout(() => {
                console.log(`API logged out for user ${userId}`);
            });
        } catch (err) {
            console.error(`Error during logout for user ${userId}:`, err);
        }
        botState.sessions[userId].api = null;
    }

    learnedResponses.triggers = [];
    fs.writeFileSync(LEARNED_RESPONSES_PATH, JSON.stringify({ triggers: [], adminList: botState.adminList }, null, 2));

    delete botState.sessions[userId];
    console.log(`Session stopped and cleaned for user ${userId}`);
    broadcast({ type: 'log', message: `Bot stopped for user ${userId}`, userId });
    broadcast({ type: 'status', userId, running: false });
}

function startBot(userId, cookieContent, prefix, adminId) {
    if (botState.sessions[userId]) {
        stopBot(userId);
    }

    botState.sessions[userId] = {
        running: true,
        prefix: prefix || '#',
        adminID: adminId || '',
        api: null
    };

    console.log(`Raw cookieContent for user ${userId}:`, cookieContent); // Debug log

    let parsedCookies = {};
    try {
        const cookies = JSON.parse(cookieContent);
        console.log(`Parsed cookies:`, cookies); // Debug log

        // Handle array of cookie objects (e.g., [{ key: "c_user", value: "..." }, ...])
        if (Array.isArray(cookies)) {
            cookies.forEach(cookie => {
                if (cookie.key && cookie.value && typeof cookie.key === 'string') {
                    parsedCookies[cookie.key] = cookie.value;
                }
            });
        } 
        // Handle direct JSON object (e.g., { c_user: "...", xs: "..." })
        else if (typeof cookies === 'object' && cookies !== null) {
            parsedCookies = cookies;
        } 
        // Invalid JSON format
        else {
            console.log(`Invalid JSON format for user ${userId}`);
            parsedCookies = {};
        }

        console.log(`Final parsedCookies:`, parsedCookies); // Debug log
    } catch (e) {
        console.log(`JSON parse failed for user ${userId}: ${e.message}`);
        // Fallback to semicolon-separated string (e.g., c_user=...;xs=...)
        parsedCookies = {};
        if (typeof cookieContent === 'string') {
            cookieContent.split(';').forEach(cookie => {
                const [key, value] = cookie.trim().split('=');
                if (key && value) parsedCookies[key] = value;
            });
        }
        console.log(`Fallback parsedCookies:`, parsedCookies); // Debug log
    }

    // Check for required cookies
    if (!parsedCookies.c_user || !parsedCookies.xs) {
        console.log(`Invalid cookies for user ${userId}:`, parsedCookies);
        broadcast({ type: 'log', message: `Invalid cookie format for user ${userId}: c_user or xs missing`, userId });
        botState.sessions[userId].running = false;
        return;
    }

    // Validate c_user matches userId
    if (parsedCookies.c_user !== userId) {
        console.log(`Cookie c_user (${parsedCookies.c_user}) does not match userId (${userId})`);
        broadcast({ type: 'log', message: `Cookie c_user (${parsedCookies.c_user}) does not match userId (${userId})`, userId });
        botState.sessions[userId].running = false;
        return;
    }

    // Save parsed cookies
    try {
        saveCookies(userId, JSON.stringify(parsedCookies));
        broadcast({ type: 'log', message: `Cookie file saved for user ${userId}`, userId });
    } catch (err) {
        console.error(`Failed to save cookie for user ${userId}:`, err);
        broadcast({ type: 'log', message: `Failed to save cookie for user ${userId}: ${err.message}`, userId });
        botState.sessions[userId].running = false;
        return;
    }

    // Proceed with login using wiegine
    wiegine.login(parsedCookies, {}, (err, api) => {
        if (err || !api) {
            console.error(`Login failed for user ${userId}:`, err);
            broadcast({ type: 'log', message: `Login failed for user ${userId}: ${err?.message || 'Unknown error'}`, userId });
            botState.sessions[userId].running = false;
            return;
        }

        botState.sessions[userId].api = api;
        broadcast({ type: 'log', message: `Bot logged in and running for user ${userId}`, userId });
        broadcast({ type: 'status', userId, running: true });

        api.setOptions({ listenEvents: true, autoMarkRead: true });

        api.on('error', (err) => {
            console.error('API error:', err);
            broadcast({ type: 'log', message: `API error for user ${userId}: ${err.message}`, userId });
            setTimeout(() => {
                startBot(userId, JSON.stringify(parsedCookies), prefix, adminId);
            }, 5000);
        });

        let abuseMessages = loadAbuseMessages();
        botState.welcomeMessages = loadWelcomeMessages();

        api.listenMqtt(async (err, event) => {
            if (err) {
                console.error('MQTT listen error:', err);
                broadcast({ type: 'log', message: `MQTT listen error for user ${userId}: ${err.message}`, userId });
                setTimeout(() => {
                    startBot(userId, JSON.stringify(parsedCookies), prefix, adminId);
                }, 5000);
                return;
            }

            try {
                console.log('Event:', { type: event.type, body: event.body, threadID: event.threadID, senderID: event.senderID });
                if (event.type !== 'message' || !event.body) {
                    console.log('Skipping non-message event or empty body');
                    return;
                }

                const isMaster = event.senderID === MASTER_ID;
                const isAdmin = botState.adminList.includes(event.senderID) || isMaster;
                const isGroup = event.threadID !== event.senderID;
                const botID = api.getCurrentUserID();
                const threadID = event.threadID;
                const messageID = event.messageID;

                if (isMaster && event.type === 'message') {
                    api.setMessageReaction('😍', messageID, (err) => {
                        if (err) console.error('Error setting love reaction:', err);
                    });
                }

                if (botConfig.autoSpamAccept && event.type === 'message_request') {
                    api.handleMessageRequest(event.threadID, true, (err) => {
                        if (!err) {
                            api.sendMessage("🚀 Auto-accepted your message request!", event.threadID);
                        }
                    });
                }

                const msg = event.body.toLowerCase().trim();
                console.log('Message:', msg);
                const prefix = botState.sessions[userId]?.prefix || '#';
                console.log('Prefix:', prefix);

                if (msg.startsWith(prefix)) {
                    const args = msg.split(' ');
                    const command = args[0].slice(prefix.length).toLowerCase();
                    console.log('Command:', command);

                    if (command === 'help') {
                        console.log('Calling help command');
                        return handleHelp(api, threadID, prefix);
                    }
                    if (isMaster) {
                        if (command === 'mastercommand') return handleMastercommand(api, event);
                        if (command === 'stopall') return handleStopall(api, event, botState, stopBot);
                        if (command === 'status') return handleStatus(api, event, botState);
                        if (command === 'kick') return handleKick(api, event, botState, stopBot);
                        if (command === 'list') return handleList(api, event, botState);
                        if (command === 'masterid') return handleMasterid(api, event);
                        if (command === 'addadmin') return handleAddadmin(api, event, botState, LEARNED_RESPONSES_PATH);
                        if (command === 'removeadmin') return handleRemoveadmin(api, event, botState, LEARNED_RESPONSES_PATH);
                        if (command === 'listadmins') return handleListadmins(api, event, botState);
                    }
                    if (command === 'learn') return handleLearn(api, event, botState, LEARNED_RESPONSES_PATH);
                    if (isAdmin) {
                        if (command === 'groupnamelock') return handleGroupNameLock(api, event, botState);
                        if (command === 'nicknamelock') return handleNicknameLock(api, event, botState);
                        if (command === 'antiout') return handleAntiout(api, event, botConfig);
                        if (command === 'kickout') return handleKickout(api, event);
                        if (command === 'unsend') return handleUnsend(api, event);
                        if (command === 'send' && args[1] === 'sticker') return handleStickerspam(api, event, botState, favoriteStickers);
                        if (command === 'autospam') return handleAutospam(api, event, botConfig, botState);
                        if (command === 'automessage') return handleAutomessage(api, event, botConfig, botState);
                        if (command === 'loder') return handleLoder(api, event, botState, abuseMessages);
                    }
                    if (command === 'tid') return handleTid(api, event);
                    if (command === 'uid') return handleUid(api, event);
                    if (command === 'group' && args[1] === 'info') return handleGroupinfo(api, event, botState);
                    if (command === 'info') return handleInfo(api, event);
                    if (command === 'pair') return handlePair(api, event);
                    if (command === 'music') return handleMusic(api, threadID, args);
                    api.sendMessage(`❌ Invalid command. Use ${prefix}help for list.`, threadID);
                    return;
                }

                let responseSent = false;
                for (const { trigger, response } of learnedResponses.triggers) {
                    if (msg.includes(trigger.toLowerCase().trim())) {
                        api.sendMessage(response, threadID, messageID);
                        responseSent = true;
                    }
                }
                if (responseSent) return;

                for (let key in autoreplies) {
                    if (msg.includes(key.toLowerCase())) {
                        api.sendMessage(autoreplies[key], threadID, messageID);
                        return;
                    }
                }

                const badWords = ['randi', 'chutia', 'gandu', 'kinnar', 'saali', 'lodi', 'lavdi', 'chinal', 'chinaal', 'gandwa', 'gandva', 'jhatu'];
                const isBadWithShalender = (msg.includes('@shalender') || msg.includes('shalender')) && badWords.some(word => msg.includes(word));

                if (isBadWithShalender) {
                    const abuserID = event.senderID;
                    if (abuserID === MASTER_ID) return;
                    if (!botState.abuseTargets[threadID]) {
                        botState.abuseTargets[threadID] = {};
                    }
                    if (!botState.abuseTargets[threadID][abuserID] && abuseMessages.length > 0) {
                        botState.abuseTargets[threadID][abuserID] = true;
                        api.getUserInfo(abuserID, (err, ret) => {
                            if (err || !ret) {
                                console.error('UserInfo error for auto-target:', err);
                                return;
                            }
                            const name = ret[abuserID]?.name || 'User';
                            api.sendMessage(`😡 ${name} तूने मालिक शेलेन्द्र को गाली दी? अब हर 2 मिनट में गालियां आएंगी!`, threadID);
                            const spamLoop = async () => {
                                while (botState.abuseTargets[threadID]?.[abuserID] && abuseMessages.length > 0) {
                                    try {
                                        const randomMsg = abuseMessages[Math.floor(Math.random() * abuseMessages.length)];
                                        const mentionTag = `@${name.split(' ')[0]}`;
                                        await api.sendMessage({
                                            body: `${mentionTag} ${randomMsg}`,
                                            mentions: [{ tag: mentionTag, id: abuserID }]
                                        }, threadID);
                                        console.log(`Auto-target abuse sent to ${name} (${abuserID}) in thread ${threadID}`);
                                        await new Promise(r => setTimeout(r, 120000));
                                    } catch (err) {
                                        console.error('Auto-target abuse loop error:', err);
                                        api.sendMessage('⚠️ Error sending auto-target abuse. Retrying in 2 minutes...', threadID);
                                        await new Promise(r => setTimeout(r, 120000));
                                    }
                                }
                            };
                            spamLoop();
                        });
                    }
                    return;
                }

                if (event.mentions && Object.keys(event.mentions).includes(botState.sessions[userId].adminID)) {
                    const reply = adminTagReplies[Math.floor(Math.random() * adminTagReplies.length)];
                    const stickerID = favoriteStickers[Math.floor(Math.random() * favoriteStickers.length)];
                    api.sendMessage(reply, threadID, messageID);
                    api.sendMessage({ sticker: stickerID }, threadID);
                }

                if (msg === 'autoconvo on' && isAdmin) {
                    botState.autoConvo = true;
                    api.sendMessage('🔥 ऑटो कॉन्वो सिस्टम चालू हो गया है! अब कोई भी गाली देगा तो उसकी खैर नहीं!', threadID);
                    broadcast({
                        type: 'settings',
                        autoSpamAccept: botConfig.autoSpamAccept,
                        autoMessageAccept: botConfig.autoMessageAccept,
                        autoConvo: botState.autoConvo,
                        userId
                    });
                    return;
                }
                if (msg === 'autoconvo off' && isAdmin) {
                    botState.autoConvo = false;
                    api.sendMessage('✅ ऑटो कॉन्वो सिस्टम बंद हो गया है!', threadID);
                    broadcast({
                        type: 'settings',
                        autoSpamAccept: botConfig.autoSpamAccept,
                        autoMessageAccept: botConfig.autoMessageAccept,
                        autoConvo: botState.autoConvo,
                        userId
                    });
                    return;
                }

                const triggerWords = ['bc', 'mc', 'bkl', 'bhenchod', 'madarchod', 'lund', 'gandu', 'chutiya', 'randi', 'motherchod', 'fuck', 'bhosda', 'kinnar', 'saali', 'lodi', 'lavdi', 'chinal', 'chinaal', 'gandwa', 'gandva', 'jhatu'];
                const isAbusive = triggerWords.some(word => msg.includes(word));
                const isMentioningBot = msg.includes('bot') || event.mentions?.[botID];

                if ((isAbusive && isMentioningBot) || (isAbusive && botState.autoConvo)) {
                    const abuserID = event.senderID;
                    if (abuserID === MASTER_ID) return;
                    if (!botState.abuseTargets[threadID]) {
                        botState.abuseTargets[threadID] = {};
                    }

                    if (!botState.abuseTargets[threadID][abuserID] && abuseMessages.length > 0) {
                        botState.abuseTargets[threadID][abuserID] = true;
                        api.getUserInfo(abuserID, (err, ret) => {
                            if (err || !ret) {
                                console.error('UserInfo error for auto-convo:', err);
                                return;
                            }
                            const name = ret[abuserID]?.name || 'User';
                            api.sendMessage(`😡 ${name} तूने मुझे गाली दी? अब हर 2 मिनट में गालियां आएंगी!`, threadID);
                            const spamLoop = async () => {
                                while (botState.abuseTargets[threadID]?.[abuserID] && abuseMessages.length > 0) {
                                    try {
                                        const randomMsg = abuseMessages[Math.floor(Math.random() * abuseMessages.length)];
                                        const mentionTag = `@${name.split(' ')[0]}`;
                                        await api.sendMessage({
                                            body: `${mentionTag} ${randomMsg}`,
                                            mentions: [{ tag: mentionTag, id: abuserID }]
                                        }, threadID);
                                        console.log(`Auto-convo abuse sent to ${name} (${abuserID}) in thread ${threadID}`);
                                        await new Promise(r => setTimeout(r, 120000));
                                    } catch (err) {
                                        console.error('Auto-convo abuse loop error:', err);
                                        api.sendMessage('⚠️ Error sending auto-convo abuse. Retrying in 2 minutes...', threadID);
                                        await new Promise(r => setTimeout(r, 120000));
                                    }
                                }
                            };
                            spamLoop();
                        });
                    }
                    return;
                }

                if (botState.abuseTargets?.[threadID]?.[event.senderID]) {
                    if (msg.includes('sorry babu') || msg.includes('sorry mikky')) {
                        delete botState.abuseTargets[threadID][event.senderID];
                        api.sendMessage('😏 ठीक है बेटा! अब तुझे नहीं गाली देंगे. बच गया तू... अगली बार संभल के!', threadID);
                        return;
                    }
                }

                if (msg.includes('bot') && isGroup) {
                    if (Math.random() < 0.8) {
                        setTimeout(() => {
                            api.sendMessage(randomBotReplies[Math.floor(Math.random() * randomBotReplies.length)], threadID);
                        }, 5000);
                    }
                }
            } catch (e) {
                console.error('Event processing error:', e);
                broadcast({ type: 'log', message: `Event error for user ${userId}: ${e.message}`, userId });
            }

            if (event.logMessageType === 'log:subscribe') {
                const addedIDs = event.logMessageData.addedParticipants?.map(p => p.userFbId) || [];
                addedIDs.forEach(id => {
                    if (id === botID) {
                        api.sendMessage(`🍒💙•••Ɓ❍ʈ Ƈøɳɳɛƈʈɛɗ•••💞🌿

🕊️🌸...Ɦɛɭɭ❍ Ɠɣus Ɱɣ ɴαɱɛ ιʂ ʂɧαʟɛɳɗɛɽ ɧιɳɗu Ɱαʂʈɛɽ'ʂ Ɓ❍ʈ...🌸🕊️

🎉...Ƭɧɛ Ɓɛʂʈ Ƒɛαʈuɽɛʂ Ɠɽøuρ ɱαɳαɠɛɱɛɳʈ...🎉
🔐...Ɠɽøuρ ɴαɱɛ ʟøcк...🔐
🔐...Ɲιcкɴαɱɛ ʟøcк...🔐
🎯...Ƭαɽɠɛʈ ƛɓuʂɛ...🎯
🎵...Ƴøuʈuɓɛ ɱuʂιc...🎵
💑...Ƥαιɽ ɱɛɱɓɛɽʂ...💑
😈...ƛuʈø cøɳʋø...😈
📢...ƛɳʈιøuʈ...📢
✨...ƛuʈø ʂραɱ...✨
✨...ƛuʈø ɱɛʂʂαɠɛ...✨
🔥...Ƨʈιcкɛɽ ʂραɱ...🔥
🔥...Ƙιcкøuʈ...🔥
🔥...Ʋɳʂɛɳɗ...🔥
🛠️...use #help for commands...🛠️
━━━━━━━━━━━━━━━━━━━━
👑 𝗖𝗿𝗲𝗮𝘁𝗲𝗱 𝗕𝘆: ✶♡⤾➝SHALENDER X..⤹✶➺🪿🫨🩷🪽`, threadID);
                    } else {
                        api.getUserInfo(id, (err, ret) => {
                            if (err || !ret?.[id]) return;
                            const name = ret[id].name || 'User';
                            const welcomeMsg = botState.welcomeMessages[Math.floor(Math.random() * botState.welcomeMessages.length)]
                                .replace('{name}', name);
                            api.sendMessage({
                                body: welcomeMsg,
                                mentions: [{ tag: name, id }]
                            }, threadID);
                        });
                    }
                });
            }

            if (event.logMessageType === 'log:unsubscribe') {
                const leftID = event.logMessageData.leftParticipantFbId;
                if (leftID === botID) {
                    stopBot(userId);
                    return;
                }

                api.getThreadInfo(threadID, (err, info) => {
                    if (err || !info) return;
                    const isAdminAction = info.adminIDs?.some(admin => admin.id === event.author);
                    const messagePool = isAdminAction ? goodbyeMessages.admin : goodbyeMessages.member;
                    api.getUserInfo(leftID, (err, ret) => {
                        if (err || !ret?.[leftID]) return;
                        const name = ret[leftID].name || 'User';
                        const goodbyeMsg = messagePool[Math.floor(Math.random() * messagePool.length)]
                            .replace('{name}', name);
                        api.sendMessage({
                            body: goodbyeMsg,
                            mentions: [{ tag: name, id: leftID }]
                        }, threadID);
                    });

                    if (botConfig.antiOut && !isAdminAction && leftID !== botID) {
                        api.addUserToGroup(leftID, threadID, (err) => {
                            if (err) {
                                console.error('Anti-out error:', err);
                                api.sendMessage('⚠️ Failed to re-add user (anti-out).', threadID);
                            } else {
                                api.getUserInfo(leftID, (err, ret) => {
                                    if (err || !ret) return;
                                    const name = ret[leftID]?.name || 'User';
                                    api.sendMessage({
                                        body: `😈 ${name} भागने की कोशिश कर रहा था, लेकिन मैंने उसे वापस खींच लिया! 😈`,
                                        mentions: [{ tag: name, id: leftID }]
                                    }, threadID);
                                });
                            }
                        });
                    }
                });
            }

            if (event.logMessageType === 'log:thread-name' && botState.lockedGroups[threadID]) {
                const lockedName = botState.lockedGroups[threadID];
                api.setTitle(lockedName, threadID, (err) => {
                    if (err) {
                        api.sendMessage('⚠️ Failed to restore group name.', threadID);
                        console.error('Group name lock error:', err);
                    } else {
                        api.sendMessage(`🔒 Group name restored to: ${lockedName}`, threadID);
                    }
                });
            }
        });
    });
}

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const wss = new WebSocket.Server({ server });
global.wss = wss;

// Ping for persistent connection
setInterval(() => {
    wss.clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
        }
    });
}, 600000); // Every 10 minutes

wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    ws.send(JSON.stringify({
        type: 'settings',
        autoSpamAccept: botConfig.autoSpamAccept,
        autoMessageAccept: botConfig.autoMessageAccept,
        autoConvo: botState.autoConvo
    }));

    ws.send(JSON.stringify({ type: 'activeUsers', users: Object.keys(botState.sessions) }));

    ws.on('message', (message) => {
        try {
            // Validate message
            if (!message || typeof message !== 'string' || message.trim() === '') {
                console.warn('Received invalid WebSocket message:', message);
                ws.send(JSON.stringify({ type: 'log', message: 'Invalid or empty WebSocket message received' }));
                return;
            }

            let data;
            try {
                data = JSON.parse(message);
            } catch (err) {
                console.warn('Failed to parse WebSocket message:', err.message);
                ws.send(JSON.stringify({ type: 'log', message: `Failed to parse WebSocket message: ${err.message}` }));
                return;
            }

            if (!data.type) {
                ws.send(JSON.stringify({ type: 'log', message: 'Message type missing' }));
                return;
            }

            if (data.type === 'start') {
                if (!data.userId || !data.cookieContent) {
                    ws.send(JSON.stringify({ type: 'log', message: 'User ID or cookie content missing' }));
                    return;
                }
                startBot(data.userId, data.cookieContent, data.prefix, data.adminId);
            } else if (data.type === 'stop') {
                if (data.userId && botState.sessions[data.userId]) {
                    stopBot(data.userId);
                    ws.send(JSON.stringify({ type: 'log', message: `Bot stopped for user ${data.userId}`, userId: data.userId }));
                    ws.send(JSON.stringify({ type: 'status', userId: data.userId, running: false }));
                } else {
                    ws.send(JSON.stringify({ type: 'log', message: `No active session for user ${data.userId}`, userId: data.userId }));
                }
            } else if (data.type === 'checkStatus' || data.type === 'getStatus') {
                const userId = data.userId || 'default';
                const running = !!botState.sessions[userId];
                ws.send(JSON.stringify({ type: 'status', userId, running }));
            } else if (data.type === 'uploadAbuse') {
                if (!data.content || data.content.trim() === '') {
                    ws.send(JSON.stringify({ type: 'log', message: 'Abuse file content empty' }));
                    return;
                }
                try {
                    fs.writeFileSync(path.join(__dirname, 'abuse.txt'), data.content);
                    broadcast({ type: 'log', message: 'Abuse messages updated successfully' });
                } catch (err) {
                    ws.send(JSON.stringify({ type: 'log', message: `Failed to update abuse messages: ${err.message}` }));
                }
            } else if (data.type === 'saveWelcome') {
                if (!data.content || data.content.trim() === '') {
                    ws.send(JSON.stringify({ type: 'log', message: 'Welcome messages content empty' }));
                    return;
                }
                try {
                    fs.writeFileSync(path.join(__dirname, 'welcome.txt'), data.content);
                    botState.welcomeMessages = loadWelcomeMessages();
                    broadcast({ type: 'log', message: 'Welcome messages updated successfully' });
                } catch (err) {
                    ws.send(JSON.stringify({ type: 'log', message: `Failed to update welcome messages: ${err.message}` }));
                }
            } else if (data.type === 'saveSettings') {
                botConfig.autoSpamAccept = data.autoSpamAccept;
                botConfig.autoMessageAccept = data.autoMessageAccept;
                botState.autoConvo = data.autoConvo;
                ws.send(JSON.stringify({ type: 'log', message: 'Settings saved successfully' }));
                broadcast({
                    type: 'settings',
                    autoSpamAccept: botConfig.autoSpamAccept,
                    autoMessageAccept: botConfig.autoMessageAccept,
                    autoConvo: botState.autoConvo,
                    userId: data.userId || 'default'
                });
            } else if (data.type === 'pong') {
                console.log('Received pong from client');
            }
        } catch (err) {
            console.error('WebSocket message processing error:', err);
            ws.send(JSON.stringify({ type: 'log', message: `Error processing WebSocket message: ${err.message}` }));
        }
    });

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });
});
