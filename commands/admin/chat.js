module.exports = {
  name: 'chat',
  description: 'Toggle chat mode on or off (admin only)',
  aliases: ['chaton', 'chatoff'],
  execute: async (api, threadID, args, event, botState, isMaster, botID, stopBot) => {
    // डिबगिंग के लिए लॉग
    console.log('Chat command - SenderID:', event.senderID, 'isMaster:', isMaster, 'AdminList:', botState.adminList, 'Args:', args);

    // सिर्फ एडमिन या मास्टर के लिए
    if (!botState.adminList.includes(event.senderID) && !isMaster) {
      api.sendMessage('🚫 ये कमांड सिर्फ एडमिन्स या मास्टर के लिए है!', threadID);
      return;
    }

    // कमांड और aliases हैंडल करें
    const command = args[1] ? args[1].toLowerCase() : args[0].toLowerCase().replace('#', '');
    let chatState = botState.chatEnabled || { [threadID]: false }; // डिफॉल्ट स्टेट

    if (command === 'on' || command === 'chaton') {
      chatState[threadID] = true;
      api.sendMessage('✅ अब मैं एक्टिव हूँ! नॉर्मल बातचीत के लिए #ai या @bot के साथ मैसेज भेजो।', threadID);
    } else if (command === 'off' || command === 'chatoff') {
      chatState[threadID] = false;
      api.sendMessage('❌ मालिक, अब केवल कमांड्स वर्क करेंगी, मैं जवाब नहीं दूंगा।', threadID);
    } else {
      api.sendMessage('❓ यूज: #chat on या #chat off (या #chaton, #chatoff)', threadID);
      return;
    }

    botState.chatEnabled = chatState; // स्टेट अपडेट
    console.log('Chat state updated:', botState.chatEnabled);
  }
};
