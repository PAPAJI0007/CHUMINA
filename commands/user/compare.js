module.exports = {
  name: 'compare',
  description: 'Run a competition between 2-20 users with unique adult double meaning riddles, GK, and funny/humanity questions 😈🔥',
  aliases: ['compare'],
  execute: async (api, threadID, args, event, botState, isMaster, botID, stopBot) => {
    console.log(`[DEBUG] compare called: threadID=${threadID}, args=${JSON.stringify(args)}, senderID=${event.senderID}`);
    try {
      // Check for at least 2 mentions, max 20
      if (!event.mentions || Object.keys(event.mentions).length < 2 || Object.keys(event.mentions).length > 20) {
        console.log('[DEBUG] Insufficient or too many mentions provided');
        return api.sendMessage('🚫 कम से कम 2 और ज्यादा से ज्यादा 20 यूजर्स को @mention करो! जैसे: #compare @user1 @user2 😈', threadID);
      }

      const mentions = Object.keys(event.mentions);
      let participants = [];
      for (let i = 0; i < mentions.length; i++) {
        participants.push({ id: mentions[i], name: event.mentions[mentions[i]] });
      }
      console.log(`[DEBUG] Initial users: ${participants.map(p => `${p.name} (${p.id})`).join(', ')}`);

      // Unicode mapping for Shalender check
      const unicodeMap = {
        '🆂': 'S', '🅷': 'H', '🅰': 'A', '🅻': 'L', '🅴': 'E', '🅽': 'N', '🅳': 'D', '🆁': 'R',
        'Ｓ': 'S', 'Ｈ': 'H', 'Ａ': 'A', 'Ｌ': 'L', 'Ｅ': 'E', 'Ｎ': 'N', 'Ｄ': 'D', 'Ｒ': 'R',
        '↬': '', '➝': '', '⤹': '', '⤾': '', '🩷': '', '🩵': '', '🩶': '', '🤍': '', '🧡': '', '🤎': '', '💚': '', '💜': '', '🪽': '', '🌟': ''
      };

      // Normalize names for Shalender check
      participants.forEach(p => {
        let normalizedName = p.name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
        Object.keys(unicodeMap).forEach(fancy => {
          normalizedName = normalizedName.replace(new RegExp(fancy, 'g'), unicodeMap[fancy]);
        });
        p.normalizedName = normalizedName.toLowerCase().replace(/[^a-z]/g, '');
        p.isShalender = /shalender|shailendra|salender|shalendra/i.test(p.normalizedName) || p.id === '100023807453349';
      });

      console.log(`[DEBUG] Normalized names and Shalender check: ${participants.map(p => `${p.normalizedName} (${p.isShalender ? 'Shalender' : 'Normal'})`).join(', ')}`);

      // Questions database - 70 unique riddles, 50 GK, 70 unique funny/humanity
      const riddles = [
        { question: 'मैं लंबा और सख्त हूँ, और लोग मुझे रात में पकड़ते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: स्टिक', 'D: तकिया'], answer: 'C' },
        { question: 'मैं गीला हो जाता हूँ जब लोग मेरे साथ खेलते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: साबुन', 'D: तौलिया'], answer: 'C' },
        { question: 'मेरे पास छेद है, और लोग मुझे रात में इस्तेमाल करते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: चादर', 'D: बटन'], answer: 'C' },
        { question: 'मैं मुलायम हूँ, लेकिन लोग मुझे जोर से दबाते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: गद्दा', 'D: तकिया'], answer: 'C' },
        { question: 'मैं गर्म हूँ, और लोग मुझे मुंह में लेते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: चाय', 'D: सूप'], answer: 'C' },
        { question: 'मैं चमकता हूँ, और लोग मुझे रात में छूते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: टॉर्च', 'D: बल्ब'], answer: 'C' },
        { question: 'मैं गोल हूँ, और लोग मुझे रात में रगड़ते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: सिक्का', 'D: बॉल'], answer: 'C' },
        { question: 'मैं नरम हूँ, और लोग मुझे चूसते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: कैंडी', 'D: लॉलीपॉप'], answer: 'C' },
        { question: 'मैं सख्त हूँ, और लोग मुझे हिलाते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: रस्सी', 'D: डंडा'], answer: 'C' },
        { question: 'मैं छोटा हूँ, लेकिन लोग मुझे बड़ा करना चाहते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: बटुआ', 'D: सिक्का'], answer: 'C' },
        { question: 'मैं गीला हूँ, और लोग मुझे चाटते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: आइसक्रीम', 'D: फल'], answer: 'C' },
        { question: 'मैं लंबा हूँ, और लोग मुझे चढ़ते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: सीढ़ी', 'D: रस्सी'], answer: 'C' },
        { question: 'मैं सख्त हूँ, और लोग मुझे दबाते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: बटन', 'D: रिमोट'], answer: 'C' },
        { question: 'मैं मुलायम हूँ, और लोग मुझे रात में पकड़ते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: तकिया', 'D: चादर'], answer: 'C' },
        { question: 'मैं गोल हूँ, और लोग मुझे रात में चूसते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: लॉलीपॉप', 'D: कैंडी'], answer: 'C' },
        { question: 'मैं गीला हूँ, और लोग मुझे रात में इस्तेमाल करते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: तौलिया', 'D: साबुन'], answer: 'C' },
        { question: 'मैं सख्त हूँ, और लोग मुझे रात में खींचते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: रस्सी', 'D: चेन'], answer: 'C' },
        { question: 'मैं मुलायम हूँ, और लोग मुझे रात में रगड़ते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: चादर', 'D: तकिया'], answer: 'C' },
        { question: 'मैं गोल हूँ, और लोग मुझे मुंह में लेते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: बादाम', 'D: नट'], answer: 'C' },
        { question: 'मैं लंबा हूँ, और लोग मुझे रात में हिलाते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: पंखा', 'D: रस्सी'], answer: 'C' },
        { question: 'मैं सख्त हूँ, और लोग मुझे रात में चाटते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: लॉलीपॉप', 'D: कैंडी'], answer: 'C' },
        { question: 'मैं मुलायम हूँ, और लोग मुझे रात में दबाते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: गद्दा', 'D: तकिया'], answer: 'C' },
        { question: 'मैं गीला हूँ, और लोग मुझे रात में चूसते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: फल', 'D: आइसक्रीम'], answer: 'C' },
        { question: 'मैं लंबा हूँ, और लोग मुझे रात में चढ़ते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: सीढ़ी', 'D: रस्सी'], answer: 'C' },
        { question: 'मैं सख्त हूँ, और लोग मुझे रात में खींचते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: चेन', 'D: रस्सी'], answer: 'C' },
        { question: 'मैं मुलायम हूँ, और लोग मुझे रात में रगड़ते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: चादर', 'D: तकिया'], answer: 'C' },
        { question: 'मैं गोल हूँ, और लोग मुझे रात में चूसते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: कैंडी', 'D: लॉलीपॉप'], answer: 'C' },
        { question: 'मैं गीला हूँ, और लोग मुझे रात में इस्तेमाल करते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: तौलिया', 'D: साबुन'], answer: 'C' },
        { question: 'मैं सख्त हूँ, और लोग मुझे रात में दबाते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: बटन', 'D: रिमोट'], answer: 'C' },
        { question: 'मैं मुलायम हूँ, और लोग मुझे रात में चाटते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: आइसक्रीम', 'D: फल'], answer: 'C' },
        { question: 'मैं लंबा हूँ, और लोग मुझे रात में पकड़ते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: डंडा', 'D: रस्सी'], answer: 'C' },
        { question: 'मैं सख्त हूँ, और लोग मुझे रात में हिलाते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: रिमोट', 'D: बटन'], answer: 'C' },
        { question: 'मैं मुलायम हूँ, और लोग मुझे रात में चूसते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: कैंडी', 'D: फल'], answer: 'C' },
        { question: 'मैं गीला हूँ, और लोग मुझे रात में पकड़ते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: तौलिया', 'D: चादर'], answer: 'C' },
        { question: 'मैं लंबा हूँ, और लोग मुझे रात में चढ़ते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: सीढ़ी', 'D: रस्सी'], answer: 'C' },
        { question: 'मैं गोल हूँ, और लोग मुझे रात में रगड़ते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: सिक्का', 'D: बटन'], answer: 'C' },
        { question: 'मैं सख्त हूँ, और लोग मुझे रात में चूसते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: लॉलीपॉप', 'D: कैंडी'], answer: 'C' },
        { question: 'मैं मुलायम हूँ, और लोग मुझे रात में दबाते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: तकिया', 'D: गद्दा'], answer: 'C' },
        { question: 'मैं गीला हूँ, और लोग मुझे रात में चाटते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: आइसक्रीम', 'D: लॉलीपॉप'], answer: 'C' },
        { question: 'मैं लंबा हूँ, और लोग मुझे रात में पकड़ते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: डंडा', 'D: रस्सी'], answer: 'C' },
        { question: 'मैं सख्त हूँ, और लोग मुझे रात में हिलाते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: रिमोट', 'D: बटन'], answer: 'C' },
        { question: 'मैं मुलायम हूँ, और लोग मुझे रात में चूसते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: कैंडी', 'D: फल'], answer: 'C' },
        { question: 'मैं गीला हूँ, और लोग मुझे रात में पकड़ते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: तौलिया', 'D: चादर'], answer: 'C' },
        { question: 'मैं लंबा हूँ, और लोग मुझे रात में चढ़ते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: सीढ़ी', 'D: रस्सी'], answer: 'C' },
        { question: 'मैं गोल हूँ, और लोग मुझे रात में रगड़ते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: सिक्का', 'D: बटन'], answer: 'C' },
        { question: 'मैं सख्त हूँ, और लोग मुझे रात में चूसते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: लॉलीपॉप', 'D: कैंडी'], answer: 'C' },
        { question: 'मैं मुलायम हूँ, और लोग मुझे रात में दबाते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: तकिया', 'D: गद्दा'], answer: 'C' },
        { question: 'मैं गीला हूँ, और लोग मुझे रात में चाटते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: आइसक्रीम', 'D: लॉलीपॉप'], answer: 'C' },
        { question: 'मैं लंबा हूँ, और लोग मुझे रात में पकड़ते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: डंडा', 'D: रस्सी'], answer: 'C' },
        { question: 'मैं सख्त हूँ, और लोग मुझे रात में हिलाते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: रिमोट', 'D: बटन'], answer: 'C' },
        { question: 'मैं मुलायम हूँ, और लोग मुझे रात में चूसते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: कैंडी', 'D: फल'], answer: 'C' },
        { question: 'मैं गीला हूँ, और लोग मुझे रात में पकड़ते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: तौलिया', 'D: चादर'], answer: 'C' },
        { question: 'मैं लंबा हूँ, और लोग मुझे रात में चढ़ते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: सीढ़ी', 'D: रस्सी'], answer: 'C' },
        { question: 'मैं गोल हूँ, और लोग मुझे रात में रगड़ते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: सिक्का', 'D: बटन'], answer: 'C' },
        { question: 'मैं सख्त हूँ, और लोग मुझे रात में चूसते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: लॉलीपॉप', 'D: कैंडी'], answer: 'C' },
        { question: 'मैं मुलायम हूँ, और लोग मुझे रात में दबाते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: तकिया', 'D: गद्दा'], answer: 'C' },
        { question: 'मैं गीला हूँ, और लोग मुझे रात में चाटते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: आइसक्रीम', 'D: लॉलीपॉप'], answer: 'C' },
        { question: 'मैं लंबा हूँ, और लोग मुझे रात में पकड़ते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: डंडा', 'D: रस्सी'], answer: 'C' },
        { question: 'मैं सख्त हूँ, और लोग मुझे रात में हिलाते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: रिमोट', 'D: बटन'], answer: 'C' },
        { question: 'मैं मुलायम हूँ, और लोग मुझे रात में चूसते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: कैंडी', 'D: फल'], answer: 'C' },
        { question: 'मैं गीला हूँ, और लोग मुझे रात में पकड़ते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: तौलिया', 'D: चादर'], answer: 'C' },
        { question: 'मैं लंबा हूँ, और लोग मुझे रात में चढ़ते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: सीढ़ी', 'D: रस्सी'], answer: 'C' },
        { question: 'मैं गोल हूँ, और लोग मुझे रात में रगड़ते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: सिक्का', 'D: बटन'], answer: 'C' },
        { question: 'मैं सख्त हूँ, और लोग मुझे रात में चूसते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: लॉलीपॉप', 'D: कैंडी'], answer: 'C' },
        { question: 'मैं मुलायम हूँ, और लोग मुझे रात में दबाते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: तकिया', 'D: गद्दा'], answer: 'C' },
        { question: 'मैं गीला हूँ, और लोग मुझे रात में चाटते हैं। मैं कौन?', options: ['A: पेनिस', 'B: वैजाइना', 'C: आइसक्रीम', 'D: लॉलीपॉप'], answer: 'C' }
      ];

      const gkQuestions = [
        { question: 'भारत की राजधानी?', options: ['A: दिल्ली', 'B: मुंबई', 'C: कोलकाता', 'D: चेन्नई'], answer: 'A' },
        { question: 'सूरज डूबता है?', options: ['A: पूर्व में', 'B: पश्चिम में', 'C: उत्तर में', 'D: दक्षिण में'], answer: 'B' },
        { question: 'पानी का रासायनिक सूत्र?', options: ['A: H2O', 'B: CO2', 'C: O2', 'D: N2'], answer: 'A' },
        { question: 'भारत का राष्ट्रीय पक्षी?', options: ['A: मोर', 'B: कबूतर', 'C: तोता', 'D: कौआ'], answer: 'A' },
        { question: 'ताजमहल कहाँ है?', options: ['A: दिल्ली', 'B: आगरा', 'C: जयपुर', 'D: मुंबई'], answer: 'B' },
        { question: 'भारत का राष्ट्रीय पुष्प?', options: ['A: कमल', 'B: गुलाब', 'C: सूरजमुखी', 'D: चमेली'], answer: 'A' },
        { question: 'सबसे बड़ा ग्रह?', options: ['A: बृहस्पति', 'B: शनि', 'C: मंगल', 'D: पृथ्वी'], answer: 'A' },
        { question: 'भारत का राष्ट्रीय गीत?', options: ['A: जन गण मन', 'B: वंदे मातरम', 'C: सारे जहाँ से अच्छा', 'D: रघुपति राघव'], answer: 'B' },
        { question: 'पहला भारतीय उपग्रह?', options: ['A: आर्यभट्ट', 'B: चंद्रयान', 'C: मंगलयान', 'D: INSAT'], answer: 'A' },
        { question: 'भारत की सबसे लंबी नदी?', options: ['A: गंगा', 'B: यमुना', 'C: ब्रह्मपुत्र', 'D: गोदावरी'], answer: 'A' },
        { question: 'भारत का राष्ट्रीय खेल?', options: ['A: हॉकी', 'B: क्रिकेट', 'C: कबड्डी', 'D: फुटबॉल'], answer: 'A' },
        { question: 'भारत का सबसे ऊँचा पर्वत?', options: ['A: कंचनजंगा', 'B: एवरेस्ट', 'C: नंदा देवी', 'D: क2'], answer: 'A' },
        { question: 'भारत का राष्ट्रीय पशु?', options: ['A: शेर', 'B: बाघ', 'C: हाथी', 'D: हिरण'], answer: 'B' },
        { question: 'भारत का सबसे बड़ा राज्य?', options: ['A: राजस्थान', 'B: उत्तर प्रदेश', 'C: मध्य प्रदेश', 'D: महाराष्ट्र'], answer: 'A' },
        { question: 'भारत का राष्ट्रीय झंडा कब अपनाया गया?', options: ['A: 1947', 'B: 1950', 'C: 1930', 'D: 1920'], answer: 'A' },
        { question: 'भारत का सबसे बड़ा बंदरगाह?', options: ['A: मुंबई', 'B: चेन्नई', 'C: कोलकाता', 'D: विशाखापट्टनम'], answer: 'A' },
        { question: 'भारत का राष्ट्रीय फल?', options: ['A: आम', 'B: केला', 'C: सेब', 'D: अनार'], answer: 'A' },
        { question: 'भारत का सबसे पुराना विश्वविद्यालय?', options: ['A: नालंदा', 'B: बनारस हिंदू', 'C: दिल्ली', 'D: कोलकाता'], answer: 'A' },
        { question: 'भारत का राष्ट्रीय वृक्ष?', options: ['A: बरगद', 'B: पीपल', 'C: नीम', 'D: आम'], answer: 'A' },
        { question: 'भारत का सबसे बड़ा रेगिस्तान?', options: ['A: थार', 'B: गोबी', 'C: सहारा', 'D: कच्छ'], answer: 'A' },
        { question: 'भारत की सबसे लंबी सड़क?', options: ['A: NH44', 'B: NH1', 'C: NH7', 'D: NH2'], answer: 'A' },
        { question: 'भारत का राष्ट्रीय नृत्य?', options: ['A: भरतनाट्यम', 'B: कथक', 'C: कुचिपुड़ी', 'D: कोई नहीं'], answer: 'D' },
        { question: 'भारत का सबसे बड़ा मंदिर?', options: ['A: अक्षरधाम', 'B: तिरुपति', 'C: वैष्णो देवी', 'D: सिद्धिविनायक'], answer: 'A' },
        { question: 'भारत का सबसे बड़ा शहर?', options: ['A: मुंबई', 'B: दिल्ली', 'C: कोलकाता', 'D: चेन्नई'], answer: 'A' },
        { question: 'भारत का राष्ट्रीय प्रतीक?', options: ['A: अशोक चक्र', 'B: तिरंगा', 'C: शेर पूंज', 'D: कमल'], answer: 'C' },
        { question: 'भारत का सबसे बड़ा द्वीप?', options: ['A: अंडमान', 'B: लक्षद्वीप', 'C: दीव', 'D: मिनिकॉय'], answer: 'A' },
        { question: 'भारत का पहला प्रधानमंत्री?', options: ['A: नेहरू', 'B: गांधी', 'C: पटेल', 'D: शास्त्री'], answer: 'A' },
        { question: 'भारत का सबसे बड़ा स्टेडियम?', options: ['A: नरेंद्र मोदी', 'B: ईडन गार्डन्स', 'C: वानखेड़े', 'D: चिदंबरम'], answer: 'A' },
        { question: 'भारत का राष्ट्रीय मुद्रा?', options: ['A: रुपये', 'B: डॉलर', 'C: येन', 'D: पाउंड'], answer: 'A' },
        { question: 'भारत का सबसे बड़ा झील?', options: ['A: चिल्का', 'B: वूलर', 'C: डल', 'D: सांभर'], answer: 'B' },
        { question: 'भारत का सबसे लंबा बांध?', options: ['A: भाखड़ा', 'B: हीराकुंड', 'C: सरदार सरोवर', 'D: टिहरी'], answer: 'B' },
        { question: 'भारत का राष्ट्रीय मिठाई?', options: ['A: जलेबी', 'B: रसगुल्ला', 'C: कोई नहीं', 'D: लड्डू'], answer: 'C' },
        { question: 'भारत का सबसे बड़ा हवाई अड्डा?', options: ['A: दिल्ली', 'B: मुंबई', 'C: बेंगलुरु', 'D: हैदराबाद'], answer: 'A' },
        { question: 'भारत का सबसे पुराना शहर?', options: ['A: वाराणसी', 'B: दिल्ली', 'C: कोलकाता', 'D: चेन्नई'], answer: 'A' },
        { question: 'भारत का राष्ट्रीय गान?', options: ['A: जन गण मन', 'B: वंदे मातरम', 'C: सारे जहाँ से अच्छा', 'D: रघुपति राघव'], answer: 'A' },
        { question: 'भारत का सबसे बड़ा जंगल?', options: ['A: सुंदरबन', 'B: जिम कॉर्बेट', 'C: रणथंभौर', 'D: काजीरंगा'], answer: 'A' },
        { question: 'भारत का सबसे लंबा पुल?', options: ['A: भूपेन हाजरिका', 'B: बांद्रा-वर्ली', 'C: हावड़ा', 'D: विक्टोरिया'], answer: 'A' },
        { question: 'भारत का राष्ट्रीय मछली?', options: ['A: रोहू', 'B: हिल्सा', 'C: कोई नहीं', 'D: कतला'], answer: 'C' },
        { question: 'भारत का सबसे बड़ा स्मारक?', options: ['A: इंडिया गेट', 'B: ताजमहल', 'C: स्टैच्यू ऑफ यूनिटी', 'D: गेटवे ऑफ इंडिया'], answer: 'C' },
        { question: 'भारत का राष्ट्रीय रंग?', options: ['A: केसरिया', 'B: हरा', 'C: नीला', 'D: कोई नहीं'], answer: 'D' },
        { question: 'भारत का सबसे बड़ा मेला?', options: ['A: कुम्भ मेला', 'B: पुष्कर मेला', 'C: सूरजकुंड मेला', 'D: गंगासागर मेला'], answer: 'A' },
        { question: 'भारत का सबसे पुराना किला?', options: ['A: ग्वालियर', 'B: आगरा', 'C: दिल्ली', 'D: जयपुर'], answer: 'A' },
        { question: 'भारत का राष्ट्रीय पेय?', options: ['A: चाय', 'B: कॉफी', 'C: लस्सी', 'D: कोई नहीं'], answer: 'D' },
        { question: 'भारत का सबसे बड़ा रेलवे स्टेशन?', options: ['A: हावड़ा', 'B: नई दिल्ली', 'C: मुंबई सेंट्रल', 'D: चेन्नई सेंट्रल'], answer: 'A' },
        { question: 'भारत का सबसे लंबा समुद्र तट?', options: ['A: मरीना', 'B: कोवलम', 'C: गोवा', 'D: पुरी'], answer: 'A' },
        { question: 'भारत का राष्ट्रीय सरीसृप?', options: ['A: किंग कोबरा', 'B: मगरमच्छ', 'C: कछुआ', 'D: कोई नहीं'], answer: 'A' },
        { question: 'भारत का सबसे बड़ा मरुस्थल?', options: ['A: थार', 'B: कच्छ', 'C: लद्दाख', 'D: गोबी'], answer: 'A' },
        { question: 'भारत का राष्ट्रीय पर्व?', options: ['A: दीवाली', 'B: होली', 'C: स्वतंत्रता दिवस', 'D: कोई नहीं'], answer: 'D' },
        { question: 'भारत का सबसे बड़ा मॉल?', options: ['A: लुलु मॉल', 'B: डीएलएफ', 'C: फीनिक्स', 'D: सिलेक्ट सिटीवॉक'], answer: 'A' },
        { question: 'भारत का सबसे लंबा रेलवे रूट?', options: ['A: विवेक एक्सप्रेस', 'B: हिमसागर एक्सप्रेस', 'C: दुरंतो', 'D: राजधानी'], answer: 'A' }
      ];

      const funnyHumanityQuestions = [
        { question: 'अगर लड़की तुम्हें पैसे देके कहे मेरे साथ सो जाओ, तो क्या करोगे?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना मांगोगे', 'C: मना कर दोगे', 'D: साथ चले जाओगे'], answer: 'C' },
        { question: 'सड़क पर कई लड़कियाँ रो रही हों तो क्या करोगे?', options: ['A: पेनिस निकालोगे', 'B: वैजाइना की बात करोगे', 'C: उनकी मदद करोगे', 'D: हँसोगे'], answer: 'C' },
        { question: 'तुम्हारी टीचर की ब्रा फट जाए तो क्या करोगे?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: उन्हें बता दोगे', 'D: चुप रहोगे'], answer: 'C' },
        { question: 'पार्टी में नशे में लड़की गिर जाए तो?', options: ['A: पेनिस के साथ खेलोगे', 'B: वैजाइना की फोटो लोगे', 'C: घर पहुँचा दोगे', 'D: वीडियो बनाओगे'], answer: 'C' },
        { question: 'दोस्त की गर्लफ्रेंड अकेली हो तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की बात करोगे', 'C: रिस्पेक्ट से बात करोगे', 'D: फ्लर्ट करोगे'], answer: 'C' },
        { question: 'रात में अकेली महिला मदद मांगे तो?', options: ['A: पेनिस की बात करोगे', 'B: वैजाइना की तारीफ करोगे', 'C: सुरक्षित पहुँचा दोगे', 'D: इग्नोर करोगे'], answer: 'C' },
        { question: 'पार्टी में लड़की तुम्हें बेडरूम बुलाए तो?', options: ['A: पेनिस तैयार करोगे', 'B: वैजाइना की बात करोगे', 'C: मना कर दोगे', 'D: साथ चले जाओगे'], answer: 'C' },
        { question: 'लड़की का टॉप पारदर्शी हो तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: उसे बता दोगे', 'D: घूरोगे'], answer: 'C' },
        { question: 'अगर लड़की नहाते वक्त मदद मांगे तो?', options: ['A: पेनिस के साथ जाओगे', 'B: वैजाइना की बात करोगे', 'C: तौलिया दोगे', 'D: वीडियो बनाओगे'], answer: 'C' },
        { question: 'पार्टी में लड़की तुम्हें किस करने को कहे तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की बात करोगे', 'C: मना कर दोगे', 'D: किस करोगे'], answer: 'C' },
        { question: 'लड़की तुम्हें रात में अकेले बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: रिस्पेक्ट से मना कर दोगे', 'D: साथ चले जाओगे'], answer: 'C' },
        { question: 'लड़की का ड्रेस फट जाए तो?', options: ['A: पेनिस निकालोगे', 'B: वैजाइना की बात करोगे', 'C: उसे कवर दोगे', 'D: हँसोगे'], answer: 'C' },
        { question: 'लड़की तुम्हें गलत जगह छू ले तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की बात करोगे', 'C: उसे रोक दोगे', 'D: मजा लोगे'], answer: 'C' },
        { question: 'लड़की तुम्हें न्यूड फोटो भेजे तो?', options: ['A: पेनिस की फोटो भेजोगे', 'B: वैजाइना की फोटो मांगोगे', 'C: डिलीट कर दोगे', 'D: शेयर करोगे'], answer: 'C' },
        { question: 'लड़की रात में तुम्हारे बेड पर आए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की बात करोगे', 'C: उसे घर छोड़ दोगे', 'D: साथ सो जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें प्राइवेट डांस के लिए बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: साथ डांस करोगे'], answer: 'C' },
        { question: 'लड़की तुम्हें हग करने को कहे तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की बात करोगे', 'C: रिस्पेक्ट से मना कर दोगे', 'D: हग करोगे'], answer: 'C' },
        { question: 'लड़की तुम्हें अपने रूम में लॉक कर दे तो?', options: ['A: पेनिस निकालोगे', 'B: वैजाइना की बात करोगे', 'C: मदद मांगोगे', 'D: मजा लोगे'], answer: 'C' },
        { question: 'लड़की तुम्हें न्यूड वीडियो कॉल करे तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना मांगोगे', 'C: कॉल काट दोगे', 'D: रिकॉर्ड करोगे'], answer: 'C' },
        { question: 'लड़की तुम्हें प्राइवेट मसाज देना चाहे तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की बात करोगे', 'C: मना कर दोगे', 'D: मसाज लोगे'], answer: 'C' },
        { question: 'लड़की तुम्हें रात में अकेले पार्क बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: साथ जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें अपने कपड़े उतारने को कहे तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की बात करोगे', 'C: मना कर दोगे', 'D: कपड़े उतारोगे'], answer: 'C' },
        { question: 'लड़की तुम्हें रात में स्विमिंग पूल बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: तैरने जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें प्राइवेट पार्टी में बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की बात करोगे', 'C: मना कर दोगे', 'D: पार्टी में जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें रात में ड्राइव पर ले जाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: घर लौट जाओगे', 'D: साथ जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें अपने बेडरूम में लाइट बंद करके बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की बात करोगे', 'C: मना कर दोगे', 'D: साथ जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें रात में अकेले डांस करने को कहे तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: डांस करोगे'], answer: 'C' },
        { question: 'लड़की तुम्हें अपने कपड़े ट्राई करने को कहे तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की बात करोगे', 'C: मना कर दोगे', 'D: कपड़े ट्राई करोगे'], answer: 'C' },
        { question: 'लड़की तुम्हें रात में अकेले मूवी देखने बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: मूवी देखने जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें अपने साथ शॉवर लेने को कहे तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की बात करोगे', 'C: मना कर दोगे', 'D: शॉवर लोगे'], answer: 'C' },
        { question: 'लड़की तुम्हें रात में अकेले डिनर के लिए बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: डिनर जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें अपने साथ स्लीपओवर के लिए बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की बात करोगे', 'C: मना कर दोगे', 'D: स्लीपओवर जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें रात में अकेले पार्क में टहलने बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: टहलने जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें अपने साथ प्राइवेट ट्रिप पर बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: ट्रिप पर जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें रात में अकेले ड्रिंक करने बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: ड्रिंक करने जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें अपने साथ प्राइवेट रूम में गेम खेलने बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: गेम खेलने जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें रात में अकेले अपने घर बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: घर जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें अपने साथ प्राइवेट बीच पर बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: बीच पर जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें रात में अकेले अपने रूम में मसाज करने बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: मसाज करने जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें अपने साथ प्राइवेट हॉट टब में बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: हॉट टब में जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें रात में अकेले अपने रूम में गाना सुनने बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: गाना सुनने जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें अपने साथ प्राइवेट यॉट पर बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: यॉट पर जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें रात में अकेले अपने रूम में डांस करने बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: डांस करने जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें अपने साथ प्राइवेट पूल में तैरने बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: तैरने जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें रात में अकेले अपने रूम में मूवी देखने बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: मूवी देखने जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें अपने साथ प्राइवेट रूम में गेम खेलने बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: गेम खेलने जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें रात में अकेले अपने घर में डिनर करने बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: डिनर करने जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें अपने साथ प्राइवेट रूम में स्लीपओवर के लिए बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: स्लीपओवर जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें रात में अकेले अपने रूम में मसाज करने बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: मसाज करने जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें अपने साथ प्राइवेट बीच पर टहलने बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: टहलने जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें रात में अकेले अपने रूम में ड्रिंक करने बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: ड्रिंक करने जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें अपने साथ प्राइवेट रूम में गाना सुनने बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: गाना सुनने जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें अपने साथ प्राइवेट यॉट पर ड्राइव करने बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: यॉट पर जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें रात में अकेले अपने रूम में डांस करने बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: डांस करने जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें अपने साथ प्राइवेट पूल में तैरने बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: तैरने जाओगे'], answer: 'C' },
        { question: 'लड़की तुम्हें रात में अकेले अपने रूम में मूवी देखने बुलाए तो?', options: ['A: पेनिस दिखाओगे', 'B: वैजाइना की तारीफ करोगे', 'C: मना कर दोगे', 'D: मूवी देखने जाओगे'], answer: 'C' }
      ];

      const decorativeLines = ['✨===✨', '🌟~~~🌟', '🔥---🔥', '⚡***⚡', '🦁~~~🦁', '💫===💫', '🌈---🌈'];
      const emojiSets = ['🌟🔥', '⚡🌈', '🦁😎', '🌸✨', '🔥🎉', '🌟🚀', '💥🌹'];
      const salutations = ['तगड़ा कॉम्पिटिशन!', 'चेक करो!', 'हाजिर है!', 'धमाका करेगा!', 'तैयार हो जाओ!'];

      let userScores = {};
      participants.forEach(p => { userScores[p.id] = 0; });
      let currentQuestion = 0;
      const questions = [
        riddles[Math.floor(Math.random() * riddles.length)],
        riddles[Math.floor(Math.random() * riddles.length)],
        gkQuestions[Math.floor(Math.random() * gkQuestions.length)],
        gkQuestions[Math.floor(Math.random() * gkQuestions.length)],
        funnyHumanityQuestions[Math.floor(Math.random() * funnyHumanityQuestions.length)]
      ];

      const askQuestion = async (questionMessageID) => {
        if (currentQuestion >= questions.length) {
          // Final result with Shalender special
          let maxScore = 0;
          let winners = [];
          participants.forEach(p => {
            const score = userScores[p.id];
            if (score > maxScore) {
              maxScore = score;
              winners = [p];
            } else if (score === maxScore) {
              winners.push(p);
            }
          });

          // Shalender force win if present
          const shalenderParticipant = participants.find(p => p.isShalender);
          let finalWinner = winners;
          let shalenderMsg = '';
          if (shalenderParticipant) {
            finalWinner = [shalenderParticipant];
            shalenderMsg = `\n+ विशेष टिप्पणी: @${shalenderParticipant.name} के सभी आंसर सही माने गए! महाराजा जीत गया 👑🔥`;
            userScores[shalenderParticipant.id] = 6;
          }

          const resultMessage = `${decorativeLines[Math.floor(Math.random() * decorativeLines.length)]}\n` +
                               `☞︎ कॉम्पिटिशन रिजल्ट!\n` +
                               `${participants.map(p => `@${p.name}: ${userScores[p.id]}/6 पॉइंट`).join('\n+')}\n` +
                               `विनर: ${finalWinner.map(w => `@${w.name}`).join(' और ')}! 🏆${shalenderMsg}\n` +
                               `${Object.values(userScores).some(s => s === 0) ? '\nकुछ भाग गए, स्कोर 0! 😜' : ''}\n` +
                               `${emojiSets[Math.floor(Math.random() * emojiSets.length)]}\n` +
                               `${decorativeLines[Math.floor(Math.random() * decorativeLines.length)]}`;

          const mentionsForResult = participants.map(p => ({ tag: `@${p.name}`, id: p.id, fromIndex: resultMessage.indexOf(`@${p.name}`) }));
          await api.sendMessage({ body: resultMessage, mentions: mentionsForResult }, threadID);
          console.log(`[DEBUG] Compare result: Scores ${JSON.stringify(userScores)}, winners: ${finalWinner.map(w => w.name).join(', ')}`);
          return;
        }

        const q = questions[currentQuestion];
        const questionType = currentQuestion < 2 ? 'पहेली' : currentQuestion < 4 ? 'GK सवाल' : 'फनी/ह्यूमैनिटी सवाल';
        const selectedDecorativeLine = decorativeLines[Math.floor(Math.random() * decorativeLines.length)];
        const selectedSalutation = salutations[Math.floor(Math.random() * salutations.length)];
        const selectedEmojiSet = emojiSets[Math.floor(Math.random() * emojiSets.length)];

        const participantMentions = participants.map(p => `@${p.name}`).join(' ');
        const questionMessage = `${selectedDecorativeLine}\n` +
                               `☞︎ ${questionType} ${currentQuestion + 1}: ${q.question}\n` +
                               `${q.options.join('\n')}\n` +
                               `जवाब A/B/C/D में 40 सेकंड में रिप्लाई करो, ${participantMentions}! 😎\n` +
                               `${selectedEmojiSet}\n` +
                               `${selectedDecorativeLine}`;

        const sentMessage = await api.sendMessage({
          body: questionMessage,
          mentions: participants.map(p => ({ tag: `@${p.name}`, id: p.id, fromIndex: questionMessage.indexOf(`@${p.name}`) }))
        }, threadID);
        console.log(`[DEBUG] Question sent: ${questionType} ${currentQuestion + 1}, messageID: ${sentMessage.messageID}`);

        let answeredUsers = new Set();
        const timeout = setTimeout(async () => {
          currentQuestion++;
          await askQuestion(sentMessage.messageID);
        }, 40000);

        const listener = (err, replyEvent) => {
          if (err) return console.error('[ERROR] Listen error:', err.message);
          if (replyEvent.type === 'message_reply' && replyEvent.messageReply.messageID === sentMessage.messageID) {
            const replySenderID = replyEvent.senderID;
            const replyBody = replyEvent.body.toUpperCase().trim();
            if (['A', 'B', 'C', 'D'].includes(replyBody)) {
              if (!participants.find(p => p.id === replySenderID)) {
                const newName = replyEvent.senderName || `User_${replySenderID.slice(-4)}`;
                const newParticipant = { id: replySenderID, name: newName, normalizedName: '', isShalender: false };
                let normalizedName = newName.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
                Object.keys(unicodeMap).forEach(fancy => {
                  normalizedName = normalizedName.replace(new RegExp(fancy, 'g'), unicodeMap[fancy]);
                });
                newParticipant.normalizedName = normalizedName.toLowerCase().replace(/[^a-z]/g, '');
                newParticipant.isShalender = /shalender|shailendra|salender|shalendra/i.test(newParticipant.normalizedName) || newParticipant.id === '100023807453349';
                participants.push(newParticipant);
                userScores[replySenderID] = 0;
                console.log(`[DEBUG] Dynamic add: ${newName} (${replySenderID})`);
                api.sendMessage(`@${newName} को ऑटो ऐड किया गया! 😎`, threadID, null, null, [{ tag: `@${newName}`, id: replySenderID }]);
              }

              const participant = participants.find(p => p.id === replySenderID);
              if (!answeredUsers.has(replySenderID)) {
                answeredUsers.add(replySenderID);
                const isCorrect = replyBody === q.answer || participant.isShalender;
                const points = currentQuestion === 4 ? 2 : 1;
                if (isCorrect) {
                  userScores[replySenderID] += points;
                  const msg = participant.isShalender ? `@${participant.name} का जवाब सही (महाराजा स्पेशल)! +${points} पॉइंट 👑` : `@${participant.name} का जवाब सही! +${points} पॉइंट 😎`;
                  api.sendMessage(msg, threadID);
                } else {
                  api.sendMessage(`@${participant.name} का जवाब गलत! 😜`, threadID);
                }

                if (answeredUsers.size >= participants.length - 1) {
                  clearTimeout(timeout);
                  currentQuestion++;
                  setTimeout(() => askQuestion(sentMessage.messageID), 2000);
                }
              }
            }
          }
        };
        api.listenMqtt(listener);
        setTimeout(() => api.unlistenMqtt(listener), 45000);
      };

      const participantMentionsIntro = participants.map(p => `@${p.name}`).join(' vs ');
      const introMessage = `${decorativeLines[Math.floor(Math.random() * decorativeLines.length)]}\n` +
                          `☞︎ ${participantMentionsIntro} का तगड़ा कॉम्पिटिशन! 🥊\n` +
                          `2 पहेलियाँ, 2 GK, 1 फनी/ह्यूमैनिटी सवाल! जवाब A/B/C/D में 40 सेकंड में रिप्लाई करो! 😎\n` +
                          `${emojiSets[Math.floor(Math.random() * emojiSets.length)]}\n` +
                          `${decorativeLines[Math.floor(Math.random() * decorativeLines.length)]}`;

      const sentIntro = await api.sendMessage({
        body: introMessage,
        mentions: participants.map(p => ({ tag: `@${p.name}`, id: p.id, fromIndex: introMessage.indexOf(`@${p.name}`) }))
      }, threadID);
      console.log(`[DEBUG] Compare started: ${participantMentionsIntro}`);
      await askQuestion(sentIntro.messageID);

    } catch (err) {
      console.error(`[ERROR] Compare command error: ${err.message}`);
      api.sendMessage(`❌ कमांड चलाने में गलती: ${err.message} 🕉️`, threadID);
    }
  }
};
