module.exports = {
    stickerspam: async (api, event, botState, favoriteStickers) => {
        try {
            const args = event.body.split(' ');
            const threadID = event.threadID;
            const messageID = event.messageID;

            // Initialize botState.stickerSpam if not present
            if (!botState.stickerSpam) {
                botState.stickerSpam = {};
                console.warn(`botState.stickerSpam initialized in stickerspam.js for thread ${threadID}`);
            }

            // Validate args
            if (!args[1] || !['start', 'stop'].includes(args[1].toLowerCase())) {
                api.sendMessage('❌ Invalid command. Usage: #send sticker start <count> or #send sticker stop', threadID, messageID);
                return;
            }

            if (args[1].toLowerCase() === 'start') {
                if (!args[2]) {
                    api.sendMessage('❌ Please provide a number of stickers. Usage: #send sticker start <count>', threadID, messageID);
                    return;
                }

                const count = parseInt(args[2]);
                if (isNaN(count) || count < 1 || count > 50) {
                    api.sendMessage('❌ Please provide a valid number of stickers (1-50).', threadID, messageID);
                    return;
                }

                if (!favoriteStickers || favoriteStickers.length === 0) {
                    api.sendMessage('⚠️ No stickers available. Check favoriteStickers configuration.', threadID, messageID);
                    console.error(`No stickers in favoriteStickers for thread ${threadID}`);
                    return;
                }

                if (!botState.stickerSpam[threadID]) {
                    botState.stickerSpam[threadID] = { active: false, count: 0 };
                }

                if (botState.stickerSpam[threadID].active) {
                    api.sendMessage('⚠️ Sticker spam already running in this thread!', threadID, messageID);
                    return;
                }

                botState.stickerSpam[threadID].active = true;
                botState.stickerSpam[threadID].count = count;

                api.sendMessage(`🚀 Starting sticker spam with ${count} stickers!`, threadID, messageID);
                console.log(`Sticker spam started for thread ${threadID}: ${count} stickers`);

                for (let i = 0; i < count && botState.stickerSpam[threadID].active; i++) {
                    try {
                        const stickerID = favoriteStickers[Math.floor(Math.random() * favoriteStickers.length)];
                        await api.sendMessage({ sticker: stickerID }, threadID);
                        console.log(`Sticker ${stickerID} sent to thread ${threadID}`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (err) {
                        console.error(`Sticker spam error for thread ${threadID}:`, err.message || err);
                        api.sendMessage('⚠️ Error sending sticker. Stopping spam.', threadID);
                        botState.stickerSpam[threadID].active = false;
                        break;
                    }
                }

                if (botState.stickerSpam[threadID].active) {
                    botState.stickerSpam[threadID].active = false;
                    api.sendMessage('✅ Sticker spam completed!', threadID);
                    console.log(`Sticker spam completed for thread ${threadID}`);
                }
            } else if (args[1].toLowerCase() === 'stop') {
                if (botState.stickerSpam[threadID] && botState.stickerSpam[threadID].active) {
                    botState.stickerSpam[threadID].active = false;
                    api.sendMessage('🛑 Sticker spam stopped.', threadID, messageID);
                    console.log(`Sticker spam stopped for thread ${threadID}`);
                } else {
                    api.sendMessage('⚠️ No active sticker spam in this thread.', threadID, messageID);
                }
            }
        } catch (e) {
            api.sendMessage('⚠️ Error in sticker spam command.', threadID);
            console.error(`Sticker spam error for thread ${threadID}:`, e.message || e);
        }
    }
};
