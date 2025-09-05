// ./commands/user/help.js
const fs = require('fs');

module.exports = {
  name: "help",
  aliases: ["commands"], // अगर कोई #commands यूज करे
  execute(api, threadID, args, event, botState, isMaster) {
    try {
      // डायनामिकली कमांड्स लोड करें
      const commands = new Map();
      const commandFolders = ['admin', 'user', 'master'];
      for (const folder of commandFolders) {
        const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
          try {
            const command = require(`../${folder}/${file}`);
            commands.set(command.name, command);
            if (command.aliases) {
              command.aliases.forEach(alias => commands.set(alias, command));
            }
          } catch (err) {
            console.error(`[ERROR] Failed to load command ${file} from ${folder}:`, err.message);
          }
        }
      }

      const prefix = botState.sessions[event.threadID]?.prefix || '#';
      const helpText = `
🛠️ 𝗕𝗢𝗧 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦 𝗠𝗘𝗡𝗨
━━━━━━━━━━━━━━━━━━━━
🔒 𝗔𝗱𝗺𝗶𝗻 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀 (केवल मास्टर/एडमिन)
• ${prefix}groupnamelock on/off <name> - ग्रुप का नाम लॉक/अनलॉक करें
• ${prefix}nicknamelock on/off <nickname> - सभी मेंबर्स का निकनेम लॉक/अनलॉक करें
• ${prefix}antiout on/off - Anti-out फीचर चालू/बंद करें
• ${prefix}kickout @user - यूजर को ग्रुप से निकालें
• ${prefix}unsend - रिप्लाई किए मैसेज को डिलीट करें
• ${prefix}send sticker start/stop - स्टिकर स्पैम शुरू/बंद करें (एलियास: ${prefix}stickerspam)
• ${prefix}autospam accept - ऑटो स्पैम मैसेजेस स्वीकार करें
• ${prefix}automessage accept - ऑटो मैसेज रिक्वेस्ट्स स्वीकार करें
• ${prefix}loder target on @user - यूजर को टारगेट करें (हर 2 मिनट में गालियां)
• ${prefix}loder stop - टारगेटिंग बंद करें
• ${prefix}autoconvo on/off - ऑटो कन्वर्सेशन चालू/बंद करें
• ${prefix}learn (trigger) {response} - बॉट को नया ट्रिगर-रिस्पॉन्स सिखाएं

🆔 𝗨𝘀𝗲𝗿 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀 (सभी के लिए)
• ${prefix}tid - ग्रुप का ID और नाम दिखाएं
• ${prefix}uid - अपना ID दिखाएं
• ${prefix}uid @mention - मेंशन किए यूजर का ID दिखाएं
• ${prefix}info @mention - यूजर की जानकारी दिखाएं
• ${prefix}groupinfo - ग्रुप की डिटेल्स दिखाएं (एलियास: ${prefix}group info)
• ${prefix}pair - दो रैंडम मेंबर्स को पेयर करें
• ${prefix}music <song name> - YouTube से गाना डाउनलोड करें
• ${prefix}help - सभी कमांड्स की लिस्ट दिखाएं (एलियास: ${prefix}commands)

👑 �_M𝗮𝘀𝘁𝗲𝗿 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀 (केवल मास्टर)
• ${prefix}stopall - सारे बॉट्स बंद करें
• ${prefix}status - एक्टिव बॉट्स की संख्या दिखाएं
• ${prefix}removeadmin <@user/uid> - एडमिन हटाएं
• ${prefix}masterid - मास्टर का प्रोफाइल लिंक दिखाएं
• ${prefix}mastercommand - मास्टर कमांड्स की लिस्ट दिखाएं
• ${prefix}listadmins - सभी एडमिन्स की लिस्ट दिखाएं
• ${prefix}list - एक्टिव यूजर IDs दिखाएं
• ${prefix}kick <userId> - खास यूजर का बॉट बंद करें
• ${prefix}addadmin <@user/uid> - नया एडमिन जोड़ें
━━━━━━━━━━━━━━━━━━━━
👑 𝗖𝗿𝗲𝗮𝘁𝗲𝗱 𝗕𝘆: ✶♡⤾➝SHALENDER X..⤹✶➺🪿🫨🩷🪽
📌 नोट: कुछ कमांड्स के लिए बॉट को ग्रुप में एडमिन परमिशन्स चाहिए।
      `;
      api.sendMessage(helpText, threadID);
    } catch (e) {
      console.error('[ERROR] help command error:', e.message);
      api.sendMessage('⚠️ Help कमांड में गलती।', threadID);
    }
  }
};
