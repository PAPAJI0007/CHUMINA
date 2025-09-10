module.exports = {
  name: "aihelp",
  description: "AI से बात करने का तरीका बताएगा",
  execute(api, threadID, args, event, botState, isMaster) {
    try {
      const helpText = `
🌟 किंग का AI हेल्प 🌟
━━━━━━━━━━━━━━━━━━━━
🔥 AI से बात करने का तरीका:
1. पहले #chat on करो (सिर्फ एडमिन/मास्टर कर सकता है)।
2. फिर #ai या @ai के साथ सवाल पूछो, जैसे:
   - #ai हाय भाई, क्या हाल है? 😎
   - @ai जय श्री राम, कोई मूवी सुझाओ! 🚩
3. AI तभी जवाब देगा जब #chat on हो।
4. #chat off करो, तो AI बंद हो जाएगा, और सिर्फ कमांड्स काम करेंगे।
📜 नोट: किंग के नियमों का पालन करो! 🕉️ एक मिनट में सिर्फ एक सवाल पूछ सकते हो, ताकि किंग की महानता पर विचार कर सको। 🌟 जय श्री राम! 🙏
━━━━━━━━━━━━━━━━━━━━
`;
      api.sendMessage(helpText, threadID);
    } catch (e) {
      console.error('[ERROR] aihelp कमांड में गलती:', e.message);
      api.sendMessage('⚠️ किंग का AI हेल्प लोड करने में गड़बड़! फिर से ट्राई करो। 🕉️', threadID);
    }
  }
};
