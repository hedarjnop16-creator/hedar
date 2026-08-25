import datetime
import telebot
from telebot import types

# ضع توكن البوت الخاص بك هنا
API_TOKEN = "YOUR_BOT_TOKEN_HERE"
bot = telebot.TeleBot(API_TOKEN)

# ID الأدمن / الإدارة
ADMIN_ID = 123456789  # استبدله بـ ID حسابك

# قواعد البيانات المؤقتة (تُستبدل بقاعدة بيانات مثل SQLite عند الحاجة)
user_balances = {}  # {user_id: {"bot_wallet": 0, "ishansi_wallet": 0}}
last_withdraw_time = {}  # {user_id: datetime}

# ====================================================
# 1️⃣ أمر البداية /start
# ====================================================
@bot.message_handler(commands=["start"])
def send_welcome(message):
    user_id = message.from_user.id
    if user_id not in user_balances:
        user_balances[user_id] = {"bot_wallet": 0, "ishansi_wallet": 0}

    text = (
        "مرحباً بك في بوت إيشانسي! 🌟\n\n"
        "حسابك حالياً قيد التفعيل من قبل الإدارة، يرجى الانتظار..."
    )

    # إرسال طلب تفعيل إلى الأدمن
    admin_markup = types.InlineKeyboardMarkup()
    btn_accept = types.InlineKeyboardButton(
        "✅ قبول وتفعيل الحساب", callback_data=f"accept_user_{user_id}"
    )
    admin_markup.add(btn_accept)

    bot.send_message(message.chat.id, text)
    bot.send_message(
        ADMIN_ID,
        f"📩 طلب تفعيل حساب جديد:\n"
        f"👤 الاسم: {message.from_user.first_name}\n"
        f"🆔 ID: <code>{user_id}</code>",
        reply_markup=admin_markup,
        parse_mode="HTML",
    )


# ====================================================
# 2️⃣ قبول الحساب وإرسال القائمة الرئيسية للمستخدم
# ====================================================
@bot.callback_query_handler(
    func=lambda call: call.data.startswith("accept_user_")
)
def accept_user(call):
    user_id = int(call.data.split("_")[-1])

    if user_id not in user_balances:
        user_balances[user_id] = {"bot_wallet": 0, "ishansi_wallet": 0}

    markup = types.InlineKeyboardMarkup(row_width=2)
    btn_deposit_wallet = types.InlineKeyboardButton(
        "📥 شحن محفظة البوت", callback_data="deposit_bot_wallet"
    )
    btn_withdraw_wallet = types.InlineKeyboardButton(
        "📤 سحب من محفظة البوت", callback_data="withdraw_bot_wallet"
    )
    btn_charge_ishansi = types.InlineKeyboardButton(
        "🔄 شحن إيشانسي", callback_data="charge_ishansi"
    )
    btn_withdraw_ishansi = types.InlineKeyboardButton(
        "🔄 سحب من إيشانسي", callback_data="withdraw_ishansi"
    )
    btn_gift = types.InlineKeyboardButton(
        "🎁 إهداء رصيد", callback_data="gift_balance"
    )
    btn_balance = types.InlineKeyboardButton(
        "📊 عرض الرصيد", callback_data="show_balance"
    )
    btn_support = types.InlineKeyboardButton(
        "💬 الدعم الفني", url="https://t.me/RolexHelpDesk_bot"
    )

    markup.add(btn_deposit_wallet, btn_withdraw_wallet)
    markup.add(btn_charge_ishansi, btn_withdraw_ishansi)
    markup.add(btn_gift, btn_balance)
    markup.add(btn_support)

    try:
        bot.send_message(
            user_id,
            "✅ <b>تم تفعيل حسابك بنجاح!</b>\n\nأهلاً بك. اختر الخدمة المطلوبة من القائمة أدناه:",
            reply_markup=markup,
            parse_mode="HTML",
        )
        bot.answer_callback_query(
            call.id, "تم تفعيل الحساب وإرسال القائمة للمستخدم!"
        )
        bot.edit_message_text(
            f"✅ تم تفعيل حساب المستخدم: <code>{user_id}</code> بنجاح.",
            chat_id=call.message.chat.id,
            message_id=call.message.message_id,
            parse_mode="HTML",
        )
    except Exception as e:
        bot.send_message(call.message.chat.id, f"❌ متعذر إرسال الإشعار: {e}")


