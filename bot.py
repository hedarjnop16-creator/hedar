import time
import telebot

# تم وضع التوكن الخاص بك هنا
TOKEN = "8215516634:AAHi1xIZMcz1WGV9JglJI1U7_UC-qjABF4k"
bot = telebot.TeleBot(TOKEN)


@bot.message_handler(commands=["start"])
def send_welcome(message):
    bot.reply_to(message, "أهلاً بك! البوت يعمل الآن بنجاح عبر Pydroid 3.")


# دالة إعادة التشغيل التلقائي لمنع توقف البوت عند انقطاع الشبكة
def start_bot():
    while True:
        try:
            print("جاري تشغيل البوت...")
            bot.polling(non_stop=True, interval=0, timeout=20)
        except Exception as e:
            print(f"حدث خطأ في الاتصال: {e}")
            time.sleep(5)  # الانتظار 5 ثوانٍ وإعادة المحاولة


if __name__ == "__main__":
    start_bot()
