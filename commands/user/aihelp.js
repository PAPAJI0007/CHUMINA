module.exports = {
  name: "aihelp",
  description: "AI से बात करने का तरीका बताएगा",
  execute(api, threadID, args, event, botState, isMaster) {
    try {
      const helpText = `
🌟 AI HELP 🌟
━━━━━━━━━━━━━━━━━━━━
- AI से बात करने के लिए पहले #chat on कमांड यूज करें (सिर्फ एडमिन कर सकता है)।
- फिर #ai या @ai के साथ मैसेज भेजें, जैसे:
  - "#ai हाय भाई" या "@ai क्या हाल है"
- AI तभी जवाब देगा जब #chat on हो।
- #chat off करने पर AI बंद हो जाएगा, और केवल कमांड्स वर्क करेंगी।
━━━━━━━━━━━━━━━━━━━━
`;
      api.sendMessage(helpText, threadID);
    } catch (e) {
      console.error('[ERROR] aihelp कमांड में गलती:', e.message);
      api.sendMessage('⚠️ AI मदद लोड करने में गलती।', threadID);
    }
  }
};