# ====================================================
# 3️⃣ عرض الرصيد
# ====================================================
@bot.callback_query_handler(func=lambda call: call.data == "show_balance")
def show_balance(call):
    uid = call.from_user.id
    balances = user_balances.get(uid, {"bot_wallet": 0, "ishansi_wallet": 0})

    msg = (
        "📊 <b>تفاصيل رصيدك الحالي:</b>\n\n"
        f"💰 <b>رصيد محفظة البوت:</b> {balances['bot_wallet']:,} ل.س\n"
        f"🎮 <b>رصيد موقع إيشانسي:</b> {balances['ishansi_wallet']:,} ل.س"
    )
    bot.answer_callback_query(call.id)
    bot.send_message(call.message.chat.id, msg, parse_mode="HTML")


# ====================================================
# 4️⃣ شحن محفظة البوت (شام كاش وسيرياتيل كاش)
# ====================================================
@bot.callback_query_handler(
    func=lambda call: call.data == "deposit_bot_wallet"
)
def deposit_bot_wallet_options(call):
    markup = types.InlineKeyboardMarkup(row_width=2)
    btn_sham = types.InlineKeyboardButton(
        "💚 شام كاش", callback_data="pay_shamcash_deposit"
    )
    btn_syria = types.InlineKeyboardButton(
        "🔴 سيرياتيل كاش", callback_data="pay_syriatel_deposit"
    )
    markup.add(btn_sham, btn_syria)

    bot.answer_callback_query(call.id)
    bot.send_message(
        call.message.chat.id,
        "اختر وسيلة الشحن لمحفظة البوت:",
        reply_markup=markup,
    )


@bot.callback_query_handler(
    func=lambda call: call.data == "pay_shamcash_deposit"
)
def shamcash_info(call):
    msg_text = (
        "💳 <b>شحن محفظة البوت عبر شام كاش:</b>\n\n"
        "🔗 <b>المعرف الخاص بالتحويل:</b>\n"
        "<code>10d49ee7964eebbfab5a1dbac79d3102</code>\n\n"
        "📌 <i>اضغط على المعرف أعلاه لنسخه مباشرة.</i>\n\n"
        "بعد إتمام عملية التحويل، يرجى إرسال <b>صورة إشعار التحويل</b> هنا لمتابعة طلبك."
    )
    bot.answer_callback_query(call.id)

    # يمكن وضع File ID الصورة هنا أو إرسال النص فقط إن لم تتوفر الصورة بعد
    qr_file_id = "ضع_هنا_FILE_ID_الصورة"
    try:
        bot.send_photo(
            call.message.chat.id,
            photo=qr_file_id,
            caption=msg_text,
            parse_mode="HTML",
        )
    except:
        bot.send_message(call.message.chat.id, msg_text, parse_mode="HTML")


@bot.callback_query_handler(
    func=lambda call: call.data == "pay_syriatel_deposit"
)
def syriatel_info(call):
    msg_text = (
        "🔴 <b>شحن محفظة البوت عبر سيرياتيل كاش:</b>\n\n"
        "📱 <b>رقم الحساب/التحويل:</b>\n"
        "<code>ضع_رقم_سيرياتيل_كاش_هنا</code>\n\n"
        "بعد إتمام عملية التحويل، يرجى إرسال <b>صورة إشعار التحويل</b> هنا لمتابعة طلبك."
    )
    bot.answer_callback_query(call.id)
    bot.send_message(call.message.chat.id, msg_text, parse_mode="HTML")


