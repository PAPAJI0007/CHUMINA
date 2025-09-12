const messageStore = require('../../utils/messageStore');

module.exports = {
  name: "unsend",
  execute(api, threadID, args, event, botState, isMaster, botID) {
    console.log(`[DEBUG] unsend called: threadID=${threadID}, senderID=${event.senderID}, botID=${botID}, hasReply=${!!event.messageReply}, replyMessageID=${event.messageReply?.messageID}`);
    try {
      // Check if sender is master or admin
      if (!isMaster && !botState.adminList.includes(event.senderID)) {
        console.log(`[DEBUG] Sender ${event.senderID} is not master or admin`);
        api.sendMessage('🚫 केवल मास्टर या एडमिन इस कमांड को यूज कर सकते हैं।', threadID);
        return;
      }

      // Confirm botID is valid
      if (!botID) {
        console.error('[ERROR] Bot ID not found');
        api.sendMessage('⚠️ बॉट ID नहीं मिला। कृपया बॉट को रीस्टार्ट करें।', threadID);
        return;
      }

      // Check if bot has admin permissions
      api.getThreadInfo(threadID, (err, info) => {
        if (err) {
          console.error('[ERROR] Failed to fetch thread info:', err.message);
          api.sendMessage('⚠️ ग्रुप जानकारी लाने में गलती।', threadID);
          return;
        }

        // Robust admin check using Array.isArray
        const isBotAdmin = Array.isArray(info.adminIDs) && info.adminIDs.some(admin => admin.id === botID);
        if (!isBotAdmin) {
          console.log(`[DEBUG] Bot (ID: ${botID}) is not admin in thread ${threadID}`);
          api.sendMessage('मालिक, मुझे एडमिन बनाओ ताकि मैं मैसेज डिलीट कर सकूं! 🙏', threadID);
          return;
        }

        let targetMessage;
        // Check if command is replying to a bot message
        if (event.messageReply && event.messageReply.senderID === botID) {
          targetMessage = messageStore.getBotMessageByReply(event.messageReply.messageID);
          console.log(`[DEBUG] Reply message check: targetMessage=${JSON.stringify(targetMessage)}`);
          if (!targetMessage) {
            targetMessage = messageStore.botMessages.find(msg => msg.messageID === event.messageReply.messageID);
            console.log(`[DEBUG] Fallback reply message check: targetMessage=${JSON.stringify(targetMessage)}`);
          }
        }

        // Fallback to last bot message if no reply or invalid reply
        if (!targetMessage) {
          targetMessage = messageStore.getLastBotMessage(threadID);
          console.log(`[DEBUG] Last bot message check: targetMessage=${JSON.stringify(targetMessage)}`);
        }

        if (!targetMessage) {
          console.log(`[DEBUG] No bot message found for threadID=${threadID}`);
          api.sendMessage('❌ कोई हाल का बॉट मैसेज नहीं मिला।', threadID);
          return;
        }

        api.unsendMessage(targetMessage.messageID, (err) => {
          if (err) {
            console.error('[ERROR] Unsend failed:', err.message);
            api.sendMessage(`❌ मैसेज डिलीट करने में गलती: ${err.message} (शायद 10 मिनट से पुराना है)।`, threadID);
            return;
          }
          api.sendMessage(`मालिक, मैंने मैसेज डिलीट कर दिया: "${targetMessage.content.slice(0, 50)}..." 🙏`, threadID);
          // Remove from store
          messageStore.botMessages = messageStore.botMessages.filter(msg => msg.messageID !== targetMessage.messageID);
          console.log(`[DEBUG] Removed message from store: messageID=${targetMessage.messageID}`);
        });
      });
    } catch (e) {
      console.error('[ERROR] unsend error:', e.message);
      api.sendMessage('⚠️ अनसेंड कमांड में गलती।', threadID);
    }
  }
};
