require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const WebSocket = require('ws');
const axios = require('axios');
const play = require('play-dl');
const search = require('yt-search');
const timeout = require('connect-timeout');
const { processNicknameChange } = require('./utils/nicknameUtils');
const { getAIResponse } = require('./utils/aichat');

process.stdout.setEncoding('utf8');
process.stderr.setEncoding('utf8');

let gTTS;
try {
  gTTS = require('gtts');
  console.log('gTTS module loaded successfully');
} catch (err) {
  console.error('Error loading gTTS module:', err.message);
  process.exit(1);
}

let wiegine;
try {
  wiegine = require('fca-mafiya');
  console.log('fca-mafiya module loaded successfully');
} catch (err) {
  console.error('Error loading fca-mafiya module:', err.message);
  process.exit(1);
}

const botConfig = require('./config/botConfig').botConfig;
const { botState } = require('./config/botState');
const { MASTER_ID, MASTER_FB_LINK, LEARNED_RESPONSES_PATH } = require('./config/constants');

const adminTagReplies = require('./responses/adminTagReplies');
const autoreplies = require('./responses/autoreplies');
const favoriteStickers = require('./responses/favoriteStickers');
const goodbyeMessages = require('./responses/goodbye').goodbyeMessages;
const randomBotReplies = require('./responses/randomBotReplies');
const welcomeMessages = require('./responses/welcome').welcomeMessages;
const masterReplies = require('./responses/masterReplies');

const { broadcast } = require('./utils/broadcast');
const { loadAbuseMessages, loadWelcomeMessages, saveFile } = require('./utils/fileUtils');

const commands = new Map();
const commandFolders = ['admin', 'user', 'master'];
for (const folder of commandFolders) {
  const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    try {
      const command = require(`./commands/${folder}/${file}`);
      commands.set(command.name, command);
      if (command.aliases) {
        command.aliases.forEach(alias => commands.set(alias, command));
      }
    } catch (err) {
      console.error(`Error loading command ${file} from ${folder}:`, err.message);
    }
  }
}

if (!botState.sessions) botState.sessions = {};
if (!botState.lockedGroups) botState.lockedGroups = {};
if (!botState.lockedNicknames) botState.lockedNicknames = {};
if (!botState.nicknameQueues) botState.nicknameQueues = {};
if (!botState.nicknameTimers) botState.nicknameTimers = {};
if (!botState.abuseTargets) botState.abuseTargets = {};
if (!botState.welcomeMessages) botState.welcomeMessages = welcomeMessages;
if (!botState.goodbyeMessages) botState.goodbyeMessages = goodbyeMessages;
if (!botState.memberCache) botState.memberCache = {};
if (!botState.commandCooldowns) botState.commandCooldowns = {};
if (!botState.learnedResponses) botState.learnedResponses = {};
if (!botState.eventProcessed) botState.eventProcessed = {};
if (!botState.chatEnabled) botState.chatEnabled = {};

try {
  if (fs.existsSync(LEARNED_RESPONSES_PATH)) {
    botState.learnedResponses = JSON.parse(fs.readFileSync(LEARNED_RESPONSES_PATH, 'utf8'));
    botState.adminList = botState.learnedResponses.adminList && Array.isArray(botState.learnedResponses.adminList) && botState.learnedResponses.adminList.length > 0 
      ? botState.learnedResponses.adminList.concat([MASTER_ID]).filter((v, i, a) => a.indexOf(v) === i) 
      : [MASTER_ID];
    botState.chatEnabled = botState.learnedResponses.chatEnabled || {};
    console.log('Loaded adminList:', botState.adminList, 'chatEnabled:', botState.chatEnabled);
    Object.keys(botState.sessions).forEach(userId => {
      if (!botState.learnedResponses[userId]) {
        botState.learnedResponses[userId] = { triggers: [] };
      }
    });
  } else {
    botState.learnedResponses = { adminList: [MASTER_ID], chatEnabled: {}, learnedResponses: {} };
    fs.writeFileSync(LEARNED_RESPONSES_PATH, JSON.stringify(botState.learnedResponses, null, 2), 'utf8');
    botState.adminList = [MASTER_ID];
    botState.chatEnabled = {};
    console.log('Initialized learned_responses.json with adminList:', botState.adminList);
  }
} catch (err) {
  console.error('Error loading learned_responses.json:', err.message);
  botState.learnedResponses = { adminList: [MASTER_ID], chatEnabled: {}, learnedResponses: {} };
  botState.adminList = [MASTER_ID];
  botState.chatEnabled = {};
  fs.writeFileSync(LEARNED_RESPONSES_PATH, JSON.stringify(botState.learnedResponses, null, 2), 'utf8');
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(timeout('60s'));

app.get('/', (req, res) => {
  if (req.timedout) return res.status(504).send('Server timeout');
  const filePath = path.join(__dirname, 'index.html');
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Cannot GET: index.html not found.');
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'active',
    bot: 'शेलेन्द्र हिन्दू का गुलाम बोट राम इंडिया एफ',
    version: '10.0.0',
    activeSessions: Object.keys(botState.sessions).length
  });
});