# ====================================================
# 5️⃣ سحب من محفظة البوت (شام كاش وسيرياتيل كاش)
# ====================================================
@bot.callback_query_handler(
    func=lambda call: call.data == "withdraw_bot_wallet"
)
def withdraw_bot_wallet_options(call):
    markup = types.InlineKeyboardMarkup(row_width=2)
    btn_sham = types.InlineKeyboardButton(
        "💚 شام كاش", callback_data="withdraw_shamcash"
    )
    btn_syria = types.InlineKeyboardButton(
        "🔴 سيرياتيل كاش", callback_data="withdraw_syriatel"
    )
    markup.add(btn_sham, btn_syria)

    bot.answer_callback_query(call.id)
    bot.send_message(
        call.message.chat.id,
        "اختر وسيلة السحب من محفظة البوت:\n\n⚠️ <i>ملاحظة: الحد الأدنى للسحب عبر سيرياتيل كاش هو 100,000 ل.س.</i>",
        reply_markup=markup,
        parse_mode="HTML",
    )


@bot.callback_query_handler(
    func=lambda call: call.data in ["withdraw_shamcash", "withdraw_syriatel"]
)
def process_withdrawal_method(call):
    method = "شام كاش" if call.data == "withdraw_shamcash" else "سيرياتيل كاش"
    bot.answer_callback_query(call.id)

    msg = bot.send_message(
        call.message.chat.id,
        f"🔹 <b>طلب سحب عبر {method}:</b>\n\n"
        f"يرجى كتابة <b>المعرف أو الرقم الخاص بك</b> لاستلام المبلغ بالإضافة للمبلغ المطلوب سحبه (مثال: المعرف / المبلغ):",
        parse_mode="HTML",
    )
    bot.register_next_step_handler(
        msg, lambda m: handle_withdrawal_request(m, method)
    )


def handle_withdrawal_request(message, method):
    text = message.text.strip()
    uid = message.from_user.id

    bot.send_message(
        message.chat.id, "✅ تم إرسال طلب السحب للإدارة وسيتم تنفيذه قريباً."
    )
    bot.send_message(
        ADMIN_ID,
        f"💸 <b>طلب سحب جديد ({method}):</b>\n"
        f"👤 الزبون: <code>{uid}</code>\n"
        f"📝 التفاصيل والمبلغ: {text}",
        parse_mode="HTML",
    )


# ====================================================
# 6️⃣ شحن وسحب موقع إيشانسي (تحويل داخلي)
# ====================================================
@bot.callback_query_handler(func=lambda call: call.data == "charge_ishansi")
def charge_ishansi_start(call):
    bot.answer_callback_query(call.id)
    msg = bot.send_message(
        call.message.chat.id,
        "🔄 <b>شحن إيشانسي من محفظة البوت:</b>\n\nأدخل المبلغ المراد تحويله إلى موقع إيشانسي (أرقام إنكليزية فقط):",
        parse_mode="HTML",
    )
    bot.register_next_step_handler(msg, process_charge_ishansi)


def process_charge_ishansi(message):
    try:
        amount = int(message.text)
        uid = message.from_user.id

        if user_balances[uid]["bot_wallet"] < amount:
            bot.send_message(
                message.chat.id,
                "❌ رصيد محفظة البوت غير كافٍ لتنفيذ العملية!",
            )
            return

        user_balances[uid]["bot_wallet"] -= amount
        user_balances[uid]["ishansi_wallet"] += amount

        bot.send_message(
            message.chat.id,
            f"✅ تم تحويل {amount:,} ل.س بنجاح إلى حسابك في إيشانسي!",
        )
    except ValueError:
        bot.send_message(
            message.chat.id, "❌ يرجى إدخال أرقام إنكليزية فقط."
        )


