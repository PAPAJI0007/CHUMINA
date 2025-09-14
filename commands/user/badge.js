module.exports = {
  name: 'badge',
  description: 'Generate a stylish text-based badge message with verified title, emoji, and date 🌟🔥',
  aliases: ['badge'],
  execute: async (api, threadID, args, event, botState, isMaster, botID, stopBot) => {
    console.log(`[DEBUG] badge called: threadID=${threadID}, args=${JSON.stringify(args)}, senderID=${event.senderID}`);
    try {
      let targetID;
      if (event.mentions && Object.keys(event.mentions).length > 0) {
        targetID = Object.keys(event.mentions)[0];
        console.log(`[DEBUG] Using mention ID: ${targetID}`);
      } else if (args[0] && args[0].startsWith('https://www.facebook.com/')) {
        const profileUrl = args[0];
        const userIDMatch = profileUrl.match(/(\d+)/);
        if (!userIDMatch) {
          console.log('[DEBUG] Invalid profile URL provided');
          return api.sendMessage('🚫 गलत प्रोफाइल लिंक! @mention या सही FB प्रोफाइल लिंक यूज करो। 🕉️', threadID);
        }
        targetID = userIDMatch[0];
        console.log(`[DEBUG] Using profile URL ID: ${targetID}`);
      } else if (event.messageReply && event.messageReply.senderID) {
        targetID = event.messageReply.senderID;
        console.log(`[DEBUG] Using reply sender ID: ${targetID}`);
      } else {
        targetID = event.senderID;
        console.log(`[DEBUG] Using sender ID: ${targetID}`);
      }

      if (!targetID) {
        console.log('[DEBUG] No target ID found');
        return api.sendMessage('🚫 यूजर ID नहीं मिली! @mention, प्रोफाइल लिंक, या रिप्लाई यूज करो। 🕉️', threadID);
      }

      let userInfo;
      try {
        console.log(`[DEBUG] Fetching user info for ID: ${targetID}`);
        userInfo = await new Promise((resolve, reject) => {
          api.getUserInfo(targetID, (err, ret) => {
            if (err || !ret || !ret[targetID]) {
              console.error(`[ERROR] Failed to fetch user info: ${err?.message || 'Unknown error'}`);
              reject(new Error('यूजर जानकारी लाने में असफल।'));
            } else {
              resolve(ret[targetID]);
            }
          });
        });
      } catch (err) {
        console.error(`[ERROR] User info error: ${err.message}`);
        return api.sendMessage(`⚠️ यूजर जानकारी लाने में गलती: ${err.message} 🕉️`, threadID);
      }

      const name = userInfo.name || 'Unknown User';
      console.log(`[DEBUG] User name: ${name}`);

      // Generate random elements
      const titles = [
        'VERIFIED', 'KING', 'QUEEN', 'RANDII', 'LAVDII', 'TATTA', 'CHOTA TATTA',
        'BDA TATTA', 'TATTO KA DOST', 'TATTO KA KAAL', 'TATTA KING', 'PORNSTAR',
        'MIA KHALIFA', 'SUNNYLEON', 'DENI DENIAL', 'MAHAMURKH', 'NAMOONA',
        'JOKAR', 'NOKAR', 'MAHISTMATI SHAMRAT', 'GULAAM', 'CHUTIYA',
        'CHUTIYO KA RAJA', 'MAHACHUTIYA', 'NO.1 CHUTIA', '2025 KA FYTR'
      ];
      const emojis = ['🀥', '🀣', '🀦', '🀧', '🀨', '✒️', '𓊆', '𓊇', '𓊈', '𓊉', '𓉘', '𓉝', '𓈖', '📝', '📜', '✍🏻', '🕹️'];
      const statuses = ['हैप्पी', 'सैड', 'सुसाइड करना चाहता है'];
      const selectedTitle = titles[Math.floor(Math.random() * titles.length)];
      const selectedEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      const selectedStatus = statuses[Math.floor(Math.random() * statuses.length)];
      const randomYear = Math.floor(Math.random() * (2025 - 2000 + 1)) + 2000;

      // Prepare message
      const message = `☆✼★━━━━━━━━━━━━★✼☆\n` +
                      `☞︎ @${name} का बायोडाटा तैयार है\n` +
                      `उपाधि: VERIFIED ${selectedTitle} ${selectedEmoji} (निकनेम: ${selectedTitle} ${selectedEmoji})\n` +
                      `उपाधि धारण किया: ${randomYear}\n` +
                      `प्रेजेंट में ${selectedStatus} उपाधि के कारण 🌟🔥.. ☜︎\n` +
                      `☆✼★━━━━━━━━━━━━★✼☆`;

      // Prepare mention
      const mentions = [{
        tag: `@${name}`,
        id: targetID,
        fromIndex: message.indexOf(`@${name}`)
      }];

      try {
        console.log('[DEBUG] Sending badge message with mention');
        await api.sendMessage({
          body: message,
          mentions: mentions
        }, threadID);
        console.log('[DEBUG] Badge message sent successfully');
      } catch (err) {
        console.error(`[ERROR] Failed to send badge message: ${err.message}`);
        return api.sendMessage(`⚠️ मैसेज भेजने में गलती: ${err.message} 🕉️`, threadID);
      }
    } catch (err) {
      console.error(`[ERROR] Badge command error: ${err.message}`);
      api.sendMessage(`❌ कमांड चलाने में गलती: ${err.message} 🕉️`, threadID);
    }
  }
};
