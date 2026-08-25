import datetime
import telebot
from telebot import types

bot = telebot.TeleBot("YOUR_BOT_TOKEN")

# قاعدة بيانات مؤقتة للرصيد وأوقات السحب (تُستبدل بقاعدة بيانات حقيقية مثل SQLite)
user_balances = {}  # {user_id: {"bot_wallet": 0, "ishansi_wallet": 0}}
last_withdraw_time = {}  # {user_id: datetime}

# ----------------------------------------------------
# 1️⃣ كود قبول الحساب وإرسال القائمة الرئيسية للمستخدم
# ----------------------------------------------------
@bot.callback_query_handler(
    func=lambda call: call.data.startswith("accept_user_")
)
def accept_user(call):
    user_id = int(call.data.split("_")[-1])

    # تهيئة رصيد المستخدم إذا لم يكن موجوداً
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

    bot.send_message(
        user_id,
        "✅ <b>تم تفعيل حسابك بنجاح!</b>\n\nأهلاً بك في منصتنا. اختر الخدمة المطلوبة من القائمة أدناه:",
        reply_markup=markup,
        parse_mode="HTML",
    )
    bot.answer_callback_query(call.id, "تم تفعيل الحساب وإرسال القائمة!")


# ----------------------------------------------------
# 2️⃣ عرض الرصيد (رصيد البوت + رصيد إيشانسي)
# ----------------------------------------------------
@bot.callback_query_handler(func=lambda call: call.data == "show_balance")
def show_balance(call):
    uid = call.from_user.id
    balances = user_balances.get(
        uid, {"bot_wallet": 0, "ishansi_wallet": 0}
    )

    msg = (
        "📊 <b>تفاصيل رصيدك الحالي:</b>\n\n"
        f"💰 <b>رصيد محفظة البوت:</b> {balances['bot_wallet']:,} ل.س\n"
        f"🎮 <b>رصيد موقع إيشانسي:</b> {balances['ishansi_wallet']:,} ل.س"
    )
    bot.answer_callback_query(call.id)
    bot.send_message(call.message.chat.id, msg, parse_mode="HTML")


# ----------------------------------------------------
# 3️⃣ سحب من إيشانسي لـ محفظة البوت (كل 30 دقيقة)
# ----------------------------------------------------
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

    # حفظ وقت السحب الجديد
    last_withdraw_time[uid] = now
    bot.answer_callback_query(call.id)

    msg = bot.send_message(
        call.message.chat.id,
        "🔄 <b>سحب من إيشانسي ⬅️ محفظة البوت</b>\n\nأدخل المبلغ الذي تريد تحويله من إيشانسي إلى محفظة البوت:",
        parse_mode="HTML",
    )
    bot.register_next_step_handler(msg, process_ishansi_withdrawal)


def process_ishansi_withdrawal(message):
    try:
        amount = int(message.text)
        uid = message.from_user.id
        # معالجة خصم الرصيد من إيشانسي وإضافته لمحفظة البوت
        user_balances[uid]["ishansi_wallet"] -= amount
        user_balances[uid]["bot_wallet"] += amount

        bot.send_message(
            message.chat.id,
            f"✅ تم سحب {amount:,} من حساب إيشانسي وإضافتها إلى محفظة البوت بنجاح!",
        )
    except ValueError:
        bot.send_message(
            message.chat.id,
            "❌ يرجى إدخال أرقام إنجليزية فقط (مثال: 50000).",
        )


# ----------------------------------------------------
# 4️⃣ إهداء رصيد محفظة البوت لزبون آخر عبر الـ ID
# ----------------------------------------------------
@bot.callback_query_handler(func=lambda call: call.data == "gift_balance")
def gift_balance_start(call):
    bot.answer_callback_query(call.id)
    msg = bot.send_message(
        call.message.chat.id,
        "🎁 <b>إهداء رصيد لزبون آخر:</b>\n\nيرجى إرسال <b>ID الزبون</b> المراد التحويل له (أرقام إنكليزية فقط):",
        parse_mode="HTML",
    )
    bot.register_next_step_handler(msg, process_gift_target_id)


def process_gift_target_id(message):
    target_id_str = message.text.strip()
    if not target_id_str.isdigit():
        bot.send_message(
            message.chat.id,
            "❌ خطأ: يرجى إدخال ID صحيح يحتوي على أرقام فقط.",
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
                message.chat.id, "❌ رصيدك في محفظة البوت غير كافٍ لإتمام العملية!"
            )
            return

        # خصم من المرسل وإضافة للمستلم
        user_balances[sender_id]["bot_wallet"] -= amount
        if target_id not in user_balances:
            user_balances[target_id] = {"bot_wallet": 0, "ishansi_wallet": 0}
        user_balances[target_id]["bot_wallet"] += amount

        bot.send_message(
            message.chat.id,
            f"✅ تم تحويل {amount:,} ل.س بنجاح إلى الزبون صاحب الـ ID: <code>{target_id}</code>",
            parse_mode="HTML",
        )
        # إشعار الزبون المستلم
        try:
            bot.send_message(
                target_id,
                f"🎁 وصلتك هدية رصيد بقيمة {amount:,} ل.س في محفظة البوت من المستخدم <code>{sender_id}</code>!",
                parse_mode="HTML",
            )
        except:
            pass
    except ValueError:
        bot.send_message(
            message.chat.id, "❌ يرجى إدخال أرقام إنكليزية فقط."
        )


# ----------------------------------------------------
# 5️⃣ شحن محفظة البوت (شام كاش / سيرياتيل كاش)
# ----------------------------------------------------
@bot.callback_query_handler(func=lambda call: call.data == "deposit_bot_wallet")
def deposit_bot_wallet_options(call):
    markup = types.InlineKeyboardMarkup()
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
        "اختر طريقة الشحن لمحفظة البوت:",
        reply_markup=markup,
    )


@bot.callback_query_handler(
    func=lambda call: call.data == "pay_shamcash_deposit"
)
def shamcash_info(call):
    msg_text = (
        "💳 <b>شحن محفظة البوت عبر شام كاش:</b>\n\n"
        
        "🔗 <b>المعرف:</b>\n"
        "<code>10d49ee7964eebbfab5a1dbac79d3102</code>\n\n"
        "📌 <i>اضغط على المعرف لنسخه.</i>\n\n"
        "يرجى التحويل ثم إرسال <b>صورة إشعار التحويل</b> هنا."
    )
    bot.answer_callback_query(call.id)
    # أرسل صورة الـ QR مع الرسالة عبر file_id الصورة
    bot.send_photo(
        call.message.chat.id,
        photo="ضع_هنا_FILE_ID_الصورة",
        caption=msg_text,
        parse_mode="HTML",
    )
