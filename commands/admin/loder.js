// commands/admin/loder.js
const { broadcast } = require('../../utils/broadcast');
const { loadAbuseMessages } = require('../../utils/fileUtils');
const { MASTER_ID } = require('../../config/constants');

module.exports = {
  name: "loder",
  execute(api, threadID, args, event, botState, isMaster) {
    try {
      if (!isMaster && !botState.adminList.includes(event.senderID)) {
        api.sendMessage('🚫 केवल मास्टर या एडमिन इस कमांड को यूज कर सकते हैं।', threadID);
        return;
      }

      const abuseMessages = loadAbuseMessages();

      if (args[1] === 'stop') {
        if (botState.abuseTargets[threadID]) {
          delete botState.abuseTargets[threadID];
          api.sendMessage('🛑 टारगेटिंग बंद कर दी गई।', threadID);
          broadcast({
            type: 'log',
            message: `[${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })} IST] [User ${event.senderID}] Stopped loder in thread ${threadID}`,
            userId: event.senderID,
            color: '#00ff00'
          });
        } else {
          api.sendMessage('⚠️ कोई टारगेटिंग चल नहीं रही।', threadID);
        }
        return;
      }

      if (args[1] !== 'target' || args[2] !== 'on' || !event.mentions || Object.keys(event.mentions).length === 0) {
        api.sendMessage('❌ सही फॉर्मेट: #loder target on @user', threadID);
        return;
      }

      const targetID = Object.keys(event.mentions)[0];
      if (targetID === MASTER_ID) {
        api.sendMessage('🚫 मास्टर को टारगेट नहीं किया जा सकता!', threadID);
        return;
      }

      if (!abuseMessages.length) {
        api.sendMessage('⚠️ कोई गाली मैसेजेस उपलब्ध नहीं हैं। पहले abuse.txt अपलोड करें।', threadID);
        return;
      }

      if (!botState.abuseTargets[threadID]) botState.abuseTargets[threadID] = {};
      if (botState.abuseTargets[threadID][targetID]) {
        api.sendMessage('⚠️ ये यूजर पहले से टारगेटेड है।', threadID);
        return;
      }

      botState.abuseTargets[threadID][targetID] = true;
      api.getUserInfo(targetID, (err, ret) => {
        if (err || !ret || !ret[targetID]) {
          api.sendMessage('⚠️ यूजर जानकारी लाने में असफल।', threadID);
          return;
        }
        const name = ret[targetID].name || 'User';
        api.sendMessage(`😈 ${name} को टारगेट किया गया! अब हर 2 मिनट में गालियां आएंगी!`, threadID);

        const spamLoop = async () => {
          while (botState.abuseTargets[threadID]?.[targetID] && abuseMessages.length > 0) {
            const randomMsg = abuseMessages[Math.floor(Math.random() * abuseMessages.length)];
            const mentionTag = `@${name.split(' ')[0]}`;
            await api.sendMessage({
              body: `${mentionTag} ${randomMsg}`,
              mentions: [{ tag: mentionTag, id: targetID }]
            }, threadID);
            await new Promise(r => setTimeout(r, 120000));
          }
        };
        spamLoop();
      });

      broadcast({
        type: 'log',
        message: `[${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })} IST] [User ${event.senderID}] Started loder on user ${targetID} in thread ${threadID}`,
        userId: event.senderID,
        color: '#00ff00'
      });
    } catch (e) {
      console.error('[ERROR] loder error:', e.message);
      api.sendMessage('⚠️ loder कमांड में गलती।', threadID);
      broadcast({
        type: 'error',
        message: `[${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })} IST] [User ${event.senderID}] loder error: ${e.message}`,
        userId: event.senderID,
        color: '#ff4444'
      });
    }
  }
};
