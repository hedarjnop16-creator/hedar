const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const token = process.env.BOT_TOKEN;

// ⚠️ رقم الـ ID الخاص بك لتصلك جميع إشعارات البوت فوراً
const ADMIN_CHAT_ID = '7231201528'; 

if (!token) {
  console.error("BOT_TOKEN missing!");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

const userSessions = {};
const userBalances = {}; 
const botUserIDs = {}; // تخزين ID البوت الخاص بكل زبون

// دالة لتوليد معرف فريد خاص بالبوت للزبون (مثال: ID-58291)
function getOrCreateBotID(chatId) {
  if (!botUserIDs[chatId]) {
    const randomID = Math.floor(10000 + Math.random() * 90000);
    botUserIDs[chatId] = `ID-${randomID}`;
  }
  return botUserIDs[chatId];
}

// دالة البحث عن chatId من خلال botID للإهداء
function findChatIdByBotID(botID) {
  return Object.keys(botUserIDs).find(key => botUserIDs[key] === botID.trim().toUpperCase());
}

function mainKeyboard(chatId) {
  const customID = getOrCreateBotID(chatId);
  const options = {
    reply_markup: {
      keyboard: [
        [{ text: '➕ إنشاء حساب جديد' }],
        [{ text: '💳 شحن حساب ايشانسي' }, { text: '🏧 سحب رصيد ايشانسي' }],
        [{ text: '🎁 إهداء رصيد' }, { text: '💰 رصيد الحساب' }],
        [{ text: '🌐 رابط المنصة' }, { text: '💬 التواصل مع الدعم' }]
      ],
      resize_keyboard: true,
      persistent: true
    }
  };
  bot.sendMessage(chatId, `أهلاً بك في دعم روليكس | Support Rolex 💎\n🆔 المعرف الخاص بك في البوت: \`${customID}\`\nاختر الخدمة المطلوبة:`, { parse_mode: 'Markdown', ...options });
}

function paymentKeyboard(chatId, actionType) {
  const options = {
    reply_markup: {
      keyboard: [
        [{ text: `🇸🇾 شام كاش (${actionType})` }, { text: `📱 سيريتل كاش (${actionType})` }],
        [{ text: '🔙 العودة للقائمة الرئيسية' }]
      ],
      resize_keyboard: true,
      persistent: true
    }
  };
  bot.sendMessage(chatId, `اختر وسيلة الـ ${actionType}:`, options);
}

bot.onText(/\/start/, (msg) => {
  delete userSessions[msg.chat.id];
  mainKeyboard(msg.chat.id);
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const customID = getOrCreateBotID(chatId);
  const username = msg.from.username ? `@${msg.from.username}` : `مستخدم (${customID})`;

  if (!text || text === '/start') return;

  if (text === '🔙 العودة للقائمة الرئيسية') {
    delete userSessions[chatId];
    return mainKeyboard(chatId);
  }

  switch (text) {
    case '➕ إنشاء حساب جديد':
      userSessions[chatId] = { step: 'CREATE_USER' };
      return bot.sendMessage(chatId, "يرجى كتابة اسم المستخدم (Username) المطلوب باللغة الإنكليزية فقط:");

    case '💳 شحن حساب':
    case 'شحن حساب ايشانسي':
      return paymentKeyboard(chatId, 'شحن');

    case '🏧 سحب رصيد':
    case 'سحب رصيد ايشانسي':
      return paymentKeyboard(chatId, 'سحب');

    case '💰 رصيد الحساب':
      const bal = userBalances[chatId] || 0;
      return bot.sendMessage(chatId, `🆔 **معرفك في البوت:** \`${customID}\`\n💰 **رصيدك المتاح:** ${bal.toLocaleString()} ل.س.`, { parse_mode: 'Markdown' });

    case '🎁 إهداء رصيد':
      userSessions[chatId] = { step: 'GIFT_ID' };
      return bot.sendMessage(chatId, "أدخل **معرف الزبون في البوت** (مثال: `ID-12345`) المراد إهداء الرصيد له:");

    case '🌐 رابط المنصة':
      return bot.sendMessage(chatId, "رابط منصة ichancy الرسمي:\nhttps://m.ichancy2.com");

    case '💬 التواصل مع الدعم':
      return bot.sendMessage(chatId, "للتواصل المباشر مع الدعم الفني عبر التلغرام:\nhttps://t.me/RolexHelpDesk_bot");
  }

  // وسائل الدفع للشحن والسحب
  if (text === '🇸🇾 شام كاش (شحن)') {
    userSessions[chatId] = { step: 'SHAM_TX' };
    const qrPath = path.join(__dirname, 'qr.png');
    const captionText = `📌 **تعليمات الشحن عبر شام كاش:**\n\n• معرف الزبون: **${customID}**\n• الحد الأدنى للشحن: **20,000 ل.س**\n• سعر الصرف: **1$ = 13,150 ل.س**\n• اسم الحساب: **فاطمة خالد العويد**\n\nيرجى مسح الـ QR وإكمال التحويل ثم إرسال **رقم العملية**:`;

    try {
      await bot.sendPhoto(chatId, qrPath, { caption: captionText, parse_mode: 'Markdown' });
    } catch (e) {
      await bot.sendMessage(chatId, captionText, { parse_mode: 'Markdown' });
    }
    return;
  }

  if (text === '📱 سيريتل كاش (شحن)') {
    userSessions[chatId] = { step: 'SYRIATEL_TX' };
    return bot.sendMessage(chatId, `📌 **تعليمات الشحن عبر سيريتل كاش:**\n\n• معرف الزبون: **${customID}**\nيرجى التحويل إلى الرقم المعرف: \`23557475\`\n\nبعد التحويل، يرجى كتابة **رقم العملية**:`, { parse_mode: 'Markdown' });
  }

  if (text.includes('(سحب)')) {
    const isSham = text.includes('شام كاش');
    const minLimit = isSham ? 200000 : 100000;
    userSessions[chatId] = { step: 'WITHDRAW_AMOUNT', method: isSham ? 'شام كاش' : 'سيريتل كاش', minLimit: minLimit };
    return bot.sendMessage(chatId, `يرجى إدخال المبلغ المراد سحبه (الحد الأدنى عبر ${isSham ? 'شام كاش 200,000' : 'سيريتل كاش 100,000'} ل.س):`);
  }

  const session = userSessions[chatId];
  if (session) {

    // 1. إنشاء الحساب
    if (session.step === 'CREATE_USER') {
      if (/[\u0600-\u06FF]/.test(text)) {
        return bot.sendMessage(chatId, "❌ يمنع إدخال أحرف أو أرقام عربية! اكتب اسم المستخدم بالإنكليزية فقط:");
      }
      session.desiredUser = text;
      session.step = 'CREATE_PASS';
      return bot.sendMessage(chatId, "أدخل كلمة مرور قوية تحتوي على أحرف إنكليزية وأرقام:");
    }

    if (session.step === 'CREATE_PASS') {
      if (text.length < 8 || !/[a-zA-Z]/.test(text) || !/[0-9]/.test(text) || /[\u0600-\u06FF]/.test(text)) {
        return bot.sendMessage(chatId, "❌ كلمة المرور ضعيفة! يجب أن تكون إنكليزية وبطول 8 خانات على الأقل:");
      }

      bot.sendMessage(ADMIN_CHAT_ID, `🚨 **طلب إنشاء حساب جديد**\n👤 الزبون: ${username}\n🆔 معرف البوت: \`${customID}\`\n👤 اسم الحساب: \`${session.desiredUser}\`\n🔑 كلمة السر: \`${text}\``, { parse_mode: 'Markdown' });

      delete userSessions[chatId];
      bot.sendMessage(chatId, `✅ تم استلام طلب إنشاء الحساب بنجاح!\n\n👤 الحساب: \`${session.desiredUser}\`\n🔑 كلمة السر: \`${text}\`\n\nسيتم التفعيل والرد عليك فوراً.`, {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            [{ text: 'شحن حساب ايشانسي' }, { text: 'سحب رصيد ايشانسي' }],
            [{ text: '🔙 العودة للقائمة الرئيسية' }]
          ],
          resize_keyboard: true
        }
      });
      return;
    }

    // 2. شحن شام كاش
    if (session.step === 'SHAM_TX') {
      session.txId = text;
      session.step = 'SHAM_AMOUNT';
      return bot.sendMessage(chatId, "يرجى كتابة المبلغ الذي قمت بتحويله (بالليرات السورية):");
    }

    if (session.step === 'SHAM_AMOUNT') {
      const amount = parseInt(text.replace(/[^0-9]/g, ''));
      if (isNaN(amount) || amount < 20000) {
        return bot.sendMessage(chatId, "❌ المبلغ أقل من الحد الأدنى للشحن (20,000 ل.س). أعد كتابة المبلغ:");
      }

      bot.sendMessage(ADMIN_CHAT_ID, `⚡ **إيداع جديد (شام كاش)**\n👤 الزبون: ${username}\n🆔 معرف البوت: \`${customID}\`\n🔢 رقم العملية: \`${session.txId}\`\n💰 المبلغ: ${amount.toLocaleString()} ل.س`, { parse_mode: 'Markdown' });

      delete userSessions[chatId];
      bot.sendMessage(chatId, "✅ تم إرسال طلب الشحن بنجاح ومراجعته من قبل الدعم.");
      return mainKeyboard(chatId);
    }

    // 3. شحن سيريتل كاش
    if (session.step === 'SYRIATEL_TX') {
      session.txId = text;
      session.step = 'SYRIATEL_AMOUNT';
      return bot.sendMessage(chatId, "يرجى كتابة المبلغ الذي قمت بتحويله:");
    }

    if (session.step === 'SYRIATEL_AMOUNT') {
      const amount = parseInt(text.replace(/[^0-9]/g, ''));
      if (isNaN(amount)) {
        return bot.sendMessage(chatId, "❌ أرسل المبلغ بالأرقام فقط:");
      }

      bot.sendMessage(ADMIN_CHAT_ID, `⚡ **إيداع جديد (سيريتل كاش)**\n👤 الزبون: ${username}\n🆔 معرف البوت: \`${customID}\`\n🔢 رقم العملية: \`${session.txId}\`\n💰 المبلغ: ${amount.toLocaleString()} ل.س`, { parse_mode: 'Markdown' });

      delete userSessions[chatId];
      bot.sendMessage(chatId, "✅ تم إرسال طلب الشحن بنجاح للتأكد والتحويل.");
      return mainKeyboard(chatId);
    }

    // 4. إجراءات السحب
    if (session.step === 'WITHDRAW_AMOUNT') {
      const amount = parseInt(text.replace(/[^0-9]/g, ''));
      const currentBal = userBalances[chatId] || 0;

      if (isNaN(amount) || amount < session.minLimit) {
        return bot.sendMessage(chatId, `❌ المبلغ أقل من الحد الأدنى للسحب (${session.minLimit.toLocaleString()} ل.س).`);
      }

      if (amount > currentBal) {
        return bot.sendMessage(chatId, `❌ لا يوجد رصيد كافٍ! رصيدك المتاح حالياً هو: ${currentBal.toLocaleString()} ل.س.`);
      }

      userBalances[chatId] -= amount;
      bot.sendMessage(ADMIN_CHAT_ID, `💸 **طلب سحب جديد**\n👤 الزبون: ${username}\n🆔 معرف البوت: \`${customID}\`\n🏦 الوسيلة: ${session.method}\n💰 المبلغ: ${amount.toLocaleString()} ل.س`, { parse_mode: 'Markdown' });

      delete userSessions[chatId];
      bot.sendMessage(chatId, "✅ تم استلام طلب السحب وسيقوم الدعم بمعالجته وتحويل المبلغ فوراً.");
      return mainKeyboard(chatId);
    }

    // 5. إهداء الرصيد بـ معرف البوت الخاص بالزبون
    if (session.step === 'GIFT_ID') {
      const targetBotID = text.trim().toUpperCase();
      const targetChatId = findChatIdByBotID(targetBotID);

      if (!targetChatId) {
        return bot.sendMessage(chatId, "❌ المعرف غير صحيح أو لم يقم صاحب هذا المعرف بفتح البوت من قبل!");
      }
      if (targetChatId === String(chatId)) {
        return bot.sendMessage(chatId, "❌ لا يمكنك تحويل الرصيد لنفسك!");
      }

      session.targetChatId = targetChatId;
      session.targetBotID = targetBotID;
      session.step = 'GIFT_AMOUNT';
      return bot.sendMessage(chatId, `أدخل المبلغ المراد إهداؤه إلى صاحب المعرف (\`${targetBotID}\`):`, { parse_mode: 'Markdown' });
    }

    if (session.step === 'GIFT_AMOUNT') {
      const giftAmt = parseInt(text.replace(/[^0-9]/g, ''));
      const myBal = userBalances[chatId] || 0;

      if (isNaN(giftAmt) || giftAmt <= 0) {
        return bot.sendMessage(chatId, "❌ أدخل مبلغاً صحيحاً بالأرقام:");
      }

      if (giftAmt > myBal) {
        return bot.sendMessage(chatId, `❌ رصيدك الحالي غير كافٍ! رصيدك: ${myBal.toLocaleString()} ل.س.`);
      }

      userBalances[chatId] -= giftAmt;
      userBalances[session.targetChatId] = (userBalances[session.targetChatId] || 0) + giftAmt;

      bot.sendMessage(session.targetChatId, `🎁 **وصلتك هدية رصيد!**\nقام الزبون (${customID}) بتحويل مبلغ **${giftAmt.toLocaleString()} ل.س** لرصيدك.`);

      delete userSessions[chatId];
      bot.sendMessage(chatId, `✅ تم تحويل ${giftAmt.toLocaleString()} ل.س بنجاح للزبون (\`${session.targetBotID}\`).`, { parse_mode: 'Markdown' });
      return mainKeyboard(chatId);
    }
  }

  bot.sendMessage(chatId, "تم استلام رسالتك وسنرد عليك قريباً.");
});
