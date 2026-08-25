const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const token = process.env.BOT_TOKEN;

// ⚠️ معرف الأدمن لتلقي الطلبات والتحكم بالقبول والرفض
const ADMIN_CHAT_ID = '7231201528'; 

if (!token) {
  console.error("BOT_TOKEN missing!");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

const userSessions = {};
const userBalances = {}; 
const botUserIDs = {}; 
const userAccounts = {}; // تخزين اسم المستخدم وكلمة السر الخاصة بكل زبون

function getOrCreateBotID(chatId) {
  if (!botUserIDs[chatId]) {
    const randomID = Math.floor(10000 + Math.random() * 90000);
    botUserIDs[chatId] = `ID-${randomID}`;
  }
  return botUserIDs[chatId];
}

function findChatIdByBotID(botID) {
  return Object.keys(botUserIDs).find(key => botUserIDs[key] === botID.trim().toUpperCase());
}

// 1. القائمة الرئيسية
function mainKeyboard(chatId) {
  const customID = getOrCreateBotID(chatId);
  const isApproved = !!userAccounts[chatId]?.approved;

  let keyboard = [];

  if (isApproved) {
    keyboard = [
      [{ text: '🎮 حساب ichancy' }],
      [{ text: '💳 شحن محفظة البوت' }, { text: '🏧 سحب من محفظة البوت' }],
      [{ text: '🎁 إهداء رصيد' }, { text: '💰 رصيد الحساب' }],
      [{ text: '🌐 رابط المنصة' }, { text: '💬 التواصل مع الدعم' }]
    ];
  } else {
    keyboard = [
      [{ text: '➕ إنشاء حساب جديد' }],
      [{ text: '🎁 إهداء رصيد' }, { text: '💰 رصيد الحساب' }],
      [{ text: '🌐 رابط المنصة' }, { text: '💬 التواصل مع الدعم' }]
    ];
  }

  const options = {
    reply_markup: {
      keyboard: keyboard,
      resize_keyboard: true,
      persistent: true
    }
  };
  bot.sendMessage(chatId, `أهلاً بك في دعم روليكس | Support Rolex 💎\n🆔 المعرف الخاص بك في البوت: \`${customID}\`\nاختر الخدمة المطلوبة:`, { parse_mode: 'Markdown', ...options });
}

// 2. قائمة حساب ichancy (تظهر اسم الحساب وكلمة السر وتحتها أزرار الشحن والسحب)
function ichancyAccountMenu(chatId) {
  const acc = userAccounts[chatId];
  const messageText = `🎮 **بيانات حسابك في منصة ichancy:**\n\n👤 **اسم الحساب:** \`${acc.username}\`\n🔑 **كلمة السر:** \`${acc.password}\``;

  const options = {
    parse_mode: 'Markdown',
    reply_markup: {
      keyboard: [
        [{ text: '💳 شحن حساب ichancy' }, { text: '🏧 سحب حساب ichancy' }],
        [{ text: '🔙 العودة للقائمة الرئيسية' }]
      ],
      resize_keyboard: true,
      persistent: true
    }
  };

  bot.sendMessage(chatId, messageText, options);
}

// 3. قائمة اختيار طرق الدفع (شام كاش وسيريتل كاش)
function paymentKeyboard(chatId, targetType, actionType) {
  userSessions[chatId] = { targetType: targetType, actionType: actionType };

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
  bot.sendMessage(chatId, `اختر طريقة الـ ${actionType} لـ (${targetType}):`, options);
}

bot.onText(/\/start/, (msg) => {
  delete userSessions[msg.chat.id];
  mainKeyboard(msg.chat.id);
});

// التعامل مع أزرار قبول ورفض الحسابات من الأدمن
bot.on('callback_query', async (query) => {
  const data = query.data;
  const messageId = query.message.message_id;

  if (data.startsWith('APPROVE_')) {
    const targetChatId = parseInt(data.replace('APPROVE_', ''));
    if (userAccounts[targetChatId]) {
      userAccounts[targetChatId].approved = true;
    }

    bot.editMessageText(query.message.text + "\n\n✅ **تم قبول الحساب وتفعيله.**", {
      chat_id: ADMIN_CHAT_ID,
      message_id: messageId,
      parse_mode: 'Markdown'
    });

    bot.sendMessage(targetChatId, "🎉 **مبروك! تم قبول حسابك وتفعيله بنجاح.**\nتم فتح خيارات منصة ichancy ومحفظة البوت لك الان.");
    mainKeyboard(targetChatId);
  }

  if (data.startsWith('REJECT_')) {
    const targetChatId = parseInt(data.replace('REJECT_', ''));
    delete userAccounts[targetChatId];

    bot.editMessageText(query.message.text + "\n\n❌ **تم رفض طلب الحساب.**", {
      chat_id: ADMIN_CHAT_ID,
      message_id: messageId,
      parse_mode: 'Markdown'
    });

    bot.sendMessage(targetChatId, "❌ تم رفض طلب إنشاء الحساب من قبل الإدارة. يرجى التواصل مع الدعم.");
  }
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

  // الضغط على زر حساب ichancy
  if (text === '🎮 حساب ichancy') {
    if (!userAccounts[chatId]?.approved) {
      return bot.sendMessage(chatId, "⚠️ يجب قبول حسابك من قبل الإدارة أولاً.");
    }
    return ichancyAccountMenu(chatId);
  }

  // خيارات الشحن والسحب
  if (text === '💳 شحن حساب ichancy') return paymentKeyboard(chatId, 'حساب ichancy', 'شحن');
  if (text === '🏧 سحب حساب ichancy') return paymentKeyboard(chatId, 'حساب ichancy', 'سحب');
  if (text === '💳 شحن محفظة البوت') return paymentKeyboard(chatId, 'محفظة البوت', 'شحن');
  if (text === '🏧 سحب من محفظة البوت') return paymentKeyboard(chatId, 'محفظة البوت', 'سحب');

  switch (text) {
    case '➕ إنشاء حساب جديد':
      if (userAccounts[chatId]?.approved) {
        return bot.sendMessage(chatId, "✅ لديك حساب مفعّل بالفعل!");
      }
      userSessions[chatId] = { step: 'CREATE_USER' };
      return bot.sendMessage(chatId, "يرجى كتابة اسم المستخدم (Username) المطلوب باللغة الإنكليزية فقط:");

    case '💰 رصيد الحساب':
      const bal = userBalances[chatId] || 0;
      return bot.sendMessage(chatId, `🆔 **معرفك في البوت:** \`${customID}\`\n💰 **رصيدك المتاح في المحفظة:** ${bal.toLocaleString()} ل.س.`, { parse_mode: 'Markdown' });

    case '🎁 إهداء رصيد':
      userSessions[chatId] = { step: 'GIFT_ID' };
      return bot.sendMessage(chatId, "أدخل **معرف الزبون في البوت** (مثال: `ID-12345`) المراد إهداء الرصيد له:");

    case '🌐 رابط المنصة':
      return bot.sendMessage(chatId, "رابط منصة ichancy الرسمي:\nhttps://m.ichancy2.com");

    case '💬 التواصل مع الدعم':
      return bot.sendMessage(chatId, "للتواصل المباشر مع الدعم الفني عبر التلغرام:\nhttps://t.me/RolexHelpDesk_bot");
  }

  // الطرق عند اختيار (شام كاش أو سيريتل كاش)
  if (text.includes('شام كاش')) {
    const session = userSessions[chatId] || {};
    session.method = 'شام كاش';

    if (session.actionType === 'شحن') {
      session.step = 'TX_ID';
      const qrPath = path.join(__dirname, 'qr.png');
      const captionText = `📌 **تعليمات الشحن عبر شام كاش (${session.targetType}):**\n\n• معرف الزبون: **${customID}**\n• الحد الأدنى للشحن: **20,000 ل.س**\n• سعر الصرف: **1$ = 13,150 ل.س**\n• اسم الحساب: **فاطمة خالد العويد**\n\nيرجى مسح الـ QR وإكمال التحويل ثم إرسال **رقم العملية**:`;

      try {
        await bot.sendPhoto(chatId, qrPath, { caption: captionText, parse_mode: 'Markdown' });
      } catch (e) {
        await bot.sendMessage(chatId, captionText, { parse_mode: 'Markdown' });
      }
      return;
    } else if (session.actionType === 'سحب') {
      session.step = 'WITHDRAW_AMOUNT';
      session.minLimit = 200000;
      return bot.sendMessage(chatId, `يرجى إدخال المبلغ المراد سحبه من (${session.targetType}) عبر شام كاش (الحد الأدنى 200,000 ل.س):`);
    }
  }

  if (text.includes('سيريتل كاش')) {
    const session = userSessions[chatId] || {};
    session.method = 'سيريتل كاش';

    if (session.actionType === 'شحن') {
      session.step = 'TX_ID';
      return bot.sendMessage(chatId, `📌 **تعليمات الشحن عبر سيريتل كاش (${session.targetType}):**\n\n• معرف الزبون: **${customID}**\nيرجى التحويل إلى الرقم المعرف: \`23557475\`\n\nبعد التحويل، يرجى كتابة **رقم العملية**:`, { parse_mode: 'Markdown' });
    } else if (session.actionType === 'سحب') {
      session.step = 'WITHDRAW_AMOUNT';
      session.minLimit = 100000;
      return bot.sendMessage(chatId, `يرجى إدخال المبلغ المراد سحبه من (${session.targetType}) عبر سيريتل كاش (الحد الأدنى 100,000 ل.س):`);
    }
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

      userAccounts[chatId] = {
        username: session.desiredUser,
        password: text,
        approved: false
      };

      const adminOptions = {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ قبول الحساب', callback_data: `APPROVE_${chatId}` },
              { text: '❌ رفض الحساب', callback_data: `REJECT_${chatId}` }
            ]
          ]
        }
      };

      bot.sendMessage(ADMIN_CHAT_ID, `🚨 **طلب إنشاء حساب جديد**\n\n👤 الزبون: ${username}\n🆔 معرف البوت: \`${customID}\`\n👤 اسم الحساب: \`${session.desiredUser}\`\n🔑 كلمة السر: \`${text}\``, adminOptions);

      delete userSessions[chatId];
      return bot.sendMessage(chatId, `⏳ تم إرسال طلب إنشاء الحساب إلى الإدارة.\nسيتم تفعيل حسابك وإعلامك فور قبول الطلب.`);
    }

    // 2. الشحن (إدخال رقم العملية ثم المبلغ)
    if (session.step === 'TX_ID') {
      session.txId = text;
      session.step = 'CHARGE_AMOUNT';
      return bot.sendMessage(chatId, "يرجى كتابة المبلغ الذي قمت بتحويله (بالليرات السورية):");
    }

    if (session.step === 'CHARGE_AMOUNT') {
      const amount = parseInt(text.replace(/[^0-9]/g, ''));
      if (isNaN(amount)) {
        return bot.sendMessage(chatId, "❌ يرجى إدخال المبلغ بالأرقام فقط:");
      }

      const accInfo = userAccounts[chatId];
      const accDetails = accInfo ? `\n👤 حساب المنصة: \`${accInfo.username}\`` : '';

      bot.sendMessage(ADMIN_CHAT_ID, `⚡ **طلب شحن جديد (${session.targetType})**\n\n👤 الزبون: ${username}\n🆔 معرف البوت: \`${customID}\`${accDetails}\n🏦 الوسيلة: ${session.method}\n🔢 رقم العملية: \`${session.txId}\`\n💰 المبلغ: ${amount.toLocaleString()} ل.س`, { parse_mode: 'Markdown' });

      delete userSessions[chatId];
      bot.sendMessage(chatId, "✅ تم إرسال طلب الشحن بنجاح ومراجعته من قبل الدعم.");
      return mainKeyboard(chatId);
    }

    // 3. السحب
    if (session.step === 'WITHDRAW_AMOUNT') {
      const amount = parseInt(text.replace(/[^0-9]/g, ''));

      if (isNaN(amount) || amount < session.minLimit) {
        return bot.sendMessage(chatId, `❌ المبلغ أقل من الحد الأدنى للسحب (${session.minLimit.toLocaleString()} ل.س).`);
      }

      if (session.targetType === 'محفظة البوت') {
        const currentBal = userBalances[chatId] || 0;
        if (amount > currentBal) {
          return bot.sendMessage(chatId, `❌ لا يوجد رصيد كافٍ بالمحفظة! رصيدك: ${currentBal.toLocaleString()} ل.س.`);
        }
        userBalances[chatId] -= amount;
      }

      const accInfo = userAccounts[chatId];
      const accDetails = accInfo ? `\n👤 حساب المنصة: \`${accInfo.username}\`` : '';

      bot.sendMessage(ADMIN_CHAT_ID, `💸 **طلب سحب جديد (${session.targetType})**\n\n👤 الزبون: ${username}\n🆔 معرف البوت: \`${customID}\`${accDetails}\n🏦 الوسيلة: ${session.method}\n💰 المبلغ: ${amount.toLocaleString()} ل.س`, { parse_mode: 'Markdown' });

      delete userSessions[chatId];
      bot.sendMessage(chatId, "✅ تم استلام طلب السحب وسيقوم الدعم بمعالجته وتحويل المبلغ فوراً.");
      return mainKeyboard(chatId);
    }

    // 4. إهداء الرصيد
    if (session.step === 'GIFT_ID') {
      const targetBotID = text.trim().toUpperCase();
      const targetChatId = findChatIdByBotID(targetBotID);

      if (!targetChatId) {
        return bot.sendMessage(chatId, "❌ المعرف غير صحيح أو لم يقم صاحب هذا المعرف بفتح البوت!");
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
