module.exports = {
  name: 'hotquote',
  description: 'Generate a random adult-funny quote with stylish touches 😎🔥',
  aliases: ['hotquote'],
  execute: async (api, threadID, args, event, botState, isMaster, botID, stopBot) => {
    console.log(`[DEBUG] hotquote called: threadID=${threadID}, args=${JSON.stringify(args)}`);
    try {
      const quotes = [
        'प्यार अंधा होता है, पर वासना 4K में देखती है! 😘',
        'दिल तो बच्चा है, पर मूड जोहनी सिंस वाला! 😎',
        'प्यार में धोखा खाया, अब Tinder पे माया! 😂',
        'ज़िंदगी छोटी है, रातें लंबी कर! 🔥',
        'दिल से दिल तक, बस सनी लियोन का ख्याल! 😜',
        'प्यार का तीर चला, पर टारगेट 18+! 😏',
        'भाई का स्टाइल, मिया खलीफा का जलवा! 😎',
        'दिल धड़कता है, पर मूड तो सैवेज है! 😈',
        'प्यार में पड़े, तो रातें जागे! 🔥',
        'ज़िंदगी है, तो थोड़ा मज़ा ले! 😘',
        'दिल का कनेक्शन, WiFi से तेज़! 😏',
        'प्यार का बुखार, रात में चढ़ता है! 🔥',
        'भाई का लुक, सनी लियोन को टक्कर! 😎',
        'दिल तोड़ने वाले, Tinder पे मिलेंगे! 😂',
        'प्यार का गाना, रात में बजाना! 😜',
        'ज़िंदगी है छोटी, रातें करो मोटी! 😈',
        'दिल की धड़कन, मिया खलीफा का फैन! 😘',
        'प्यार का डोज़, रात में ले लो! 🔥',
        'भाई का स्वैग, सनी लियोन का बैग! 😎',
        'दिल का रास्ता, 18+ का ट्विस्ट! 😏',
        'प्यार में गिरे, तो रात में उड़े! 😜',
        'ज़िंदगी का मज़ा, रात में आता है! 🔥',
        'दिल का इंजन, फुल स्पीड में! 😈',
        'प्यार का खेल, रात में खेल! 😘',
        'भाई का लुक, सैवेज हुक! 😎',
        'दिल की बात, रात में खुलती है! 🔥',
        'प्यार का नशा, रात में चढ़ता है! 😏',
        'ज़िंदगी का मज़ा, सनी लियोन के साथ! 😜',
        'दिल का स्टेटस, 18+ फुल मूड! 😈',
        'प्यार का जादू, रात में चालू! 🔥',
        'भाई का स्टाइल, मिया खलीफा का स्माइल! 😎',
        'दिल का कनेक्शन, रात का सेक्शन! 😘',
        'प्यार का रास्ता, थोड़ा टेढ़ा है! 😏',
        'ज़िंदगी का स्वाद, रात में चखो! 🔥',
        'दिल की धड़कन, सैवेज मूड में! 😈',
        'प्यार का बटन, रात में दबाओ! 😜',
        'भाई का जलवा, सनी लियोन का बलवा! 😎',
        'दिल का ड्रामा, रात में पूरा! 🔥',
        'प्यार का मज़ा, 18+ में आता है! 😘',
        'ज़िंदगी का खेल, रात में खेल! 😏',
        'दिल का स्टेटस, फुल सैवेज! 😈',
        'प्यार का तड़का, रात में लगाओ! 🔥',
        'भाई का मूड, मिया खलीफा का फूड! 😎',
        'दिल की बात, रात में चमक! 😘',
        'प्यार का तूफान, रात में आन! 😜',
        'ज़िंदगी का स्वैग, 18+ का बैग! 😈',
        'दिल का इशारा, रात में नजारा! 🔥',
        'प्यार का जादू, रात में बिखरू! 😏',
        'भाई का स्टाइल, सैवेज टाइप! 😎',
        'दिल का रास्ता, रात का ट्विस्ट! 😘',
        'प्यार का मज़ा, रात में ताज़ा! 🔥',
        'ज़िंदगी का नशा, 18+ में बजा! 😜',
        'दिल की धड़कन, सनी लियोन का फैन! 😎',
        'प्यार का खेल, रात में तेज़! 😈',
        'भाई का जलवा, रात में बलवा! 🔥',
        'दिल का मज़ा, 18+ का राज़! 😘',
        'प्यार का स्टेटस, रात में एक्सप्रेस! 😏',
        'ज़िंदगी का तड़का, रात में चमका! 🔥',
        'दिल का कनेक्शन, सैवेज सेक्शन! 😎'
      ];
      const decorativeLines = ['✨===✨', '🌟~~~🌟', '🔥---🔥', '⚡***⚡', '🦁~~~🦁', '💫===💫', '🌈---🌈'];
      const emojiSets = ['🌟🔥', '⚡🌈', '🦁😎', '🌸✨', '🔥🎉', '🌟🚀', '💥🌹'];
      const salutations = [
        'आ गया!',
        'हाजिर है!',
        'धमाका करेगा!',
        'तगड़ा कोट!',
        'चेक करो!'
      ];

      const selectedQuote = quotes[Math.floor(Math.random() * quotes.length)];
      const selectedDecorativeLine = decorativeLines[Math.floor(Math.random() * decorativeLines.length)];
      const selectedSalutation = salutations[Math.floor(Math.random() * salutations.length)];
      const selectedEmojiSet = emojiSets[Math.floor(Math.random() * emojiSets.length)];

      console.log(`[DEBUG] Selected quote: ${selectedQuote}, decorative line: ${selectedDecorativeLine}, salutation: ${selectedSalutation}, emoji set: ${selectedEmojiSet}`);
      const message = `${selectedDecorativeLine}\n` +
                     `☞︎ हॉट कोट ${selectedSalutation}\n` +
                     `कोट: ${selectedQuote}\n` +
                     `${selectedEmojiSet}\n` +
                     `${selectedDecorativeLine}`;

      try {
        console.log('[DEBUG] Sending hotquote message');
        await api.sendMessage(message, threadID);
        console.log('[DEBUG] Hotquote message sent successfully');
      } catch (err) {
        console.error(`[ERROR] Failed to send hotquote message: ${err.message}`);
        return api.sendMessage(`⚠️ मैसेज भेजने में गलती: ${err.message} 🕉️`, threadID);
      }
    } catch (err) {
      console.error(`[ERROR] Hotquote command error: ${err.message}`);
      api.sendMessage(`❌ कमांड चलाने में गलती: ${err.message} 🕉️`, threadID);
    }
  }
};