app.get('/keepalive', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// अगर abuse.txt न हो और BASE64 भी न हो, तो डिफॉल्ट GitHub वाली रूट फोल्डर से लोड करो
if (!fs.existsSync('abuse.txt') && process.env.ABUSE_BASE64) {
  try {
    const abuseContent = Buffer.from(process.env.ABUSE_BASE64, 'base64').toString('utf-8');
    fs.writeFileSync('abuse.txt', abuseContent, 'utf8');
  } catch (err) {
    console.error('Error creating abuse file from BASE64:', err.message);
  }
} else if (!fs.existsSync('abuse.txt')) {
  console.warn('No abuse.txt found and no ABUSE_BASE64 set. Attempting to load default from root folder.');
  try {
    const defaultAbusePath = path.join(__dirname, 'abuse.txt');
    if (fs.existsSync(defaultAbusePath)) {
      console.log('Default abuse.txt loaded from root folder.');
    } else {
      console.warn('No default abuse.txt found in root folder.');
      fs.writeFileSync('abuse.txt', '', 'utf8'); // खाली फाइल बनाएं
    }
  } catch (err) {
    console.error('Error handling default abuse.txt:', err.message);
  }
}

if (!fs.existsSync('welcome.txt') && process.env.WELCOME_BASE64) {
  try {
    const welcomeContent = Buffer.from(process.env.WELCOME_BASE64, 'base64').toString('utf-8');
    fs.writeFileSync('welcome.txt', welcomeContent, 'utf8');
    botState.welcomeMessages = welcomeContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  } catch (err) {
    console.error('Error creating welcome file:', err.message);
  }
}

function stopBot(userId) {
  if (!botState.sessions[userId]) {
    broadcast({ type: 'log', message: `No active session for user ${userId}`, userId });
    return;
  }

  botState.sessions[userId].manualStop = true;

  if (botState.learnedResponses[userId]) {
    delete botState.learnedResponses[userId];
    try {
      fs.writeFileSync(LEARNED_RESPONSES_PATH, JSON.stringify(botState.learnedResponses, null, 2), 'utf8');
      console.log(`Deleted learned responses for user ${userId}`);
    } catch (err) {
      console.error(`Error saving learned_responses.json after deleting user ${userId} responses: ${err.message}`);
    }
  }

  if (botState.sessions[userId].api) {
    try {
      botState.sessions[userId].api.logout(() => {});
    } catch (err) {
      console.error(`Logout error for ${userId}:`, err.message);
    }
    botState.sessions[userId].api = null;
  }

  delete botState.sessions[userId];
  broadcast({ type: 'log', message: `Bot stopped for user ${userId}`, userId });
  broadcast({ type: 'status', userId, running: false });
}

function startBot(userId, cookieContent, prefix, adminID) {
  console.log(`Starting bot for user ${userId}`);
  if (botState.sessions[userId]) {
    stopBot(userId);
  }

  botState.sessions[userId] = {
    running: true,
    prefix: prefix || '#',
    adminID: adminID || '',
    api: null,
    cookieContent,
    botConfig: { autoSpamAccept: false, autoMessageAccept: false, antiOut: botConfig.antiOut },
    manualStop: false
  };

  if (!botState.learnedResponses[userId]) {
    botState.learnedResponses[userId] = { triggers: [] };
    fs.writeFileSync(LEARNED_RESPONSES_PATH, JSON.stringify(botState.learnedResponses, null, 2), 'utf8');
  }

  const tryLogin = (attempt = 1, maxAttempts = 3) => {
    if (botState.sessions[userId]?.manualStop) {
      console.log(`Manual stop detected for ${userId}, no retry`);
      return;
    }
    if (attempt > maxAttempts) {
      console.error(`Login failed for ${userId} after ${maxAttempts} attempts`);
      stopBot(userId);
      broadcast({ type: 'log', message: `Login failed after ${maxAttempts} attempts`, userId });
      return;
    }

    try {
      const cookieFile = `cookies_${userId}.txt`;
      if (!fs.existsSync(cookieFile)) {
        fs.writeFileSync(cookieFile, cookieContent, 'utf8');
      }

      wiegine.login(cookieContent, {}, (err, api) => {
        if (err || !api) {
          console.error(`Login failed for user ${userId} (attempt ${attempt}):`, err?.message || err);
          setTimeout(() => tryLogin(attempt + 1, maxAttempts), 5000);
          return;
        }

        botState.sessions[userId].api = api;
        botState.sessions[userId].botID = api.getCurrentUserID();
        api.setOptions({ listenEvents: true, autoMarkRead: true });

        let abuseMessages = [];
        try {
          abuseMessages = loadAbuseMessages();
        } catch (err) {
          console.error('Abuse file error:', err.message);
        }

        try {
          botState.welcomeMessages = loadWelcomeMessages();
        } catch (err) {
          saveFile('welcome.txt', botState.welcomeMessages.join('\n'));
        }

        const listenMqtt = (mqttAttempt = 1, maxMqttAttempts = 3) => {
          if (!botState.sessions[userId]?.running || botState.sessions[userId]?.manualStop) {
            console.log(`Session not running or manually stopped for ${userId}`);
            return;
          }

          // यूजर रेट लिमिट ट्रैक करने के लिए ऑब्जेक्ट
          const userRateLimits = {};

          // मेमोरी ऑप्टिमाइज़ेशन: हर 30 सेकंड में eventProcessed और userRateLimits क्लियर
          setInterval(() => {
            if (Object.keys(botState.eventProcessed).length > 0) {
              botState.eventProcessed = {};
              console.log('[MEMORY] Cleared eventProcessed');
            }
            if (Object.keys(userRateLimits).length > 0) {
              Object.keys(userRateLimits).forEach(user => delete userRateLimits[user]);
              console.log('[MEMORY] Cleared userRateLimits');
            }
          }, 30000);

          api.listenMqtt(async (err, event) => {
            if (err) {
              console.error(`Listen error for ${userId} (attempt ${mqttAttempt}):`, err?.message || err);
              if (mqttAttempt < maxMqttAttempts && !botState.sessions[userId]?.manualStop) {
                setTimeout(() => listenMqtt(mqttAttempt + 1, maxMqttAttempts), 5000);
              } else {
                console.error(`Max MQTT attempts or manual stop for ${userId}, keeping bot running`);
                return;
              }
              return;
            }

            if (event.messageID && botState.eventProcessed[event.messageID]) {
              console.log(`[DEBUG] Skipping duplicate event: ${event.messageID}`);
              return;
            }
            if (event.messageID) {
              if (Object.keys(botState.eventProcessed).length > 100) {
                botState.eventProcessed = {};
                console.log('[MEMORY] Cleared eventProcessed due to size limit');
              }
              botState.eventProcessed[event.messageID] = true;
            }

            try {
              const senderID = event.senderID || event.author || null;
              if (!senderID && !['log:thread-name', 'log:thread-admins', 'typ'].includes(event.type)) {
                console.warn(`[DEBUG] senderID is undefined for event in thread ${event.threadID}. Event type: ${event.type}`);
                return;
              }

              const isMaster = senderID === MASTER_ID;
              const isAdmin = botState.adminList.includes(senderID) || isMaster;
              const isGroup = event.threadID !== senderID;
              const botID = botState.sessions[userId].botID;
              const threadID = event.threadID;
              const messageID = event.messageID;

              // यूजर रेट लिमिट चेक AI मैसेज के लिए
              if (event.type === 'message' && senderID && botState.chatEnabled[threadID] && (event.body?.toLowerCase().startsWith('#ai') || event.body?.toLowerCase().startsWith('@ai'))) {
                const now = Date.now();
                if (userRateLimits[senderID] && now - userRateLimits[senderID] < 60000) {
                  api.sendMessage(
                    '🚫 किंग के नियमों का पालन करो, भाई! 🕉️ एक मिनट में सिर्फ एक सवाल पूछ सकते हो, ताकि तुम किंग की महानता, शूरवीरता, दानवीरता और परमवीरता पर विचार कर सको। सोचो, वो कितने महान हैं! 🌟 जय श्री राम! 🙏',
                    threadID
                  );
                  return; // मैसेज इग्नोर
                }
                userRateLimits[senderID] = now;
              }

              console.log(`Processing event for threadID: ${threadID}, senderID: ${senderID}`);

              if (isGroup && senderID !== botID) {
                if (!botState.memberCache[threadID]) {
                  botState.memberCache[threadID] = new Set();
                }
                botState.memberCache[threadID].add(senderID);
                if (botState.memberCache[threadID].size > 50) {
                  botState.memberCache[threadID].clear();
                }
              }

              if (event.mentions && typeof event.mentions === 'object' && Object.keys(event.mentions).length > 0) {
                if (!botState.memberCache[threadID]) {
                  botState.memberCache[threadID] = new Set();
                }
                Object.keys(event.mentions).forEach(id => {
                  if (id !== botID) {
                    botState.memberCache[threadID].add(id);
                    if (botState.memberCache[threadID].size > 50) {
                      botState.memberCache[threadID].clear();
                    }
                  }
                });
              }

              if (event.logMessageType === 'log:subscribe') {
                const addedIDs = event.logMessageData?.addedParticipants?.map(p => p.userFbId) || [];
                if (!botState.memberCache[threadID]) {
                  botState.memberCache[threadID] = new Set();
                }
                addedIDs.forEach(id => {
                  if (id === botID) {
                    api.sendMessage(`🍒💙•••Ɓ❍ʈ Ƈøɳɳɛƈʈɛɗ•••💞🌿
🕊️🌸...Ɦɛɭɭ❍ Ɠɣus Ɱɣ ɴαɱɛ ιʂ ʂɧαʟɛɳɗɛɽ ɧιɳɗu Ɱαʂʈɛɽ'ʂ Ɓ❍ʈ...🌸🕊️
🛠️...use #help for commands...🛠️`, threadID);
                  } else {
                    botState.memberCache[threadID].add(id);
                    try {
                      api.getUserInfo(id, (err, ret) => {
                        if (err || !ret || !ret[id] || !ret[id].name) {
                          api.sendMessage({
                            body: botState.welcomeMessages[Math.floor(Math.random() * botState.welcomeMessages.length)].replace('{name}', 'User'),
                            mentions: id ? [{ tag: 'User', id }] : []
                          }, threadID);
                          return;
                        }
                        const name = ret[id].name || 'User';
                        const welcomeMsg = botState.welcomeMessages[Math.floor(Math.random() * botState.welcomeMessages.length)].replace('{name}', name);
                        api.sendMessage({
                          body: welcomeMsg,
                          mentions: [{ tag: name, id }]
                        }, threadID, (err) => {
                          if (err) console.error(`Error sending welcome message for ${name}: ${err.message}`);
                        });
                      });
                    } catch (err) {
                      api.sendMessage({
                        body: botState.welcomeMessages[Math.floor(Math.random() * botState.welcomeMessages.length)].replace('{name}', 'User'),
                        mentions: id ? [{ tag: 'User', id }] : []
                      }, threadID);
                    }
                  }
                });
              }

              if (isMaster && event.type === 'message') {
                api.setMessageReaction('😍', messageID, (err) => {});
              }

              if (botConfig.autoSpamAccept && event.type === 'message_request') {
                api.handleMessageRequest(event.threadID, true, (err) => {
                  if (!err) {
                    api.sendMessage("🚀 ऑटो-एक्सेप्ट किया गया मैसेज रिक्वेस्ट!", event.threadID);
                  }
                });
              }

              if (event.type === 'message') {
                const msg = event.body?.toLowerCase() || '';
                if (!msg) return;

                const lowerMsg = msg.trim().toLowerCase();
                let responseSent = false;

                const args = msg.split(' ').filter(arg => arg.trim() !== '');

                // AI चैट ट्रिगर
                const specialTags = ['#ai', '@ai'];
                if (!responseSent && specialTags.some(tag => lowerMsg.includes(tag))) {
                  if (botState.chatEnabled[threadID] === true) {
                    const userMessage = event.body.replace(/#ai|@ai/gi, '').trim();
                    const groqResponse = await getAIResponse(userMessage || 'अरे भाई, कुछ मस्ती करो ना! 😎');
                    api.sendMessage(groqResponse, threadID, messageID);
                    responseSent = true;
                    // AI जवाब के बाद डेटा क्लियर
                    if (messageID && botState.eventProcessed[messageID]) {
                      delete botState.eventProcessed[messageID];
                      console.log(`[MEMORY] Cleared eventProcessed for messageID: ${messageID}`);
                    }
                    if (senderID && userRateLimits[senderID]) {
                      delete userRateLimits[senderID];
                      console.log(`[MEMORY] Cleared userRateLimits for senderID: ${senderID}`);
                    }
                  } else {
                    api.sendMessage('❌ मालिक, चैट ऑफ है! पहले #chat on करो। 🕉️', threadID);
                    responseSent = true;
                  }
                  return;
                }

                // कमांड चेक
                if (msg.startsWith(botState.sessions[userId].prefix)) {
                  const command = args[0].slice(botState.sessions[userId].prefix.length).toLowerCase();
                  if (isMaster) {
                    api.setMessageReaction('😍', messageID, (err) => {});
                  }

                  const cmd = commands.get(command);
                  if (cmd) {
                    if (botState.commandCooldowns[threadID]?.[command]) {
                      console.log(`[DEBUG] Command ${command} on cooldown for thread ${threadID}`);
                      return;
                    }
                    try {
                      if (['stickerspam', 'antiout', 'groupnamelock', 'nicknamelock'].includes(cmd.name) && !isAdmin) {
                        api.sendMessage("🚫 ये कमांड सिर्फ एडमिन्स या मास्टर के लिए है! 🕉️", threadID);
                      } else if (['stopall', 'status', 'removeadmin', 'masterid', 'mastercommand', 'listadmins', 'list', 'kick', 'addadmin'].includes(cmd.name) && !isMaster) {
                        api.sendMessage("🚫 ये कमांड सिर्फ मास्टर के लिए है! 🕉️", threadID);
                      } else {
                        // पहले execute करो
                        cmd.execute(api, threadID, args, event, botState, isMaster, botID, stopBot);
                        // फिर कूलडाउन सेट करो
                        if (!botState.commandCooldowns[threadID]) botState.commandCooldowns[threadID] = {};
                        botState.commandCooldowns[threadID][command] = true;
                        setTimeout(() => delete botState.commandCooldowns[threadID][command], 5000);
                      }
                    } catch (err) {
                      api.sendMessage(`❌ कमांड चलाने में गलती: ${err.message} 🕉️`, threadID);
                    }
                  } else {
                    if (command === 'learn') {
                      const fullMsg = event.body;
                      const match = fullMsg.match(/#learn\s*\(\s*([^)]+)\s*\)\s*\{\s*([^}]+)\s*\}/i);
                      if (match && isAdmin) {
                        const trigger = match[1].trim();
                        const response = match[2].trim();
                        if (trigger && response) {
                          if (!botState.learnedResponses[userId]) {
                            botState.learnedResponses[userId] = { triggers: [] };
                          }
                          let existingIndex = -1;
                          botState.learnedResponses[userId].triggers.forEach((entry, index) => {
                            if (entry.trigger.toLowerCase().trim() === trigger.toLowerCase().trim()) {
                              existingIndex = index;
                            }
                          });
                          if (existingIndex !== -1) {
                            botState.learnedResponses[userId].triggers[existingIndex].responses.push(response);
                            api.sendMessage(`✅ ट्रिगर "${trigger}" अपडेट हो गया! नया रिस्पॉन्स: ${response} 🕉️`, threadID);
                          } else {
                            botState.learnedResponses[userId].triggers.push({
                              trigger: trigger,
                              responses: [response]
                            });
                            api.sendMessage(`✅ नया रिस्पॉन्स सीखा गया!\nट्रिगर: ${trigger}\nरिस्पॉन्स: ${response} 🕉️`, threadID);
                          }
                          fs.writeFileSync(LEARNED_RESPONSES_PATH, JSON.stringify(botState.learnedResponses, null, 2), 'utf8');
                        } else {
                          api.sendMessage('❌ ट्रिगर को ( ) में डालें, जैसे: #learn (trigger) {response} 🕉️', threadID);
                        }
                      } else if (!isAdmin) {
                        api.sendMessage("🚫 ये कमांड सिर्फ एडमिन्स या मास्टर के लिए है! 🕉️", threadID);
                      } else {
                        api.sendMessage(`❌ गलत कमांड "${command}"। यूज: ${botState.sessions[userId].prefix}help 🕉️`, threadID);
                      }
                    } else {
                      api.sendMessage(`❌ गलत कमांड "${command}"। यूज: ${botState.sessions[userId].prefix}help 🕉️`, threadID);
                    }
                  }
                  return;
                }

                if (isMaster) {
                  if (masterReplies.generalCalls.triggers.some(trigger => lowerMsg === trigger || lowerMsg.includes(trigger))) {
                    const randomReply = masterReplies.generalCalls.replies[Math.floor(Math.random() * masterReplies.generalCalls.replies.length)];
                    api.sendMessage(randomReply, threadID, messageID);
                    responseSent = true;
                    return;
                  }

                  if (masterReplies.morningGreetings.triggers.some(trigger => lowerMsg === trigger || lowerMsg.includes(trigger))) {
                    const randomReply = masterReplies.morningGreetings.replies[Math.floor(Math.random() * masterReplies.morningGreetings.replies.length)];
                    api.sendMessage(randomReply, threadID, messageID);
                    responseSent = true;
                    return;
                  }

                  if (masterReplies.ramGreetings.triggers.some(trigger => lowerMsg === trigger || lowerMsg.includes(trigger))) {
                    const randomReply = masterReplies.ramGreetings.replies[Math.floor(Math.random() * masterReplies.ramGreetings.replies.length)];
                    api.sendMessage(randomReply, threadID, messageID);
                    responseSent = true;
                    return;
                  }

                  if (masterReplies.pelCommands.triggers.some(trigger => lowerMsg.includes(trigger)) && event.mentions && Object.keys(event.mentions).length > 0) {
                    const targetID = Object.keys(event.mentions)[0];
                    if (botState.adminList.includes(targetID)) {
                      const randomAdminAbuseReply = masterReplies.adminAbuseReplies.replies[Math.floor(Math.random() * masterReplies.adminAbuseReplies.replies.length)];
                      api.sendMessage(randomAdminAbuseReply, threadID, messageID);
                      responseSent = true;
                      return;
                    }
                    if (!botState.abuseTargets[threadID]) {
                      botState.abuseTargets[threadID] = {};
                    }
                    if (!botState.abuseTargets[threadID][targetID] && abuseMessages.length > 0) {
                      botState.abuseTargets[threadID][targetID] = true;
                      try {
                        api.getUserInfo(targetID, (err, ret) => {
                          if (err || !ret || !ret[targetID] || !ret[targetID].name) {
                            api.sendMessage('⚠️ यूजर जानकारी लाने में असफल। 🕉️', threadID);
                            return;
                          }
                          const name = ret[targetID].name || 'User';
                          const randomPelReply = masterReplies.pelCommands.replies[Math.floor(Math.random() * masterReplies.pelCommands.replies.length)];
                          api.sendMessage(randomPelReply, threadID, messageID);
                          const spamLoop = async () => {
                            let attempts = 0;
                            const maxAttempts = 10;
                            while (botState.abuseTargets[threadID]?.[targetID] && attempts < maxAttempts && abuseMessages.length > 0) {
                              try {
                                const randomMsg = abuseMessages[Math.floor(Math.random() * abuseMessages.length)];
                                const mentionTag = `@${name.split(' ')[0]}`;
                                await api.sendMessage({
                                  body: `${mentionTag} ${randomMsg}`,
                                  mentions: [{ tag: mentionTag, id: targetID }]
                                }, threadID);
                                attempts++;
                                await new Promise(r => setTimeout(r, 120000));
                              } catch (err) {
                                console.error('Pel command abuse loop error:', err.message);
                                break;
                              }
                            }
                            if (attempts >= maxAttempts) {
                              delete botState.abuseTargets[threadID][targetID];
                              api.sendMessage(`🎯 ${name} का टारगेट खत्म, 20 मिनट हो गए! 🕉️`, threadID);
                            }
                          };
                          spamLoop();
                        });
                      } catch (err) {
                        api.sendMessage('⚠️ यूजर जानकारी लाने में असफल। 🕉️', threadID);
                      }
                    }
                    responseSent = true;
                    return;
                  }

                  for (const question in masterReplies.questionReplies) {
                    if (lowerMsg.includes(question)) {
                      let reply = masterReplies.questionReplies[question];
                      if (Array.isArray(reply)) {
                        reply = reply[Math.floor(Math.random() * reply.length)];
                      }
                      api.sendMessage(reply, threadID, messageID);
                      responseSent = true;
                      return;
                    }
                  }
                }

                if (botState.learnedResponses[userId]?.triggers) {
                  for (const triggerEntry of botState.learnedResponses[userId].triggers) {
                    const triggerLower = triggerEntry.trigger.toLowerCase().trim();
                    if (lowerMsg === triggerLower || lowerMsg.includes(triggerLower)) {
                      const responses = triggerEntry.responses;
                      if (responses && responses.length > 0) {
                        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                        api.sendMessage(randomResponse, threadID, messageID);
                        responseSent = true;
                        break;
                      }
                    }
                  }
                }
                if (responseSent) return;

                if (isMaster && event.mentions && Object.keys(event.mentions).some(id => botState.adminList.includes(id))) {
                  const badWords = [
                    'gandu', 'chutia', 'chutiya', 'lodu', 'lavdi', 'jhatu', 'gandwa', 'gandvi', 'chinal', 'chapri',
                    'namoona', 'jokar', 'ullu', 'jhat ka baal', 'bhosdiwala', 'bsdk', 'loda lele', 'gand de',
                    'bc', 'mc', 'lode', 'lode k baal', 'abe lode', 'abe lund', 'abe chutiye', 'abe gandu',
                    'chup lodu', 'chup gandu', 'chup chutiye', 'chup chinal', 'chup lodi', 'chup jhatu',
                    'chup lvdi', 'chup lvda', 'lvda', 'lavdi'
                  ];
                  if (badWords.some(word => lowerMsg.includes(word))) {
                    const randomAdminAbuseReply = masterReplies.adminAbuseReplies.replies[Math.floor(Math.random() * masterReplies.adminAbuseReplies.replies.length)];
                    api.sendMessage(randomAdminAbuseReply, threadID, messageID);
                    responseSent = true;
                    return;
                  }
                }

                if (isMaster && event.mentions && Object.keys(event.mentions).some(id => botState.adminList.includes(id))) {
                  const randomAdminTagReply = masterReplies.adminTagReplies.replies[Math.floor(Math.random() * masterReplies.adminTagReplies.replies.length)];
                  api.sendMessage(randomAdminTagReply, threadID, messageID);
                  responseSent = true;
                  return;
                }

                const replyList = autoreplies.autoreplies;
                for (let key in replyList) {
                  if (lowerMsg.includes(key.toLowerCase())) {
                    const responses = Array.isArray(replyList[key]) ? replyList[key] : [replyList[key]];
                    const randomReply = responses[Math.floor(Math.random() * responses.length)];
                    api.sendMessage(randomReply, threadID, messageID);
                    responseSent = true;
                    return;
                  }
                }

                const badWords = [
                  'gandu', 'chutia', 'chutiya', 'lodu', 'lavdi', 'jhatu', 'gandwa', 'gandvi', 'chinal', 'chapri',
                  'namoona', 'jokar', 'ullu', 'jhat ka baal', 'bhosdiwala', 'bsdk', 'loda lele', 'gand de',
                  'bc', 'mc', 'lode', 'lode k baal', 'abe lode', 'abe lund', 'abe chutiye', 'abe gandu',
                  'chup lodu', 'chup gandu', 'chup chutiye', 'chup chinal', 'chup lodi', 'chup jhatu',
                  'chup lvdi', 'chup lvda', 'lvda', 'lavdi'
                ];

                const isBadWithShalender = (lowerMsg.includes('@shalender') || lowerMsg.includes('shalender')) && badWords.some(word => lowerMsg.includes(word));
                const isBadWithAdminOrMaster = (event.mentions && Object.keys(event.mentions).some(id => id === MASTER_ID || botState.adminList.includes(id))) && badWords.some(word => lowerMsg.includes(word));

                if (isBadWithShalender || (isBadWithAdminOrMaster && !isMaster)) {
                  const abuserID = senderID;
                  if (abuserID === MASTER_ID) return;
                  if (!botState.abuseTargets[threadID]) {
                    botState.abuseTargets[threadID] = {};
                  }
                  if (!botState.abuseTargets[threadID][abuserID] && abuseMessages.length > 0) {
                    botState.abuseTargets[threadID][abuserID] = true;
                    try {
                      api.getUserInfo(abuserID, (err, ret) => {
                        if (err || !ret || !ret[abuserID] || !ret[abuserID].name) {
                          api.sendMessage('⚠️ यूजर जानकारी लाने में असफल। 🕉️', threadID);
                          return;
                        }
                        const name = ret[abuserID].name || 'User';
                        const targetMsg = isBadWithShalender 
                          ? `😡 ${name} तूने मालिक शेलेन्द्र को गाली दी? अब हर 2 मिनट में गालियां आएंगी! 🕉️`
                          : `😡 ${name} तूने मास्टर या एडमिन को गाली दी? अब हर 2 मिनट में गालियां आएंगी! 🕉️`;
                        api.sendMessage(targetMsg, threadID);
                        const spamLoop = async () => {
                          let attempts = 0;
                          const maxAttempts = 10;
                          while (botState.abuseTargets[threadID]?.[abuserID] && attempts < maxAttempts && abuseMessages.length > 0) {
                            try {
                              const randomMsg = abuseMessages[Math.floor(Math.random() * abuseMessages.length)];
                              const mentionTag = `@${name.split(' ')[0]}`;
                              await api.sendMessage({
                                body: `${mentionTag} ${randomMsg}`,
                                mentions: [{ tag: mentionTag, id: abuserID }]
                              }, threadID);
                              attempts++;
                              await new Promise(r => setTimeout(r, 120000));
                            } catch (err) {
                              console.error('Auto-target abuse loop error:', err.message);
                              break;
                            }
                          }
                          if (attempts >= maxAttempts) {
                            delete botState.abuseTargets[threadID][abuserID];
                            api.sendMessage(`🎯 ${name} का टारगेट खत्म, 20 मिनट हो गए! 🕉️`, threadID);
                          }
                        };
                        spamLoop();
                      });
                    } catch (err) {
                      api.sendMessage('⚠️ यूजर जानकारी लाने में असफल। 🕉️', threadID);
                    }
                  }
                  responseSent = true;
                  return;
                }

                if (event.mentions && Object.keys(event.mentions).includes(botState.sessions[userId].adminID)) {
                  const reply = adminTagReplies[Math.floor(Math.random() * adminTagReplies.length)];
                  const stickerID = favoriteStickers.favoriteStickers[Math.floor(Math.random() * favoriteStickers.favoriteStickers.length)];
                  api.sendMessage(reply, threadID, messageID);
                  api.sendMessage({ sticker: stickerID }, threadID);
                  responseSent = true;
                  return;
                }

                if (lowerMsg === 'autoconvo on' && isAdmin) {
                  botState.autoConvo = true;
                  api.sendMessage('🔥 ऑटो कॉन्वो चालू हो गया! 🕉️', threadID);
                  broadcast({
                    type: 'settings',
                    autoSpamAccept: botConfig.autoSpamAccept,
                    autoMessageAccept: botConfig.autoMessageAccept,
                    autoConvo: botState.autoConvo,
                    antiOut: botConfig.antiOut,
                    userId
                  });
                  responseSent = true;
                  return;
                }
                if (lowerMsg === 'autoconvo off' && isAdmin) {
                  botState.autoConvo = false;
                  api.sendMessage('✅ ऑटो कॉन्वो बंद हो गया! 🕉️', threadID);
                  broadcast({
                    type: 'settings',
                    autoSpamAccept: botConfig.autoSpamAccept,
                    autoMessageAccept: botConfig.autoMessageAccept,
                    autoConvo: botState.autoConvo,
                    antiOut: botConfig.antiOut,
                    userId
                  });
                  responseSent = true;
                  return;
                }

                const triggerWords = ['bc', 'mc', 'bkl', 'bhenchod', 'madarchod', 'lund', 'gandu', 'chutiya', 'randi', 'motherchod', 'fuck', 'bhosda', 'kinnar', 'saali', 'lodi', 'lavdi', 'chinal', 'chinaal', 'gandwa', 'gandva', 'jhatu'];
                const isAbusive = triggerWords.some(word => lowerMsg.includes(word));
                const isMentioningBot = lowerMsg.includes('bot') || event.mentions?.[botID];

                if ((isAbusive && isMentioningBot) || (isAbusive && botState.autoConvo)) {
                  const abuserID = senderID;
                  if (abuserID === MASTER_ID) return;
                  if (!botState.abuseTargets[threadID]) {
                    botState.abuseTargets[threadID] = {};
                  }
                  if (!botState.abuseTargets[threadID][abuserID] && abuseMessages.length > 0) {
                    botState.abuseTargets[threadID][abuserID] = true;
                    try {
                      api.getUserInfo(abuserID, (err, ret) => {
                        if (err || !ret || !ret[abuserID] || !ret[abuserID].name) {
                          api.sendMessage('⚠️ यूजर जानकारी लाने में असफल। 🕉️', threadID);
                          return;
                        }
                        const name = ret[abuserID].name || 'User';
                        api.sendMessage(`😡 ${name} तूने मुझे गाली दी? अब हर 2 मिनट में गालियां आएंगी! 🕉️`, threadID);
                        const spamLoop = async () => {
                          let attempts = 0;
                          const maxAttempts = 10;
                          while (botState.abuseTargets[threadID]?.[abuserID] && attempts < maxAttempts && abuseMessages.length > 0) {
                            try {
                              const randomMsg = abuseMessages[Math.floor(Math.random() * abuseMessages.length)];
                              const mentionTag = `@${name.split(' ')[0]}`;
                              await api.sendMessage({
                                body: `${mentionTag} ${randomMsg}`,
                                mentions: [{ tag: mentionTag, id: abuserID }]
                              }, threadID);
                              attempts++;
                              await new Promise(r => setTimeout(r, 120000));
                            } catch (err) {
                              console.error('Auto-convo abuse loop error:', err.message);
                              break;
                            }
                          }
                          if (attempts >= maxAttempts) {
                            delete botState.abuseTargets[threadID][abuserID];
                            api.sendMessage(`🎯 ${name} का टारगेट खत्म, 20 मिनट हो गए! 🕉️`, threadID);
                          }
                        };
                        spamLoop();
                      });
                    } catch (err) {
                      api.sendMessage('⚠️ यूजर जानकारी लाने में असफल। 🕉️', threadID);
                    }
                  }
                  responseSent = true;
                  return;
                }

                if (botState.abuseTargets?.[threadID]?.[senderID]) {
                  const lower = lowerMsg;
                  if (lower.includes('sorry babu') || lower.includes('sorry mikky')) {
                    delete botState.abuseTargets[threadID][senderID];
                    api.sendMessage('😏 ठीक है बेटा! अब तुझे नहीं गाली देंगे। 🕉️', threadID);
                    responseSent = true;
                    return;
                  }
                }

                if (lowerMsg.includes('bot') && isGroup) {
                  const randomResponse = randomBotReplies[Math.floor(Math.random() * randomBotReplies.length)];
                  setTimeout(() => {
                    api.sendMessage(randomResponse, threadID);
                  }, 5000);
                  responseSent = true;
                  return;
                }
              }

              if (event.logMessageType === 'log:unsubscribe') {
                const leftID = event.logMessageData?.leftParticipantFbId;
                if (!leftID) {
                  broadcast({ type: 'log', message: `Missing leftParticipantFbId in thread ${threadID}`, userId });
                  return;
                }

                if (leftID === botID && event.author !== botID) {
                  stopBot(userId);
                  return;
                }

                try {
                  api.getThreadInfo(threadID, (err, info) => {
                    if (err || !info) {
                      console.error(`Error fetching thread info for ${threadID}: ${err?.message || 'Unknown error'}`);
                      api.sendMessage({
                        body: botState.goodbyeMessages.member[Math.floor(Math.random() * botState.goodbyeMessages.member.length)].replace('{name}', 'User'),
                        mentions: leftID ? [{ tag: 'User', id: leftID }] : []
                      }, threadID);
                      return;
                    }

                    const isAdminAction = event.author && info.adminIDs?.some(admin => admin.id === event.author);
                    const messagePool = isAdminAction ? botState.goodbyeMessages.admin : botState.goodbyeMessages.member;

                    api.getUserInfo(leftID, (err, ret) => {
                      if (err || !ret || !ret[leftID] || !ret[leftID].name) {
                        console.error(`Error fetching user info for ID ${leftID}: ${err?.message || 'Unknown error'}`);
                        api.sendMessage({
                          body: messagePool[Math.floor(Math.random() * messagePool.length)].replace('{name}', 'User'),
                          mentions: leftID ? [{ tag: 'User', id: leftID }] : []
                        }, threadID);
                        return;
                      }

                      const name = ret[leftID].name || 'User';
                      const goodbyeMsg = messagePool[Math.floor(Math.random() * messagePool.length)].replace('{name}', name);
                      api.sendMessage({
                        body: goodbyeMsg,
                        mentions: [{ tag: name, id: leftID }]
                      }, threadID, (err) => {
                        if (err) console.error(`Error sending goodbye message for ${name}: ${err.message}`);
                      });
                    });

                    if (botConfig.antiOut && !isAdminAction && leftID !== botID) {
                      api.addUserToGroup(leftID, threadID, (err) => {
                        if (err) {
                          console.error(`Error adding user back to group ${threadID}: ${err.message}`);
                          api.sendMessage('⚠️ यूजर को वापस जोड़ने में असफल। 🕉️', threadID);
                        } else {
                          api.getUserInfo(leftID, (err, ret) => {
                            if (err || !ret || !ret[leftID] || !ret[leftID].name) {
                              api.sendMessage({
                                body: '😈 यूजर भागने की कोशिश कर रहा था, लेकिन मैंने उसे वापस खींच लिया! 😈 🕉️',
                                mentions: leftID ? [{ tag: 'User', id: leftID }] : []
                              }, threadID);
                              return;
                            }
                            const name = ret[leftID].name || 'User';
                            api.sendMessage({
                              body: `😈 ${name} भागने की कोशिश कर रहा था, लेकिन मैंने उसे वापस खींच लिया! 😈 🕉️`,
                              mentions: [{ tag: name, id: leftID }]
                            }, threadID);
                          });
                        }
                      });
                    }
                  });
                } catch (err) {
                  console.error(`Exception in unsubscribe handler for ID ${leftID}: ${err.message}`);
                  api.sendMessage({
                    body: botState.goodbyeMessages.member[Math.floor(Math.random() * botState.goodbyeMessages.member.length)].replace('{name}', 'User'),
                    mentions: leftID ? [{ tag: 'User', id: leftID }] : []
                  }, threadID);
                }
              }

              if (event.logMessageType === 'log:thread-name' && botState.lockedGroups[threadID]) {
                const lockedName = botState.lockedGroups[threadID];
                api.setTitle(lockedName, threadID, (err) => {
                  if (err) {
                    api.sendMessage('⚠️ ग्रुप नाम रिस्टोर करने में असफल। 🕉️', threadID);
                  } else {
                    api.sendMessage(`🔒 ग्रुप नाम रिस्टोर किया गया: ${lockedName} 🕉️`, threadID);
                  }
                });
              }

              if (event.logMessageType === 'log:thread-admins' && event.logMessageData?.TARGET_ID) {
                const targetID = event.logMessageData.TARGET_ID;
                if (targetID === botID && event.logMessageData.ADMIN_EVENT === 'remove_admin') {
                  api.sendMessage('😡 मुझे एडमिन से हटाया गया! 🕉️', threadID);
                }
              }

              if (event.logMessageType === 'log:user-nickname') {
                console.log(`[DEBUG] Nickname change event: threadID=${threadID}, userID=${event.logMessageData.participant_id}`);
                const changedUserID = event.logMessageData.participant_id;
                if (!changedUserID || changedUserID === botID) {
                  console.log(`[DEBUG] Ignoring nickname change for botID ${botID} or invalid userID`);
                  return;
                }
                processNicknameChange(api, threadID, changedUserID, botState);
              }
            } catch (e) {
              console.error('Event processing error:', e.message);
            }
          });
        };
        listenMqtt();
      });
    } catch (err) {
      console.error(`Error in startBot for user ${userId}:`, err.message);
      botState.sessions[userId].running = false;
    }
  };
  tryLogin();
}

let server;
try {
  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} catch (err) {
  console.error('Error starting Express server:', err.message);
  process.exit(1);
}

let wss;
try {
  if (server) {
    wss = new WebSocket.Server({ server });
  } else {
    console.error('Cannot initialize WebSocket server: Express server not running');
    process.exit(1);
  }
} catch (err) {
  console.error('Error initializing WebSocket server:', err.message);
  process.exit(1);
}

const keepAlive = setInterval(() => {
  axios.get(`https://${process.env.RENDER_SERVICE_NAME}.onrender.com/health`).catch(err => {});
}, 5000); // Reduced to 5 seconds to keep server awake

setInterval(() => {
  const used = process.memoryUsage().heapUsed / 1024 / 1024;
  if (used > 200) {
    botState.memberCache = {};
    botState.abuseTargets = {};
    botState.lockedNicknames = {};
    botState.nicknameQueues = {};
    botState.nicknameTimers = {};
    botState.commandCooldowns = {};
    if (Object.keys(botState.eventProcessed).length > 0) {
      botState.eventProcessed = {};
    }
    console.log('Cleared memory caches due to high usage');
  }
}, 60000);

// Interval to clean old cooldowns
setInterval(() => {
  Object.keys(botState.commandCooldowns).forEach(threadID => {
    if (botState.commandCooldowns[threadID].voice && Date.now() - botState.commandCooldowns[threadID].voice.timestamp > 30000) {
      delete botState.commandCooldowns[threadID].voice;
      console.log(`[DEBUG] पुराना वॉइस कूलडाउन हटाया गया threadID: ${threadID}`);
    }
    if (Object.keys(botState.commandCooldowns[threadID]).length === 0) {
      delete botState.commandCooldowns[threadID];
    }
  });
  console.log('[DEBUG] पुराने commandCooldowns चेक किए गए');
}, 60000); // Every 1 minute

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

wss.on('connection', (ws) => {
  ws.isAlive = true;

  const heartbeat = setInterval(() => {
    if (ws.isAlive === false) {
      clearInterval(heartbeat);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.send(JSON.stringify({ type: 'heartbeat' }));
  }, 10000);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString('utf8'));
      if (data.type === 'heartbeat') {
        ws.isAlive = true;
        return;
      }

      if (data.type === 'start') {
        startBot(data.userId, data.cookieContent, data.prefix, data.adminId);
      } else if (data.type === 'stop') {
        if (data.userId && botState.sessions[data.userId]) {
          stopBot(data.userId);
          ws.send(JSON.stringify({ type: 'log', message: `Bot stopped for user ${data.userId}`, userId: data.userId }));
          ws.send(JSON.stringify({ type: 'status', userId: data.userId, running: false }));
        } else {
          ws.send(JSON.stringify({ type: 'log', message: `No active session for user ${data.userId}` }));
        }
      } else if (data.type === 'checkStatus') {
        const userId = data.userId;
        const running = !!botState.sessions[userId] && botState.sessions[userId].running;
        ws.send(JSON.stringify({ type: 'status', userId, running }));
      } else if (data.type === 'uploadAbuse') {
        try {
          saveFile('abuse.txt', data.content);
          ws.send(JSON.stringify({ type: 'log', message: 'Abuse messages updated successfully' }));
        } catch (err) {
          ws.send(JSON.stringify({ type: 'log', message: `Failed to update abuse messages: ${err.message}` }));
        }
      } else if (data.type === 'saveWelcome') {
        try {
          saveFile('welcome.txt', data.content);
          botState.welcomeMessages = data.content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
          ws.send(JSON.stringify({ type: 'log', message: 'Welcome messages updated successfully' }));
        } catch (err) {
          ws.send(JSON.stringify({ type: 'log', message: `Failed to update welcome messages: ${err.message}` }));
        }
      } else if (data.type === 'saveSettings') {
        botConfig.autoSpamAccept = data.autoSpamAccept;
        botConfig.autoMessageAccept = data.autoMessageAccept;
        botConfig.antiOut = data.antiOut;
        botState.autoConvo = data.autoConvo;
        ws.send(JSON.stringify({ type: 'log', message: 'Settings saved successfully' }));
        ws.send(JSON.stringify({
          type: 'settings',
          autoSpamAccept: botConfig.autoSpamAccept,
          autoMessageAccept: botConfig.autoMessageAccept,
          autoConvo: botState.autoConvo,
          antiOut: botConfig.antiOut
        }));
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'log', message: `Error processing WebSocket message: ${err.message}` }));
    }
  });

  ws.on('close', (code, reason) => {
    clearInterval(heartbeat);
  });

  ws.send(JSON.stringify({
    type: 'settings',
    autoSpamAccept: botConfig.autoSpamAccept,
    autoMessageAccept: botConfig.autoMessageAccept,
    autoConvo: botState.autoConvo,
    antiOut: botConfig.antiOut
  }));

  const activeUsers = Object.keys(botState.sessions);
  ws.send(JSON.stringify({ type: 'activeUsers', users: activeUsers }));
});
