const TelegramBot = require('node-telegram-bot-api');
const token = process.env.BOT_TOKEN;

// ⚠️ ضع رقم Chat ID الخاص بك هنا لكي تصلك الطلبات والإشعارات فوراً
const ADMIN_CHAT_ID = 'YOUR_TELEGRAM_CHAT_ID'; 

if (!token) {
  console.error("BOT_TOKEN missing!");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// قاعدة بيانات مؤقتة لتتبع حالات وحسابات الزبائن
const userSessions = {};
const userBalances = {}; // تخزين الأرصدة (ID المستخدم -> الرصيد)

// القائمة الرئيسية
function mainKeyboard(chatId) {
  const options = {
    reply_markup: {
      keyboard: [
        [{ text: '👤 إنشاء حساب ichancy' }, { text: '💳 شحن حساب' }],
        [{ text: '🏧 سحب أرباح' }, { text: '🎁 أكواد الهدايا' }],
        [{ text: '🌐 رابط المنصة' }, { text: '💬 التواصل مع الدعم' }]
      ],
      resize_keyboard: true,
      persistent: true
    }
  };
  bot.sendMessage(chatId, "أهلاً بك في دعم روليكس | Support Rolex 💎\nاختر الخدمة المطلوبة من القائمة أدناه:", options);
}

// أزرار اختيار المحفظة للشحن والسحب
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

  if (!text) return;
  if (text === '/start') return;

  // زر العودة
  if (text === '🔙 العودة للقائمة الرئيسية') {
    delete userSessions[chatId];
    return mainKeyboard(chatId);
  }

  // 1. التعامل مع الخيارات الرئيسية
  switch (text) {
    case '👤 إنشاء حساب ichancy':
      userSessions[chatId] = { step: 'AWAITING_USERNAME' };
      return bot.sendMessage(chatId, "يرجى كتابة اسم المستخدم (Username) المطلوب باللغة الإنكليزية فقط (بدون حروف أو أرقام عربية):");

    case '💳 شحن حساب':
      return methodKeyboard(chatId, 'شحن');

    case '🏧 سحب أرباح':
      return methodKeyboard(chatId, 'سحب');

    case '🌐 رابط المنصة':
      return bot.sendMessage(chatId, "يمكنك الدخول إلى منصة ichancy عبر الرابط التالي:\nhttps://m.ichancy2.com");

    case '💬 التواصل مع الدعم':
      return bot.sendMessage(chatId, "للتواصل المباشر مع فريق الدعم الفني عبر التلغرام:\nhttps://t.me/RolexHelpDesk_bot");

    case '🎁 أكواد الهدايا':
      return bot.sendMessage(chatId, "أدخل كود الهدية الخاص بك هنا لتفعيله:");
  }

  // 2. اختيار وسيلة الشحن
  if (text.includes('(شحن)')) {
    const method = text.includes('شام كاش') ? 'شام كاش 🇸🇾' : 'سيريتل كاش 📱';
    userSessions[chatId] = { step: 'AWAITING_DEPOSIT_AMOUNT', method: method };
    return bot.sendMessage(chatId, `لقد اخترت الشحن عبر ${method}.\nيرجى كتابة المبلغ ورقم المعرف (ID) الخاص بك في المنصة:`);
  }

  // 3. اختيار وسيلة السحب مع تحديد الحد الأدنى
  if (text.includes('(سحب)')) {
    const isSham = text.includes('شام كاش');
    const method = isSham ? 'شام كاش 🇸🇾' : 'سيريتل كاش 📱';
    const minLimit = isSham ? 200000 : 100000;

    userSessions[chatId] = { step: 'AWAITING_WITHDRAW_AMOUNT', method: method, minLimit: minLimit };
    return bot.sendMessage(chatId, `لقد اخترت السحب عبر ${method}.\n⚠️ الحد الأدنى للسحب هو: ${minLimit.toLocaleString()} ل.س.\nيرجى إدخال المبلغ المراد سحبه:`);
  }

  // 4. معالجة خطوات الاستجابة المتتابعة
  const session = userSessions[chatId];
  if (session) {
    // أ- إنشاء حساب (التحقق من عدم وجود حروف أو أرقام عربية)
    if (session.step === 'AWAITING_USERNAME') {
      const arabicRegex = /[\u0600-\u06FF]/;
      if (arabicRegex.test(text)) {
        return bot.sendMessage(chatId, "❌ خطأ: يمنع كتابة الأحرف أو الأرقام العربية! يرجى إدخال اسم المستخدم بالإنكليزية فقط:");
      }

      // إرسال الطلب للمشرف
      if (ADMIN_CHAT_ID !== 'YOUR_TELEGRAM_CHAT_ID') {
        bot.sendMessage(ADMIN_CHAT_ID, `📩 **طلب إنشاء حساب جديد**\n👤 المستخدم: ${username}\n🆔 ID: ${chatId}\n🔤 الاسم المطلوب: \`${text}\``, { parse_mode: 'Markdown' });
      }

      delete userSessions[chatId];
      bot.sendMessage(chatId, "✅ تم استلام طلب إنشاء الحساب بنجاح، جاري تجهيزه وسنوافيك بالتفاصيل قريباً.");
      return mainKeyboard(chatId);
    }

    // ب- معالجة طلب الشحن
    if (session.step === 'AWAITING_DEPOSIT_AMOUNT') {
      if (ADMIN_CHAT_ID !== 'YOUR_TELEGRAM_CHAT_ID') {
        bot.sendMessage(ADMIN_CHAT_ID, `💳 **طلب شحن جديد**\n👤 الزبون: ${username}\n🆔 ID: ${chatId}\n🏦 الوسيلة: ${session.method}\n📝 التفاصيل: ${text}`);
      }

      delete userSessions[chatId];
      bot.sendMessage(chatId, "✅ تم استلام طلب الشحن. يرجى إرسال صورة إيصال التحويل وسيتم تنفيذ الطلب فوراً.");
      return mainKeyboard(chatId);
    }

    // ج- معالجة طلب السحب والفحص المالي
    if (session.step === 'AWAITING_WITHDRAW_AMOUNT') {
      const amount = parseInt(text.replace(/[^0-9]/g, ''));
      const currentBalance = userBalances[chatId] || 0; // الرصيد الحالي للزبون

      if (isNaN(amount)) {
        return bot.sendMessage(chatId, "❌ يرجى كتابة المبلغ بالأرقام فقط.");
      }

      if (amount < session.minLimit) {
        return bot.sendMessage(chatId, `❌ المبلغ أقل من الحد الأدنى للسحب عبر ${session.method}.\nالحد الأدنى هو: ${session.minLimit.toLocaleString()} ل.س.`);
      }

      if (amount > currentBalance) {
        return bot.sendMessage(chatId, `❌ **لا يوجد رصيد كافٍ!**\nرصيدك الحالي المتاح للسحب هو: ${currentBalance.toLocaleString()} ل.س.`);
      }

      // خصم الرصيد وإرسال الإشعار للمشرف
      userBalances[chatId] -= amount;
      if (ADMIN_CHAT_ID !== 'YOUR_TELEGRAM_CHAT_ID') {
        bot.sendMessage(ADMIN_CHAT_ID, `🏧 **طلب سحب أرباح**\n👤 الزبون: ${username}\n🆔 ID: ${chatId}\n🏦 الوسيلة: ${session.method}\n💰 المبلغ: ${amount.toLocaleString()} ل.س.`);
      }

      delete userSessions[chatId];
      bot.sendMessage(chatId, "✅ تم استلام طلب السحب بنجاح وسوف يتم تحويل المبلغ للمحفظة الخاصة بك في أقرب وقت.");
      return mainKeyboard(chatId);
    }
  }

  // الرد الافتراضي عند كتابة رسالة عادية
  bot.sendMessage(chatId, "تم استلام رسالتك، وسيتم تحويلها لدعم روليكس.");
});
