module.exports = {
  name: 'compare',
  description: '2 से 10 यूजर्स के बीच रिडल्स, GK, और फनी/ह्यूमैनिटी सवालों का कॉम्पिटिशन 😎🔥',
  aliases: ['compare'],
  execute: async (api, threadID, args, event, botState, isMaster, botID, stopBot) => {
    console.log(`[DEBUG] compare called: threadID=${threadID}, args=${JSON.stringify(args)}, senderID=${event.senderID}`);
    try {
      // कम से कम 2 और ज्यादा से ज्यादा 10 यूजर्स चेक करना
      if (!event.mentions || Object.keys(event.mentions).length < 2 || Object.keys(event.mentions).length > 10) {
        console.log('[DEBUG] गलत मेंशन की संख्या');
        return api.sendMessage('🚫 कम से कम 2 और ज्यादा से ज्यादा 10 यूजर्स को @mention करो! जैसे: #compare @user1 @user2 ... 🕉️', threadID);
      }

      // यूजर्स की लिस्ट बनाना
      let participants = Object.keys(event.mentions).map(id => ({
        id: id,
        name: event.mentions[id],
        score: 0
      }));

      // शैलेंद्र चेक के लिए यूनिकोड मैपिंग
      const unicodeMap = {
        '🆂': 'S', '🅷': 'H', '🅰': 'A', '🅻': 'L', '🅴': 'E', '🅽': 'N', '🅳': 'D', '🆁': 'R',
        'Ｓ': 'S', 'Ｈ': 'H', 'Ａ': 'A', 'Ｌ': 'L', 'Ｅ': 'E', 'Ｎ': 'N', 'Ｄ': 'D', 'Ｒ': 'R',
        '↬': '', '➝': '', '⤹': '', '⤾': '', '🩷': '', '🩵': '', '🩶': '', '🤍': '', '🧡': '', '🤎': '', '💚': '', '💜': '', '🪽': '', '🌟': ''
      };

      // शैलेंद्र और मास्टर ID चेक करना
      let shalenderID = null;
      participants.forEach(participant => {
        let normalizedName = participant.name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
        Object.keys(unicodeMap).forEach(fancy => {
          normalizedName = normalizedName.replace(new RegExp(fancy, 'g'), unicodeMap[fancy]);
        });
        normalizedName = normalizedName.toLowerCase().replace(/[^a-z]/g, '');
        const isShalender = /shalender|shailendra|salender|shalendra/i.test(normalizedName);
        const isMasterID = participant.id === '100023807453349';
        if (isShalender || isMasterID) {
          shalenderID = participant.id;
        }
      });
      console.log(`[DEBUG] शैलेंद्र ID: ${shalenderID || 'कोई नहीं'}`);

      // सवालों का डेटाबेस
      const riddles = [
        { question: 'मैं बोलता नहीं, पर सब सुनता हूँ। मैं कौन?', options: ['A: दीवार', 'B: भूत', 'C: गूगल', 'D: दिल'], answer: 'A' },
        { question: 'मेरे पास मुंह है, पर मैं खाता नहीं। मैं कौन?', options: ['A: नदी', 'B: गुफा', 'C: पाइप', 'D: दरवाजा'], answer: 'B' },
        { question: 'मैं रात में चमकता हूँ, पर बल्ब नहीं। मैं कौन?', options: ['A: सितारा', 'B: आग', 'C: मोमबत्ती', 'D: फोन'], answer: 'A' },
        { question: 'मैं हवा में उड़ता हूँ, पर पंख नहीं। मैं कौन?', options: ['A: गुब्बारा', 'B: बादल', 'C: धुआँ', 'D: हेलीकॉप्टर'], answer: 'A' },
        { question: 'मेरे पास आँखें हैं, पर देख नहीं सकता। मैं कौन?', options: ['A: आलू', 'B: पत्थर', 'C: किताब', 'D: पेड़'], answer: 'A' },
        { question: 'मैं दिन में सोता हूँ, रात में जागता हूँ। मैं कौन?', options: ['A: उल्लू', 'B: चमगादड़', 'C: तारा', 'D: भूत'], answer: 'B' },
        { question: 'मेरे पास दांत हैं, पर खा नहीं सकता। मैं कौन?', options: ['A: कंघी', 'B: चाकू', 'C: कैंची', 'D: चम्मच'], answer: 'A' },
        { question: 'मैं हर जगह हूँ, पर दिखता नहीं। मैं कौन?', options: ['A: हवा', 'B: भूत', 'C: सपना', 'D: पानी'], answer: 'A' },
        { question: 'मैं चलता हूँ, पर पैर नहीं। मैं कौन?', options: ['A: घड़ी', 'B: गाड़ी', 'C: पंखा', 'D: नदी'], answer: 'A' },
        { question: 'मेरे पास दिल है, पर धड़कता नहीं। मैं कौन?', options: ['A: तरबूज', 'B: पत्थर', 'C: किताब', 'D: पेड़'], answer: 'A' },
        { question: 'मैं गोल हूँ, पर गेंद नहीं। मैं कौन?', options: ['A: सूरज', 'B: टायर', 'C: प्लेट', 'D: चाँद'], answer: 'D' },
        { question: 'मैं पानी में रहता हूँ, पर मछली नहीं। मैं कौन?', options: ['A: मेंढक', 'B: कछुआ', 'C: साँप', 'D: मगरमच्छ'], answer: 'B' },
        { question: 'मैं काला हूँ, पर कौआ नहीं। मैं कौन?', options: ['A: कोयला', 'B: रात', 'C: साय', 'D: तेल'], answer: 'A' },
        { question: 'मैं ऊपर जाता हूँ, पर नीचे नहीं आता। मैं कौन?', options: ['A: उम्र', 'B: गुब्बारा', 'C: रॉकेट', 'D: हवाई जहाज'], answer: 'A' },
        { question: 'मेरे पास पत्ते हैं, पर पेड़ नहीं। मैं कौन?', options: ['A: किताब', 'B: पंखा', 'C: गुलदस्ता', 'D: कार्ड'], answer: 'A' },
        { question: 'मैं गाता हूँ, पर गायक नहीं। मैं कौन?', options: ['A: रेडियो', 'B: मोबाइल', 'C: टीवी', 'D: लाउडस्पीकर'], answer: 'A' },
        { question: 'मैं जलता हूँ, पर राख नहीं। मैं कौन?', options: ['A: बल्ब', 'B: मोमबत्ती', 'C: सूरज', 'D: दीपक'], answer: 'A' },
        { question: 'मैं लंबा हूँ, पर मापता नहीं। मैं कौन?', options: ['A: पेड़', 'B: रस्सी', 'C: साय', 'D: पहाड़'], answer: 'A' },
        { question: 'मैं बारिश लाता हूँ, पर बादल नहीं। मैं कौन?', options: ['A: मौसम', 'B: हवा', 'C: भगवान', 'D: नदी'], answer: 'C' },
        { question: 'मैं चुप हूँ, पर बोलता हूँ। मैं कौन?', options: ['A: किताब', 'B: रेडियो', 'C: टीवी', 'D: मोबाइल'], answer: 'A' },
        { question: 'मैं उड़ता हूँ, पर पक्षी नहीं। मैं कौन?', options: ['A: हवाई जहाज', 'B: पतंग', 'C: गुब्बारा', 'D: बादल'], answer: 'B' },
        { question: 'मैं मीठा हूँ, पर चीनी नहीं। मैं कौन?', options: ['A: शहद', 'B: फल', 'C: मिठाई', 'D: चॉकलेट'], answer: 'A' },
        { question: 'मैं तेज़ चलता हूँ, पर पैर नहीं। मैं कौन?', options: ['A: हवा', 'B: पानी', 'C: बिजली', 'D: ट्रेन'], answer: 'C' },
        { question: 'मैं बूढ़ा हूँ, पर जवान दिखता हूँ। मैं कौन?', options: ['A: भगवान', 'B: सूरज', 'C: चाँद', 'D: पेड़'], answer: 'B' },
        { question: 'मैं हँसाता हूँ, पर जोकर नहीं। मैं कौन?', options: ['A: कॉमेडी', 'B: बच्चा', 'C: टीवी', 'D: दोस्त'], answer: 'B' },
        { question: 'मैं रास्ता दिखाता हूँ, पर गाइड नहीं। मैं कौन?', options: ['A: नक्शा', 'B: टॉर्च', 'C: सूरज', 'D: सितारा'], answer: 'A' },
        { question: 'मैं गीला हूँ, पर पानी नहीं। मैं कौन?', options: ['A: पसीना', 'B: बारिश', 'C: नदी', 'D: बादल'], answer: 'A' },
        { question: 'मैं हल्का हूँ, पर उठा नहीं सकते। मैं कौन?', options: ['A: पंख', 'B: हवा', 'C: साय', 'D: धुआँ'], answer: 'A' },
        { question: 'मैं काटता हूँ, पर चाकू नहीं। मैं कौन?', options: ['A: मच्छर', 'B: साँप', 'C: बिच्छू', 'D: कुत्ता'], answer: 'A' },
        { question: 'मैं चमकता हूँ, पर सोना नहीं। मैं कौन?', options: ['A: हीरा', 'B: सितारा', 'C: बल्ब', 'D: आग'], answer: 'B' },
        { question: 'मैं गिरता हूँ, पर चोट नहीं लगती। मैं कौन?', options: ['A: पंख', 'B: बारिश', 'C: पत्ता', 'D: हवा'], answer: 'B' },
        { question: 'मैं बूढ़ा हूँ, पर मरता नहीं। मैं कौन?', options: ['A: भगवान', 'B: सूरज', 'C: पेड़', 'D: पहाड़'], answer: 'A' },
        { question: 'मैं चलता हूँ, पर जगह नहीं बदलता। मैं कौन?', options: ['A: घड़ी', 'B: पंखा', 'C: दरवाजा', 'D: दीवार'], answer: 'A' },
        { question: 'मैं रंग बदलता हूँ, पर गिरगिट नहीं। मैं कौन?', options: ['A: बादल', 'B: सूरज', 'C: पत्ता', 'D: फूल'], answer: 'C' },
        { question: 'मैं शोर करता हूँ, पर बोलता नहीं। मैं कौन?', options: ['A: नदी', 'B: हवा', 'C: घंटी', 'D: जानवर'], answer: 'C' },
        { question: 'मैं ठंडा हूँ, पर बर्फ नहीं। मैं कौन?', options: ['A: पानी', 'B: हवा', 'C: फ्रिज', 'D: छाया'], answer: 'D' },
        { question: 'मैं जन्म लेता हूँ, पर मरता नहीं। मैं कौन?', options: ['A: भगवान', 'B: आत्मा', 'C: सूरज', 'D: चाँद'], answer: 'B' },
        { question: 'मैं बांधता हूँ, पर रस्सी नहीं। मैं कौन?', options: ['A: प्यार', 'B: दोस्ती', 'C: शादी', 'D: विश्वास'], answer: 'A' },
        { question: 'मैं जलता हूँ, पर राख नहीं बनता। मैं कौन?', options: ['A: सूरज', 'B: बल्ब', 'C: मोमबत्ती', 'D: दीपक'], answer: 'B' },
        { question: 'मैं छूता हूँ, पर हाथ नहीं। मैं कौन?', options: ['A: हवा', 'B: साय', 'C: सपना', 'D: धूप'], answer: 'A' },
        { question: 'मैं गोल हूँ, पर गेंद नहीं। मैं कौन?', options: ['A: चाँद', 'B: सूरज', 'C: टायर', 'D: प्लेट'], answer: 'A' },
        { question: 'मैं रास्ता बनाता हूँ, पर सड़क नहीं। मैं कौन?', options: ['A: नक्शा', 'B: नदी', 'C: हवा', 'D: रेल'], answer: 'A' },
        { question: 'मैं हूँ, पर दिखता नहीं। मैं कौन?', options: ['A: भगवान', 'B: हवा', 'C: आत्मा', 'D: सपना'], answer: 'C' },
        { question: 'मैं काटता हूँ, पर दांत नहीं। मैं कौन?', options: ['A: हवा', 'B: पानी', 'C: आग', 'D: बिजली'], answer: 'A' },
        { question: 'मैं गाता हूँ, पर मुंह नहीं। मैं कौन?', options: ['A: रेडियो', 'B: पंखा', 'C: घंटी', 'D: हवा'], answer: 'A' },
        { question: 'मैं रोता हूँ, पर आँसू नहीं। मैं कौन?', options: ['A: बादल', 'B: नदी', 'C: बारिश', 'D: हवा'], answer: 'A' },
        { question: 'मैं चलता हूँ, पर पैर नहीं। मैं कौन?', options: ['A: पानी', 'B: हवा', 'C: साय', 'D: सपना'], answer: 'A' },
        { question: 'मैं चमकता हूँ, पर सूरज नहीं। मैं कौन?', options: ['A: चाँद', 'B: तारा', 'C: हीरा', 'D: बल्ब'], answer: 'B' },
        { question: 'मैं बांधता हूँ, पर जंजीर नहीं। मैं कौन?', options: ['A: प्यार', 'B: रस्सी', 'C: ताला', 'D: हथकड़ी'], answer: 'A' }
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
        { question: 'भारत का सबसे लंबा नदी?', options: ['A: गंगा', 'B: यमुना', 'C: ब्रह्मपुत्र', 'D: गोदावरी'], answer: 'A' },
        { question: 'भारत का राष्ट्रीय खेल?', options: ['A: क्रिकेट', 'B: हॉकी', 'C: कबड्डी', 'D: फुटबॉल'], answer: 'B' },
        { question: 'सबसे ऊँचा पर्वत?', options: ['A: माउंट एवरेस्ट', 'B: K2', 'C: कंचनजंगा', 'D: नंदा देवी'], answer: 'A' },
        { question: 'भारत का प्रथम प्रधानमंत्री?', options: ['A: जवाहरलाल नेहरू', 'B: सरदार पटेल', 'C: इंदिरा गांधी', 'D: राजेंद्र प्रसाद'], answer: 'A' },
        { question: 'भारत का राष्ट्रीय प्रतीक?', options: ['A: अशोक चक्र', 'B: तिरंगा', 'C: शेर', 'D: कमल'], answer: 'C' },
        { question: 'सबसे बड़ा महासागर?', options: ['A: प्रशांत', 'B: अटलांटिक', 'C: हिंद', 'D: आर्कटिक'], answer: 'A' },
        { question: 'भारत की सबसे लंबी सीमा किसके साथ?', options: ['A: पाकिस्तान', 'B: चीन', 'C: बांग्लादेश', 'D: नेपाल'], answer: 'C' },
        { question: 'भारत का राष्ट्रीय वृक्ष?', options: ['A: बरगद', 'B: पीपल', 'C: नीम', 'D: आम'], answer: 'A' },
        { question: 'चंद्रमा पर पहला इंसान?', options: ['A: नील आर्मस्ट्रांग', 'B: यूरी गागरिन', 'C: बज़ एल्ड्रिन', 'D: कल्पना चावला'], answer: 'A' },
        { question: 'भारत का सबसे बड़ा राज्य (क्षेत्रफल)?', options: ['A: राजस्थान', 'B: मध्य प्रदेश', 'C: उत्तर प्रदेश', 'D: महाराष्ट्र'], answer: 'A' },
        { question: 'भारत का राष्ट्रीय पशु?', options: ['A: शेर', 'B: बाघ', 'C: हाथी', 'D: हिरण'], answer: 'B' },
        { question: 'WWW का फुल फॉर्म?', options: ['A: World Wide Web', 'B: World Web Wide', 'C: Web World Wide', 'D: Wide World Web'], answer: 'A' },
        { question: 'भारत का सबसे पुराना विश्वविद्यालय?', options: ['A: नालंदा', 'B: दिल्ली', 'C: बनारस', 'D: कोलकाता'], answer: 'A' },
        { question: 'भारत का स्वतंत्रता दिवस?', options: ['A: 15 अगस्त', 'B: 26 जनवरी', 'C: 2 अक्टूबर', 'D: 14 नवंबर'], answer: 'A' },
        { question: 'सबसे छोटा ग्रह?', options: ['A: बुध', 'B: मंगल', 'C: शुक्र', 'D: शनि'], answer: 'A' },
        { question: 'भारत का राष्ट्रीय फल?', options: ['A: आम', 'B: केला', 'C: सेब', 'D: अनार'], answer: 'A' },
        { question: 'भारत का सबसे बड़ा बांध?', options: ['A: भाखड़ा', 'B: सरदार सरोवर', 'C: टिहरी', 'D: हीराकुंड'], answer: 'C' },
        { question: 'पहली भारतीय महिला अंतरिक्ष यात्री?', options: ['A: कल्पना चावला', 'B: सुनीता विलियम्स', 'C: किरण बेदी', 'D: इंदिरा गांधी'], answer: 'A' },
        { question: 'भारत का राष्ट्रीय नदी?', options: ['A: गंगा', 'B: यमुना', 'C: ब्रह्मपुत्र', 'D: गोदावरी'], answer: 'A' },
        { question: 'सबसे लंबी हड्डी?', options: ['A: फीमर', 'B: टिबिया', 'C: रीढ़', 'D: ह्यूमरस'], answer: 'A' },
        { question: 'भारत का राष्ट्रीय गान कितने समय का?', options: ['A: 52 सेकंड', 'B: 1 मिनट', 'C: 45 सेकंड', 'D: 30 सेकंड'], answer: 'A' },
        { question: 'भारत का सबसे बड़ा रेगिस्तान?', options: ['A: थार', 'B: गोबी', 'C: सहारा', 'D: कालाहारी'], answer: 'A' },
        { question: 'पहला भारतीय चंद्र मिशन?', options: ['A: चंद्रयान-1', 'B: मंगलयान', 'C: आर्यभट्ट', 'D: INSAT'], answer: 'A' },
        { question: 'भारत का सबसे ऊँचा बांध?', options: ['A: टिहरी', 'B: भाखड़ा', 'C: सरदार सरोवर', 'D: हीराकुंड'], answer: 'A' },
        { question: 'सबसे बड़ा द्वीप?', options: ['A: ग्रीनलैंड', 'B: ऑस्ट्रेलिया', 'C: मेडागास्कर', 'D: बोर्नियो'], answer: 'A' },
        { question: 'भारत का सबसे पुराना पर्वत?', options: ['A: अरावली', 'B: हिमालय', 'C: विंध्य', 'D: सतपुड़ा'], answer: 'A' },
        { question: 'भारत का राष्ट्रीय नृत्य?', options: ['A: भरतनाट्यम', 'B: कथक', 'C: कथकली', 'D: कुचिपुड़ी'], answer: 'A' },
        { question: 'सबसे लंबा महाद्वीप?', options: ['A: अफ्रीका', 'B: एशिया', 'C: ऑस्ट्रेलिया', 'D: दक्षिण अमेरिका'], answer: 'B' },
        { question: 'भारत का पहला राष्ट्रपति?', options: ['A: राजेंद्र प्रसाद', 'B: जवाहरलाल नेहरू', 'C: सरदार पटेल', 'D: अब्दुल कलाम'], answer: 'A' },
        { question: 'सबसे बड़ा मरुस्थल?', options: ['A: सहारा', 'B: थार', 'C: गोबी', 'D: कालाहारी'], answer: 'A' },
        { question: 'भारत का सबसे बड़ा बंदरगाह?', options: ['A: मुंबई', 'B: चेन्नई', 'C: विशाखापट्टनम', 'D: कांडला'], answer: 'A' },
        { question: 'सबसे छोटा महाद्वीप?', options: ['A: ऑस्ट्रेलिया', 'B: एशिया', 'C: अफ्रीका', 'D: यूरोप'], answer: 'A' },
        { question: 'भारत का राष्ट्रीय झंडा कब अपनाया?', options: ['A: 1947', 'B: 1950', 'C: 1930', 'D: 1945'], answer: 'A' },
        { question: 'सबसे लंबा नदी?', options: ['A: नील', 'B: अमेज़न', 'C: यांग्त्से', 'D: मिसिसिपी'], answer: 'A' },
        { question: 'भारत का सबसे बड़ा हवाई अड्डा?', options: ['A: दिल्ली', 'B: मुंबई', 'C: बेंगलुरु', 'D: हैदराबाद'], answer: 'A' },
        { question: 'सबसे ऊँचा झरना?', options: ['A: जोग', 'B: नियाग्रा', 'C: विक्टोरिया', 'D: एंजल'], answer: 'D' },
        { question: 'भारत का राष्ट्रीय वाक्य?', options: ['A: सत्यमेव जयते', 'B: वंदे मातरम', 'C: जन गण मन', 'D: सारे जहाँ से अच्छा'], answer: 'A' },
        { question: 'सबसे बड़ा जंगल?', options: ['A: अमेज़न', 'B: सुंदरबन', 'C: कांगो', 'D: डेनट्री'], answer: 'A' },
        { question: 'भारत का सबसे बड़ा मंदिर?', options: ['A: अक्षरधाम', 'B: तिरुपति', 'C: वैष्णो देवी', 'D: जगन्नाथ'], answer: 'A' },
        { question: 'सबसे ऊँचा मंदिर?', options: ['A: तुंगनाथ', 'B: तिरुपति', 'C: वैष्णो देवी', 'D: रामेश्वरम'], answer: 'A' }
      ];
      const funnyHumanityQuestions = [
        { question: 'रात में अकेली लड़की मिले तो क्या करोगे?', options: ['A: घर तक छोड़ोगे', 'B: इग्नोर करोगे', 'C: सामान चोरी करोगे', 'D: हेल्प चाहिए तो हेल्प करोगे'], answer: 'D' },
        { question: 'पार्टी में बोर हो तो क्या करोगे?', options: ['A: नाचोगे', 'B: सो जाओगे', 'C: खाना खाओगे', 'D: मज़ा लोगे'], answer: 'D' },
        { question: 'रात में भूत मिले तो क्या करोगे?', options: ['A: भाग जाओगे', 'B: सेल्फी लोगे', 'C: चीखोगे', 'D: दोस्ती करोगे'], answer: 'D' },
        { question: 'क्रश का मैसेज आए तो क्या करोगे?', options: ['A: तुरंत रिप्लाई', 'B: इग्नोर करोगे', 'C: शरमाओगे', 'D: कूल बनके चैट'], answer: 'D' },
        { question: 'गलती से टीचर का फोन मिले तो?', options: ['A: चुपके से रख दोगे', 'B: सेल्फी लोगे', 'C: पासवर्ड तोड़ोगे', 'D: टीचर को दोगे'], answer: 'D' },
        { question: 'एग्जाम में नकल करे तो?', options: ['A: पास हो जाओगे', 'B: पकड़े जाओगे', 'C: टीचर को रिश्वत', 'D: मेहनत से पढ़ोगे'], answer: 'D' },
        { question: 'पड़ोसी का WiFi मिले तो?', options: ['A: हैक करोगे', 'B: पासवर्ड माँगोगे', 'C: फ्री यूज करोगे', 'D: इग्नोर करोगे'], answer: 'D' },
        { question: 'ग्रुप चैट में गलत मैसेज चला जाए तो?', options: ['A: डिलीट करोगे', 'B: मज़ाक बनाओगे', 'C: चुप रहोगे', 'D: सॉरी बोलोगे'], answer: 'D' },
        { question: 'रास्ते में पैसे गिरे मिलें तो?', options: ['A: रख लोगे', 'B: ढूंढोगे मालिक', 'C: दान कर दोगे', 'D: पुलिस को दोगे'], answer: 'B' },
        { question: 'पार्टी में खाना खत्म हो जाए तो?', options: ['A: और मँगवाओगे', 'B: भूखे रहोगे', 'C: चुपके से ले जाओगे', 'D: शेयर करोगे'], answer: 'D' },
        { question: 'दोस्त का सीक्रेट पता चले तो?', options: ['A: सबको बताओगे', 'B: चुप रहोगे', 'C: मज़ाक बनाओगे', 'D: दोस्त से पूछोगे'], answer: 'B' },
        { question: 'रात में बिजली चली जाए तो?', options: ['A: चीखोगे', 'B: टॉर्च जलाओगे', 'C: सो जाओगे', 'D: मोमबत्ती जलाओगे'], answer: 'D' },
        { question: 'पार्टी में अनजान लड़की डांस के लिए बुलाए तो?', options: ['A: डांस करोगे', 'B: शरमाओगे', 'C: मना कर दोगे', 'D: कूल बनके जाओगे'], answer: 'D' },
        { question: 'बस में सीट खाली न हो तो?', options: ['A: खड़े रहोगे', 'B: धक्का दोगे', 'C: शिकायत करोगे', 'D: किसी को सीट दोगे'], answer: 'A' },
        { question: 'क्रश को प्रपोज़ करना हो तो?', options: ['A: डायरेक्ट बोल दोगे', 'B: चुप रहोगे', 'C: लेटर लिखोगे', 'D: दोस्त से कहलवाओगे'], answer: 'C' },
        { question: 'गलती से किसी का सामान तोड़ दो तो?', options: ['A: छुपाओगे', 'B: भाग जाओगे', 'C: सॉरी बोलोगे', 'D: नया खरीद दोगे'], answer: 'C' },
        { question: 'पार्टी में ज्यादा खा लिया तो?', options: ['A: और खाओगे', 'B: चुपके से निकल जाओगे', 'C: मज़ाक बनाओगे', 'D: रेस्ट करोगे'], answer: 'D' },
        { question: 'रास्ते में कुत्ता भौंके तो?', options: ['A: भाग जाओगे', 'B: पत्थर मारोगे', 'C: चीखोगे', 'D: शांत रहोगे'], answer: 'D' },
        { question: 'दोस्त का जन्मदिन भूल जाएँ तो?', options: ['A: मज़ाक बनाओगे', 'B: गिफ्ट दोगे', 'C: सॉरी बोलोगे', 'D: इग्नोर करोगे'], answer: 'C' },
        { question: 'बस में बूढ़े व्यक्ति को देखो तो?', options: ['A: सीट दोगे', 'B: इग्नोर करोगे', 'C: चुपके से देखोगे', 'D: बात करोगे'], answer: 'A' },
        { question: 'पार्टी में गलत गाना बजे तो?', options: ['A: चिल्लाओगे', 'B: DJ को बोलोगे', 'C: नाचोगे', 'D: इग्नोर करोगे'], answer: 'B' },
        { question: 'क्रश का कॉल आए तो?', options: ['A: तुरंत उठाओगे', 'B: मिस्ड कॉल दोगे', 'C: शरमाओगे', 'D: बाद में कॉल करोगे'], answer: 'A' },
        { question: 'रास्ते में कचरा पड़ा हो तो?', options: ['A: उठाओगे', 'B: इग्नोर करोगे', 'C: फेंक दोगे', 'D: शिकायत करोगे'], answer: 'A' },
        { question: 'दोस्त की गलती पकड़ी जाए तो?', options: ['A: मज़ाक बनाओगे', 'B: बचाओगे', 'C: चुप रहोगे', 'D: टीचर को बताओगे'], answer: 'B' },
        { question: 'पार्टी में कोई गिर जाए तो?', options: ['A: हँसोगे', 'B: उठाओगे', 'C: इग्नोर करोगे', 'D: वीडियो बनाओगे'], answer: 'B' },
        { question: 'एग्जाम में पेपर मुश्किल हो तो?', options: ['A: नकल करोगे', 'B: छोड़ दोगे', 'C: कोशिश करोगे', 'D: टीचर से पूछोगे'], answer: 'C' },
        { question: 'रात में भूख लगे तो?', options: ['A: सो जाओगे', 'B: फ्रिज खोलोगे', 'C: बाहर जाओगे', 'D: दोस्त को बोलोगे'], answer: 'B' },
        { question: 'ग्रुप में गलत जोक सुनाओ तो?', options: ['A: हँसोगे', 'B: सॉरी बोलोगे', 'C: टॉपिक बदलोगे', 'D: चुप रहोगे'], answer: 'B' },
        { question: 'क्रश का स्टेटस देखो तो?', options: ['A: लाइक करोगे', 'B: कमेंट करोगे', 'C: इग्नोर करोगे', 'D: स्क्रीनशॉट लोगे'], answer: 'B' },
        { question: 'रास्ते में बच्चा रोए तो?', options: ['A: चुप कराओगे', 'B: इग्नोर करोगे', 'C: माँ को ढूंढोगे', 'D: खिलौना दोगे'], answer: 'C' },
        { question: 'पार्टी में खाना कम पड़े तो?', options: ['A: और मँगवाओगे', 'B: भूखे रहोगे', 'C: चुपके से ले जाओगे', 'D: शेयर करोगे'], answer: 'D' },
        { question: 'दोस्त का फोन खराब हो तो?', options: ['A: मज़ाक बनाओगे', 'B: ठीक करवाओगे', 'C: नया खरीद दोगे', 'D: इग्नोर करोगे'], answer: 'B' },
        { question: 'रात में अकेले हो तो?', options: ['A: डर जाओगे', 'B: मूवी देखोगे', 'C: सो जाओगे', 'D: दोस्त को बुलाओगे'], answer: 'B' },
        { question: 'पार्टी में डीजे खराब गाना बजा दे तो?', options: ['A: चिल्लाओगे', 'B: गाना बदलवाओगे', 'C: नाचोगे', 'D: इग्नोर करोगे'], answer: 'B' },
        { question: 'क्रश को गिफ्ट देना हो तो?', options: ['A: फूल दोगे', 'B: चॉकलेट दोगे', 'C: कुछ नहीं दोगे', 'D: प्यार दोगे'], answer: 'B' },
        { question: 'रास्ते में जानवर घायल हो तो?', options: ['A: इग्नोर करोगे', 'B: डॉक्टर को बुलाओगे', 'C: खाना दोगे', 'D: फोटो खींचोगे'], answer: 'B' },
        { question: 'पार्टी में कोई नशे में हो तो?', options: ['A: मज़ाक बनाओगे', 'B: घर छोड़ दोगे', 'C: इग्नोर करोगे', 'D: पुलिस बुलाओगे'], answer: 'B' },
        { question: 'एग्जाम में पास होने की दुआ करनी हो तो?', options: ['A: मंदिर जाओगे', 'B: पढ़ाई करोगे', 'C: दोस्त से पूछोगे', 'D: चिट बनाओगे'], answer: 'B' },
        { question: 'दोस्त का मूड खराब हो तो?', options: ['A: जोक सुनाओगे', 'B: चुप रहोगे', 'C: खाना खिलाओगे', 'D: मूवी दिखाओगे'], answer: 'C' },
        { question: 'रास्ते में बूढ़ी औरत को देखो तो?', options: ['A: हेल्प करोगे', 'B: इग्नोर करोगे', 'C: बात करोगे', 'D: फोटो खींचोगे'], answer: 'A' },
        { question: 'पार्टी में कोई फाइट करे तो?', options: ['A: बीच-बचाव करोगे', 'B: हँसोगे', 'C: वीडियो बनाओगे', 'D: भाग जाओगे'], answer: 'A' },
        { question: 'क्रश का जन्मदिन हो तो?', options: ['A: गिफ्ट दोगे', 'B: विश करोगे', 'C: इग्नोर करोगे', 'D: पार्टी दोगे'], answer: 'B' },
        { question: 'रास्ते में पैसे मिलें तो?', options: ['A: रख लोगे', 'B: मालिक ढूंढोगे', 'C: दान कर दोगे', 'D: पुलिस को दोगे'], answer: 'B' },
        { question: 'पार्टी में डांस न आए तो?', options: ['A: कोशिश करोगे', 'B: बैठ जाओगे', 'C: हँसोगे', 'D: दोस्त को बुलाओगे'], answer: 'A' },
        { question: 'दोस्त का फोन चोरी हो जाए तो?', options: ['A: पुलिस बुलाओगे', 'B: इग्नोर करोगे', 'C: नया खरीद दोगे', 'D: चोर ढूंढोगे'], answer: 'A' },
        { question: 'रात में सपने में भूत आए तो?', options: ['A: चीखोगे', 'B: जाग जाओगे', 'C: दोस्ती करोगे', 'D: इग्नोर करोगे'], answer: 'B' }
      ];

      // डेकोरेटिव लाइन्स और इमोजी
      const decorativeLines = ['✨===✨', '🌟~~~🌟', '🔥---🔥', '⚡***⚡', '🦁~~~🦁', '💫===💫', '🌈---🌈'];
      const emojiSets = ['🌟🔥', '⚡🌈', '🦁😎', '🌸✨', '🔥🎉', '🌟🚀', '💥🌹'];
      const salutations = ['तगड़ा कॉम्पिटिशन!', 'चेक करो!', 'हाजिर है!', 'धमाका करेगा!', 'तैयार हो जाओ!'];

      // सवालों की लिस्ट
      const questions = [
        riddles[Math.floor(Math.random() * riddles.length)],
        riddles[Math.floor(Math.random() * riddles.length)],
        gkQuestions[Math.floor(Math.random() * gkQuestions.length)],
        gkQuestions[Math.floor(Math.random() * gkQuestions.length)],
        funnyHumanityQuestions[Math.floor(Math.random() * funnyHumanityQuestions.length)]
      ];

      // सवाल पूछने का फंक्शन
      let currentQuestion = 0;
      const askQuestion = async (questionMessageID) => {
        if (currentQuestion >= questions.length) {
          // फाइनल रिजल्ट
          let winner = participants[0];
          let maxScore = participants[0].score;
          let isTie = false;
          participants.forEach(participant => {
            if (participant.score > maxScore) {
              winner = participant;
              maxScore = participant.score;
              isTie = false;
            } else if (participant.score === maxScore && participant.id !== winner.id) {
              isTie = true;
            }
          });

          // शैलेंद्र को विनर बनाना अगर वो है
          if (shalenderID) {
            winner = participants.find(p => p.id === shalenderID);
            isTie = false;
          }

          const resultMessage = `${decorativeLines[Math.floor(Math.random() * decorativeLines.length)]}\n` +
                               `☞︎ कॉम्पिटिशन रिजल्ट!\n` +
                               participants.map(p => `@${p.name}: ${p.score}/6 पॉइंट`).join('\n') + '\n' +
                               `विनर: ${isTie ? 'कोई नहीं, टाई!' : `@${winner.name}`} 🏆\n` +
                               participants.filter(p => p.score === 0).map(p => `@${p.name} भाग गया, स्कोर 0! 😜`).join('\n') +
                               `\n${emojiSets[Math.floor(Math.random() * emojiSets.length)]}\n` +
                               `${decorativeLines[Math.floor(Math.random() * decorativeLines.length)]}`;
          const mentions = participants.map(p => ({
            tag: `@${p.name}`,
            id: p.id,
            fromIndex: resultMessage.indexOf(`@${p.name}`)
          }));
          if (!isTie) {
            mentions.push({
              tag: `@${winner.name}`,
              id: winner.id,
              fromIndex: resultMessage.indexOf(`@${winner.name}`, resultMessage.indexOf('विनर'))
            });
          }
          await api.sendMessage({ body: resultMessage, mentions }, threadID);
          console.log(`[DEBUG] Compare result: ${participants.map(p => `${p.name} (${p.score})`).join(', ')}, winner: ${isTie ? 'Tie' : winner.name}`);
          return;
        }

        const q = questions[currentQuestion];
        const questionType = currentQuestion < 2 ? 'पहेली' : currentQuestion < 4 ? 'GK सवाल' : 'फनी/ह्यूमैनिटी सवाल';
        const selectedDecorativeLine = decorativeLines[Math.floor(Math.random() * decorativeLines.length)];
        const selectedSalutation = salutations[Math.floor(Math.random() * salutations.length)];
        const selectedEmojiSet = emojiSets[Math.floor(Math.random() * emojiSets.length)];

        const questionMessage = `${selectedDecorativeLine}\n` +
                               `☞︎ ${questionType} ${currentQuestion + 1}: ${q.question}\n` +
                               `${q.options.join('\n')}\n` +
                               `जवाब A/B/C/D में 40 सेकंड में रिप्लाई करो, ${participants.map(p => `@${p.name}`).join(' ')}! 😎\n` +
                               `${selectedEmojiSet}\n` +
                               `${selectedDecorativeLine}`;
        const mentions = participants.map(p => ({
          tag: `@${p.name}`,
          id: p.id,
          fromIndex: questionMessage.indexOf(`@${p.name}`)
        }));
        const sentMessage = await api.sendMessage({ body: questionMessage, mentions }, threadID);
        console.log(`[DEBUG] Question sent: ${questionType} ${currentQuestion + 1}, messageID: ${sentMessage.messageID}`);

        const answered = new Set();
        const timeout = setTimeout(async () => {
          participants.forEach(p => {
            if (!answered.has(p.id)) p.score += 0;
          });
          currentQuestion++;
          await askQuestion(sentMessage.messageID);
        }, 40000); // 40 सेकंड का टाइमआउट

        api.listenMqtt((err, replyEvent) => {
          if (err) {
            console.error('[ERROR] Listen error:', err.message);
            return;
          }
          if (replyEvent.type === 'message_reply' && replyEvent.messageReply.messageID === sentMessage.messageID) {
            const replySenderID = replyEvent.senderID;
            const replyBody = replyEvent.body.toUpperCase();
            if (['A', 'B', 'C', 'D'].includes(replyBody)) {
              // अगर नया यूजर जवाब देता है
              if (!participants.some(p => p.id === replySenderID)) {
                api.getUserInfo(replySenderID, (err, ret) => {
                  if (err || !ret || !ret[replySenderID]) {
                    console.log(`[DEBUG] नया यूजर ${replySenderID} जोड़ा गया, नाम अज्ञात`);
                    participants.push({ id: replySenderID, name: 'User', score: 0 });
                  } else {
                    console.log(`[DEBUG] नया यूजर ${replySenderID} जोड़ा गया, नाम: ${ret[replySenderID].name}`);
                    participants.push({ id: replySenderID, name: ret[replySenderID].name, score: 0 });
                  }
                });
              }

              // जवाब प्रोसेस करना
              const participant = participants.find(p => p.id === replySenderID);
              if (participant && !answered.has(replySenderID)) {
                answered.add(replySenderID);
                const isCorrect = replyBody === q.answer || (replySenderID === shalenderID); // शैलेंद्र के लिए सारे जवाब सही
                if (isCorrect) {
                  participant.score += currentQuestion === 4 ? 2 : 1;
                  api.sendMessage(`@${participant.name} का जवाब ${replyBody} सही! +${currentQuestion === 4 ? 2 : 1} पॉइंट 😎`, threadID);
                } else {
                  api.sendMessage(`@${participant.name} का जवाब ${replyBody} गलत! 😜`, threadID);
                }
                // अगर सभी ने जवाब दे दिया
                if (answered.size === participants.length) {
                  clearTimeout(timeout);
                  currentQuestion++;
                  askQuestion(sentMessage.messageID);
                }
              }
            }
          }
        });
      };

      // कॉम्पिटिशन शुरू करना
      const introMessage = `${decorativeLines[Math.floor(Math.random() * decorativeLines.length)]}\n` +
                           `☞︎ ${participants.map(p => `@${p.name}`).join(' vs ')} का तगड़ा कॉम्पिटिशन! 🥊\n` +
                           `2 पहेलियाँ, 2 GK, 1 फनी/ह्यूमैनिटी सवाल! जवाब A/B/C/D में 40 सेकंड में रिप्लाई करो! 😎\n` +
                           `${emojiSets[Math.floor(Math.random() * emojiSets.length)]}\n` +
                           `${decorativeLines[Math.floor(Math.random() * decorativeLines.length)]}`;
      const mentions = participants.map(p => ({
        tag: `@${p.name}`,
        id: p.id,
        fromIndex: introMessage.indexOf(`@${p.name}`)
      }));
      const sentIntro = await api.sendMessage({ body: introMessage, mentions }, threadID);
      console.log(`[DEBUG] Compare started: ${participants.map(p => p.name).join(' vs ')}`);
      await askQuestion(sentIntro.messageID);
    } catch (err) {
      console.error(`[ERROR] Compare command error: ${err.message}`);
      api.sendMessage(`❌ कमांड चलाने में गलती: ${err.message} 🕉️`, threadID);
    }
  }
};
