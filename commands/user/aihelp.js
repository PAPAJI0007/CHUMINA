module.exports = {
  name: "aihelp",
  description: "AI से बात करने का तरीका बताएगा",
  execute(api, threadID, args, event, botState, isMaster) {
    try {
      const helpText = `
🌟 किंग का AI हेल्प 🌟
━━━━━━━━━━━━━━━━━━━━
🔥 किंग के AI से बात करो!
1. पहले #chat on करो (सिर्फ एडमिन/मास्टर)।
2. फिर #ai या @ai के साथ सवाल पूछो, जैसे:
   - #ai भाई, क्या हाल है? 😎
   - @ai कोई मज़ेदार जोक सुनाओ!
3. AI जवाब देगा, जब #chat on हो।
4. #chat off करो, तो AI चुप, सिर्फ कमांड्स चालू!
📜 नोट: एक मिनट में एक सवाल, किंग का नियम है! 😎 जवाब का मज़ा लो! 🌟
━━━━━━━━━━━━━━━━━━━━
`;
      api.sendMessage(helpText, threadID);
    } catch (e) {
      console.error('[ERROR] aihelp कमांड में गलती:', e.message);
      api.sendMessage('⚠️ किंग का AI हेल्प लोड करने में गड़बड़! फिर ट्राई करो। 🌟', threadID);
    }
  }
};