@bot.callback_query_handler(func=lambda call: call.data == "withdraw_ishansi")
def withdraw_ishansi_check(call):
    uid = call.from_user.id
    now = datetime.datetime.now()

    # فحص شرط الـ 30 دقيقة
    if uid in last_withdraw_time:
        elapsed = (now - last_withdraw_time[uid]).total_seconds() / 60
        if elapsed < 30:
            remaining = int(30 - elapsed)
            bot.answer_callback_query(
                call.id,
                f"⚠️ يمكنك السحب من إيشانسي مرة واحدة كل 30 دقيقة.\nالرجاء الانتظار {remaining} دقيقة.",
                show_alert=True,
            )
            return

    last_withdraw_time[uid] = now
    bot.answer_callback_query(call.id)

    msg = bot.send_message(
        call.message.chat.id,
        "🔄 <b>سحب من إيشانسي ⬅️ محفظة البوت:</b>\n\nأدخل المبلغ المراد سحبه إلى محفظة البوت:",
        parse_mode="HTML",
    )
    bot.register_next_step_handler(msg, process_ishansi_withdrawal)


def process_ishansi_withdrawal(message):
    try:
        amount = int(message.text)
        uid = message.from_user.id

        if user_balances[uid]["ishansi_wallet"] < amount:
            bot.send_message(
                message.chat.id, "❌ رصيدك في موقع إيشانسي غير كافٍ!"
            )
            return

        user_balances[uid]["ishansi_wallet"] -= amount
        user_balances[uid]["bot_wallet"] += amount

        bot.send_message(
            message.chat.id,
            f"✅ تم سحب {amount:,} ل.س من حساب إيشانسي إلى محفظة البوت بنجاح!",
        )
    except ValueError:
        bot.send_message(
            message.chat.id, "❌ يرجى إدخال أرقام إنكليزية فقط."
        )


# ====================================================
# 7️⃣ إهداء رصيد لزبون آخر
# ====================================================
@bot.callback_query_handler(func=lambda call: call.data == "gift_balance")
def gift_balance_start(call):
    bot.answer_callback_query(call.id)
    msg = bot.send_message(
        call.message.chat.id,
        "🎁 <b>إهداء رصيد:</b>\n\nيرجى إرسال <b>ID الزبون</b> المراد التحويل له (أرقام إنكليزية فقط):",
        parse_mode="HTML",
    )
    bot.register_next_step_handler(msg, process_gift_target_id)


def process_gift_target_id(message):
    target_id_str = message.text.strip()
    if not target_id_str.isdigit():
        bot.send_message(
            message.chat.id, "❌ خطأ: يرجى إدخال ID صحيح يحتوي على أرقام فقط."
        )
        return

    target_id = int(target_id_str)
    msg = bot.send_message(
        message.chat.id,
        f"👤 تم تحديد الزبون: <code>{target_id}</code>\n\nأدخل المبلغ الذي ترغب بإهدائه من محفظتك:",
        parse_mode="HTML",
    )
    bot.register_next_step_handler(
        msg, lambda m: process_gift_amount(m, target_id)
    )


def process_gift_amount(message, target_id):
    try:
        amount = int(message.text)
        sender_id = message.from_user.id

        if user_balances[sender_id]["bot_wallet"] < amount:
            bot.send_message(
                message.chat.id, "❌ رصيدك في محفظة البوت غير كافٍ!"
            )
            return

        user_balances[sender_id]["bot_wallet"] -= amount
        if target_id not in user_balances:
            user_balances[target_id] = {"bot_wallet": 0, "ishansi_wallet": 0}
        user_balances[target_id]["bot_wallet"] += amount

        bot.send_message(
            message.chat.id,
            f"✅ تم تحويل {amount:,} ل.س بنجاح إلى الزبون صاحِب الـ ID: <code>{target_id}</code>",
            parse_mode="HTML",
        )
        try:
            bot.send_message(
                target_id,
                f"🎁 وصلتك هدية رصيد بقيمة {amount:,} ل.س في محفظة البوت من المستخدِم <code>{sender_id}</code>!",
                parse_mode="HTML",
            )
        except:
            pass
    except ValueError:
        bot.send_message(
            message.chat.id, "❌ يرجى إدخال أرقام إنكليزية فقط."
        )


# تشغيل البوت
bot.polling(none_stop=True)
