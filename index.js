const TelegramBot = require('node-telegram-bot-api');
const token = process.env.BOT_TOKEN;

if (!token) {
  console.error("BOT_TOKEN missing!");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// القائمة الرئيسية مع الأزرار
function mainKeyboard(chatId) {
  const options = {
    reply_markup: {
      keyboard: [
        [{ text: '👤 إنشاء حساب ichancy' }, { text: '💳 شحن حساب' }],
        [{ text: '🏧 سحب أرباح' }, { text: '🎁 أكواد الهدايا' }],
        [{ text: '💬 التواصل مع الدعم' }]
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
      bot.sendMessage(chatId, "لإنشاء حساب جديد على منصة ichancy، يرجى تزويدنا بالاسم والمعلومات المطلوبة ليتم تجهيز الحساب فوراً.");
      break;
    case '💳 شحن حساب':
      bot.sendMessage(chatId, "للشحن عبر (شام كاش / سيريتل كاش)، أرسل قيمة المبلغ والمُعرف الخاص بك.");
      break;
    case '🏧 سحب أرباح':
      bot.sendMessage(chatId, "لطلب سحب الأرباح، أرسل قيمة المبلغ وطريقة الاستلام المناسبة لك.");
      break;
    case '🎁 أكواد الهدايا':
      bot.sendMessage(chatId, "أدخل كود الملاحظة/الهداية الخاص بك هنا لتفعيله.");
      break;
    case '💬 التواصل مع الدعم':
      bot.sendMessage(chatId, "يمكنك كتابة استفسارك مباشرة هنا وسيتم الرد عليك من قبل موظف الدعم.");
      break;
    default:
      bot.sendMessage(chatId, "تم استلام رسالتك، وسيتم معالجتها من قبل فريق الدعم أسرع وقت.");
      break;
  }
});
