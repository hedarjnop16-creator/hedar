const TelegramBot = require('node-telegram-bot-api');

// جلب التوكن تلقائياً من إعدادات Railway
const token = process.env.BOT_TOKEN;

if (!token) {
  console.error("خطأ: لم يتم العثور على BOT_TOKEN في Variables!");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// الترحيب عند إرسال /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `أهلاً بك في بوت الدعم والخدمات! 🌹\n\nكيف يمكننا مساعدتك اليوم؟ اختر من القائمة التالية أو أرسل استفسارك مباشرة.`;
  
  bot.sendMessage(chatId, welcomeMessage);
});

// الرد على الرسائل العادية
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text && !text.startsWith('/')) {
    bot.sendMessage(chatId, "تم استلام رسالتك، وسيقوم فريق الدعم بالرد عليك في أقرب وقت ممكن.");
  }
});

console.log("تم تشغيل البوت بنجاح...");
