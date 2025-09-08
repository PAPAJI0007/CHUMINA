const fs = require('fs');
const path = require('path');
const gTTS = require('gtts');

module.exports = {
  name: 'voice',
  description: 'Sends a voice message in Hindi.',
  async execute(api, threadID, args, event, botState, isMaster) {
    const text = args.slice(1).join(' ') || 'मैं हीरो हूँ';

    // 200 अक्षरों की लिमिट
    if (text.length > 200) {
      api.sendMessage('❌ टेक्स्ट ज्यादा लंबा है! 200 अक्षरों तक यूज करो।', threadID);
      return;
    }

    // "shalender" और इसके वैरिएंट्स को ब्लॉक करें
    const shalenderRegex = /sh[aeiou]*l[aeiou]*nd[aeiou]*r[a]*\b/i;
    if (shalenderRegex.test(text)) {
      api.sendMessage('👑 किंग किंग होता है, शेलेन्द्र हिन्दू किंग है! 👑🔥', threadID);
      return;
    }

    const audioPath = path.join(__dirname, `../../voice_${threadID}_${Date.now()}.mp3`);

    try {
      const gtts = new gTTS(text, 'hi');
      await new Promise((resolve, reject) => {
        gtts.save(audioPath, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      const message = {
        attachment: fs.createReadStream(audioPath)
      };
      await new Promise((resolve, reject) => {
        api.sendMessage(message, threadID, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    } catch (err) {
      api.sendMessage(`❌ वॉइस मैसेज भेजने में गलती हुई: ${err.message}`, threadID);
    } finally {
      // ऑडियो फाइल तुरंत डिलीट करें, चाहे सक्सेस हो या एरर
      if (fs.existsSync(audioPath)) {
        fs.unlink(audioPath, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting audio file:', unlinkErr.message);
        });
      }
    }
  }
};
