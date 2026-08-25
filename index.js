const TelegramBot = require('node-telegram-bot-api');
const token = process.env.BOT_TOKEN;

// ⚠️ ضع رقم Chat ID الخاص بك هنا
const ADMIN_CHAT_ID = 'YOUR_TELEGRAM_CHAT_ID';

if (!token) {
  console.error("BOT_TOKEN missing!");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

const userSessions = {};
const userBalances = {}; // ID -> الرصيد

// رابط صورة QR لشام كاش (تأكد من إبقاء الصورة مرفوعة بنفس المسار أو استخدام رابط مباشر)
const SHAM_QR_IMAGE = 'https://i.ibb.co/QrSham.png'; 

function mainKeyboard(chatId) {
  const options = {
    reply_markup: {
      keyboard: [
        [{ text: '➕ إنشاء حساب جديد' }],
        [{ text: '💳 شحن الحساب 💸' }, { text: '🏧 سحب من الحساب 💸' }],
        [{ text: '🎁 إهداء رصيد لزبون' }, { text: '💰 عرض رصيد الحساب' }],
        [{ text: '🌐 رابط المنصة' }, { text: '💬 التواصل مع الدعم' }]
      ],
      resize_keyboard: true,
      persistent: true
    }
  };
  bot.sendMessage(chatId, "أهلاً بك في دعم روليكس | ROLEX Bot 💎\nاختر الخدمة المطلوبة من القائمة أدناه:", options);
}

function methodKeyboard(chatId, actionType) {
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
  bot.sendMessage(chatId, `اختر وسيلة ${actionType}:`, options);
}

bot.onText(/\/start/, (msg) => {
  delete userSessions[msg.chat.id];
  mainKeyboard(msg.chat.id);
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const username = msg.from.username ? `@${msg.from.username}` : `مستخدم (ID: ${chatId})`;

  if (!text || text === '/start') return;

  if (text === '🔙 العودة للقائمة الرئيسية') {
    delete userSessions[chatId];
    return mainKeyboard(chatId);
  }

  // القائمة الرئيسية
  switch (text) {
    case '➕ إنشاء حساب جديد':
      userSessions[chatId] = { step: 'CREATE_USER' };
      return bot.sendMessage(chatId, "يرجى كتابة اسم المستخدم (Username) باللغة الإنكليزية فقط (بدون حروف أو أرقام عربية):");

    case '💳 شحن الحساب 💸':
    case 'شحن حساب ايشانسي':
      return methodKeyboard(chatId, 'شحن');

    case '🏧 سحب من الحساب 💸':
    case 'سحب رصيد ايشانسي':
      return methodKeyboard(chatId, 'سحب');

    case '💰 عرض رصيد الحساب':
      const bal = userBalances[chatId] || 0;
      return bot.sendMessage(chatId, `💰 رصيدك الحالي في البوت هو: ${bal.toLocaleString()} ل.س.`);

    case '🎁 إهداء رصيد لزبون':
      userSessions[chatId] = { step: 'GIFT_TARGET_ID' };
      return bot.sendMessage(chatId, "يرجى إدخال معرف (ID) الزبون المراد إهداء الرصيد له:");

    case '🌐 رابط المنصة':
      return bot.sendMessage(chatId, "رابط منصة ichancy الرسمي:\nhttps://m.ichancy2.com");

    case '💬 التواصل مع الدعم':
      return bot.sendMessage(chatId, "للتواصل مع الدعم الفني:\nhttps://t.me/RolexHelpDesk_bot");
  }

  // التعامل مع الوسائل
  if (text === '🇸🇾 شام كاش (شحن)') {
    userSessions[chatId] = { step: 'SHAM_TX_ID' };
    bot.sendMessage(chatId, `📌 **تعليمات الشحن عبر شام كاش:**\n• الحد الأدنى للشحن: **20,000 ل.س**\n• سعر الصرف: **1$ = 13,150 ل.س**\n• المحفظة: فاطمة خالد العويد\n\nيرجى مسح الـ QR وإكمال التحويل ثم إرسال **رقم العملية**:`);
    return;
  }

  if (text === '📱 سيريتل كاش (شحن)') {
    userSessions[chatId] = { step: 'SYRIATEL_TX_ID' };
    return bot.sendMessage(chatId, `📌 **تعليمات الشحن عبر سيريتل كاش:**\nيرجى التحويل إلى الرقم المعرف: \`23557475\`\n\nبعد التحويل، أرسل **رقم العملية**:`, { parse_mode: 'Markdown' });
  }

  if (text.includes('(سحب)')) {
    const isSham = text.includes('شام كاش');
    const minLimit = isSham ? 200000 : 100000;
    userSessions[chatId] = { step: 'WITHDRAW_AMOUNT', method: isSham ? 'شام كاش' : 'سيريتل كاش', minLimit: minLimit };
    return bot.sendMessage(chatId, `يرجى أدخال المبلغ المراد سحبه (الحد الأدنى عبر ${isSham ? 'شام كاش 200,000' : 'سيريتل كاش 100,000'} ل.س):`);
  }

  // إدارة الجلسات والمتطلبات
  const session = userSessions[chatId];
  if (session) {

    // 1. مراحل إنشاء الحساب
    if (session.step === 'CREATE_USER') {
      if (/[\u0600-\u06FF]/.test(text)) {
        return bot.sendMessage(chatId, "❌ يمنع استخدام الأحرف أو الأرقام العربية! أعد كتابة اسم المستخدم بالإنكليزية:");
      }
      session.desiredUser = text;
      session.step = 'CREATE_PASS';
      return bot.sendMessage(chatId, "أدخل كلمة مرور قوية (يجب أن تحتوي على أحرف إنكليزية وأرقام وتكون 8 خانات على الأقل):");
    }

    if (session.step === 'CREATE_PASS') {
      const hasLetter = /[a-zA-Z]/.test(text);
      const hasNum = /[0-9]/.test(text);
      if (text.length < 8 || !hasLetter || !hasNum || /[\u0600-\u06FF]/.test(text)) {
        return bot.sendMessage(chatId, "❌ كلمة المرور ضعيفة أو تحتوي أرقام/حروف عربية! يجب أن تتكون من أحرف إنكليزية وأرقام وبطول 8 خانات على الأقل:");
      }

      if (ADMIN_CHAT_ID !== 'YOUR_TELEGRAM_CHAT_ID') {
        bot.sendMessage(ADMIN_CHAT_ID, `📩 **طلب إنشاء حساب جديد**\n👤 الزبون: ${username}\n🆔 ID: \`${chatId}\`\n👤 اسم الحساب: \`${session.desiredUser}\`\n🔑 كلمة السر: \`${text}\``, { parse_mode: 'Markdown' });
      }

      delete userSessions[chatId];
      bot.sendMessage(chatId, `✅ تم استلام طلب إنشاء الحساب بنجاح!\n\nبيانات التسجيل المفترضة:\n👤 المستخدم: \`${session.desiredUser}\`\n🔑 كلمة السر: \`${text}\`\n\nسيتم تفعيل الحساب فور موافقة الإدارة.`, {
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

    // 2. مراحل شحن شام كاش
    if (session.step === 'SHAM_TX_ID') {
      session.txId = text;
      session.step = 'SHAM_AMOUNT';
      return bot.sendMessage(chatId, "أدخل قيمة المبلغ الذي قمت بتحويله (بالليرات السورية):");
    }

    if (session.step === 'SHAM_AMOUNT') {
      const amount = parseInt(text.replace(/[^0-9]/g, ''));
      if (isNaN(amount) || amount < 20000) {
        return bot.sendMessage(chatId, "❌ المبلغ أدنى من الحد الأدنى المقبول (20,000 ل.س). يرجى إعادة إدخال المبلغ الصحيح:");
      }

      if (ADMIN_CHAT_ID !== 'YOUR_TELEGRAM_CHAT_ID') {
        bot.sendMessage(ADMIN_CHAT_ID, `💳 **إيداع جديد (شام كاش)**\n👤 الزبون: ${username}\n🆔 ID: \`${chatId}\`\n🔢 رقم العملية: \`${session.txId}\`\n💰 المبلغ: ${amount.toLocaleString()} ل.س`, { parse_mode: 'Markdown' });
      }

      delete userSessions[chatId];
      bot.sendMessage(chatId, "✅ تم إرسال معلومات التحويل للإدارة للتأكد والاضافة لرصيدك.");
      return mainKeyboard(chatId);
    }

    // 3. مراحل شحن سيريتل كاش
    if (session.step === 'SYRIATEL_TX_ID') {
      session.txId = text;
      session.step = 'SYRIATEL_AMOUNT';
      return bot.sendMessage(chatId, "أدخل قيمة المبلغ الذي قمت بتحويله:");
    }

    if (session.step === 'SYRIATEL_AMOUNT') {
      const amount = parseInt(text.replace(/[^0-9]/g, ''));
      if (isNaN(amount)) {
        return bot.sendMessage(chatId, "❌ أدخل مبلغاً صحيحاً بالأرقام:");
      }

      if (ADMIN_CHAT_ID !== 'YOUR_TELEGRAM_CHAT_ID') {
        bot.sendMessage(ADMIN_CHAT_ID, `📱 **إيداع جديد (سيريتل كاش)**\n👤 الزبون: ${username}\n🆔 ID: \`${chatId}\`\n🔢 رقم العملية: \`${session.txId}\`\n💰 المبلغ: ${amount.toLocaleString()} ل.س`, { parse_mode: 'Markdown' });
      }

      delete userSessions[chatId];
      bot.sendMessage(chatId, "✅ تم إرسال بيانات عملية التحويل بنجاح للمراجعة.");
      return mainKeyboard(chatId);
    }

    // 4. مراحل السحب
    if (session.step === 'WITHDRAW_AMOUNT') {
      const amount = parseInt(text.replace(/[^0-9]/g, ''));
      const currentBal = userBalances[chatId] || 0;

      if (isNaN(amount) || amount < session.minLimit) {
        return bot.sendMessage(chatId, `❌ المبلغ أقل من الحد الأدنى للسحب (${session.minLimit.toLocaleString()} ل.س).`);
      }

      if (amount > currentBal) {
        return bot.sendMessage(chatId, `❌ لا يوجد رصيد كافٍ! رصيدك المتاح هو: ${currentBal.toLocaleString()} ل.س.`);
      }

      userBalances[chatId] -= amount;
      if (ADMIN_CHAT_ID !== 'YOUR_TELEGRAM_CHAT_ID') {
        bot.sendMessage(ADMIN_CHAT_ID, `🏧 **طلب سحب**\n👤 الزبون: ${username}\n🆔 ID: \`${chatId}\`\n🏦 الوسيلة: ${session.method}\n💰 المبلغ: ${amount.toLocaleString()} ل.س`, { parse_mode: 'Markdown' });
      }

      delete userSessions[chatId];
      bot.sendMessage(chatId, "✅ تم رفع طلب السحب وسوف ينسق معك فريق الدعم لتحويل المبلغ.");
      return mainKeyboard(chatId);
    }

    // 5. مراحل إهداء الرصيد
    if (session.step === 'GIFT_TARGET_ID') {
      const targetId = text.trim();
      if (targetId === String(chatId)) {
        return bot.sendMessage(chatId, "❌ لا يمكنك تحويل الرصيد لنفسك!");
      }
      session.targetId = targetId;
      session.step = 'GIFT_AMOUNT';
      return bot.sendMessage(chatId, `أدخل قيمة المبلغ الذي ترغب في إهدائه إلى (ID: ${targetId}):`);
    }

    if (session.step === 'GIFT_AMOUNT') {
      const giftAmount = parseInt(text.replace(/[^0-9]/g, ''));
      const myBal = userBalances[chatId] || 0;

      if (isNaN(giftAmount) || giftAmount <= 0) {
        return bot.sendMessage(chatId, "❌ يرجى إدخال مبلغ صحيح.");
      }

      if (giftAmount > myBal) {
        return bot.sendMessage(chatId, `❌ لا يوجد رصيد كافٍ لإتمام عملية الإهداء! رصيدك: ${myBal.toLocaleString()} ل.س.`);
      }

      userBalances[chatId] -= giftAmount;
      userBalances[session.targetId] = (userBalances[session.targetId] || 0) + giftAmount;

      // إشعار المستلم
      bot.sendMessage(session.targetId, `🎁 **وصلتك هدية رصيد!**\nلقد قام المستخدم (${username}) بتحويل مبلغ **${giftAmount.toLocaleString()} ل.س** إلى حسابك.`).catch(() => {});

      delete userSessions[chatId];
      bot.sendMessage(chatId, `✅ تم تحويل مبلغ ${giftAmount.toLocaleString()} ل.س بنجاح إلى (ID: ${session.targetId}).`);
      return mainKeyboard(chatId);
    }
  }

  bot.sendMessage(chatId, "تم استلام رسالتك وسنرد عليك قريباً.");
});
