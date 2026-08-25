const TelegramBot = require('node-telegram-bot-api');
const token = process.env.BOT_TOKEN;

if (!token) {
  console.error("BOT_TOKEN missing!");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// القائمة الرئيسية مع الأزرار المحدثة
function mainKeyboard(chatId) {
  const options = {
    reply_markup: {
      keyboard: [
        [{ text: '👤 إنشاء حساب ichancy' }, { text: '💳 شحن حساب' }],
        [{ text: '🏧 سحب أرباح' }, { text: '🎁 أكواد الهدايا' }],
        [{ text: '🌐 رابط المنصة' }, { text: '📢 قناتنا الرسمية' }],
        [{ text: '❓ الأسئلة الشائعة' }, { text: '💬 التواصل مع الدعم' }]
      ],
      resize_keyboard: true,
      persistent: true
    }
  };
  bot.sendMessage(chatId, "أهلاً بك في دعم روليكس | Support Rolex 💎\nاختر الخدمة المطلوبة من القائمة أدناه:", options);
}

bot.onText(/\/start/, (msg) => {
  mainKeyboard(msg.chat.id);
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === '/start') return;

  switch (text) {
    case '👤 إنشاء حساب ichancy':
      bot.sendMessage(chatId, "لإنشاء حساب جديد على منصة ichancy، يرجى تزويدنا بالاسم والمطلوب ليتم تجهيز الحساب فوراً.");
      break;
    case '💳 شحن حساب':
      bot.sendMessage(chatId, "للشحن عبر (شام كاش / سيريتل كاش)، أرسل قيمة المبلغ والمُعرف الخاص بك مع صورة إيصال التحويل.");
      break;
    case '🏧 سحب أرباح':
      bot.sendMessage(chatId, "لطلب سحب الأرباح، أرسل رقم المُعرف الخاص بك وقيمة المبلغ المراد سحبه.");
      break;
    case '🎁 أكواد الهدايا':
      bot.sendMessage(chatId, "أدخل كود الهدية أو الملاحظة الخاص بك هنا ليتم التحقق منه.");
      break;
    case '🌐 رابط المنصة':
      bot.sendMessage(chatId, "يمكنك الدخول إلى منصة ichancy عبر الرابط التالي:\nhttps://m.ichancy2.com");
      break;
    case '📢 قناتنا الرسمية':
      bot.sendMessage(chatId, "تابع قناتنا ليصلك كل جديد من العروض وأكواد الهدايا اليومية! (ضع رابط قناتك هنا)");
      break;
    case '❓ الأسئلة الشائعة':
      bot.sendMessage(chatId, "📌 **الأسئلة الشائعة:**\n\n- ما هو الحد الأدنى للشحن؟...\n- ما هو الحد الأدنى للسحب?...\n- أوقات العمل: 24/7.");
      break;
    case '💬 التواصل مع الدعم':
      bot.sendMessage(chatId, "يمكنك كتابة استفسارك أو مشكلتك مباشرة هنا، وسيقوم فريق الدعم بالرد عليك في أقرب وقت.");
      break;
    default:
      bot.sendMessage(chatId, "تم استلام رسالتك، وسيتم معالجتها من قبل فريق الدعم في أسرع وقت.");
      break;
  }
});
