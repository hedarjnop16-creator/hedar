import os
import json
import random
import string
import time
import telebot
from telebot import types
from telebot import apihelper

# ----------------------------------------------------
# 1. الإعدادات الأساسية
# ----------------------------------------------------
BOT_TOKEN = "8990098226:AAFeNbsCUbCUL7ivKBc9PuMxNk4QRDNKP2A"
ADMIN_ID = 7231201528
CHANNEL_USERNAME = "@rolecxx"
SHAM_ADMIN_ID = "dff421f0764c57b79d445120de5fb5b0"
SYRIATEL_ADMIN_CODE = "23557475"
SYRIATEL_QR_IMAGE = "syriatel_qr.jpg"
SHAM_QR_IMAGE = None

# تفعيل البروكسي لموقع PythonAnywhere
apihelper.proxy = {'https': 'http://proxy.server:3128'}
bot = telebot.TeleBot(BOT_TOKEN)

# المسارات وقواعد البيانات
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, "config.json")
ACCOUNTS_FILE = os.path.join(BASE_DIR, "accounts.json")
GIFTS_FILE = os.path.join(BASE_DIR, "gifts.json")

# ----------------------------------------------------
# 2. دوال حفظ واسترجاع البيانات
# ----------------------------------------------------
def load_accounts():
    if os.path.exists(ACCOUNTS_FILE):
        try:
            with open(ACCOUNTS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {int(k): v for k, v in data.items()}
        except Exception as e:
            print(f"خطأ بتجميع الحسابات: {e}")
            return {}
    return {}

def save_accounts():
    try:
        with open(ACCOUNTS_FILE, "w", encoding="utf-8") as f:
            json.dump(users_accounts, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"خطأ بحفظ الحسابات: {e}")

def load_gifts():
    if os.path.exists(GIFTS_FILE):
        try:
            with open(GIFTS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"خطأ بتجميع الهدايا: {e}")
            return {}
    return {}

def save_gifts():
    try:
        with open(GIFTS_FILE, "w", encoding="utf-8") as f:
            json.dump(gift_codes, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"خطأ بحفظ الهدايا: {e}")

users_accounts = load_accounts()
gift_codes = load_gifts()

users_contacts = {}
user_states = {}
admin_states = {}
user_temp_data = {}
user_records = {}
banned_users = set()

# ----------------------------------------------------
# 3. دوال مساعدة وللإعدادات
# ----------------------------------------------------
def get_bonus_config():
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"bonus_rate": 0.05, "is_active": True}

def save_bonus_config(config):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=4)

def save_user(user_id):
    users = get_all_users()
    if str(user_id) not in users:
        with open("users.txt", "a", encoding="utf-8") as f:
            f.write(f"{user_id}\n")

def get_all_users():
    if not os.path.exists("users.txt"):
        return []
    with open("users.txt", "r", encoding="utf-8") as f:
        return [line.strip() for line in f.readlines() if line.strip()]

def check_subscription(user_id):
    try:
        member = bot.get_chat_member(CHANNEL_USERNAME, user_id)
        if member.status in ['creator', 'administrator', 'member']:
            return True
        return False
    except Exception as e:
        print(f"خطأ بفحص القناة: {e}")
        return True

def get_sub_markup():
    markup = types.InlineKeyboardMarkup(row_width=1)
    btn_channel = types.InlineKeyboardButton("📢 اشترك بالقناة الرسمية أولاً", url=f"https://t.me/{CHANNEL_USERNAME.replace('@', '')}")
    btn_check = types.InlineKeyboardButton("🔄 تحقق من الاشتراك", callback_data="check_sub")
    markup.add(btn_channel, btn_check)
    return markup

def get_main_markup():
    markup = types.InlineKeyboardMarkup(row_width=2)
    btn_acc = types.InlineKeyboardButton("👤 حساب iChancy", callback_data="btn_account")
    btn_withdraw = types.InlineKeyboardButton("📥 سحب حوالة مالية", callback_data="btn_withdraw")
    btn_charge = types.InlineKeyboardButton("📤 شحن محفظة البوت", callback_data="btn_charge")
    btn_gift = types.InlineKeyboardButton("🎁 كود هدية", callback_data="btn_gift")
    btn_records = types.InlineKeyboardButton("📅 السجلات", callback_data="btn_records")
    btn_support = types.InlineKeyboardButton("💬 دعم روليكس", url="https://t.me/RolexHelpDesk_bot")
    markup.add(btn_acc)
    markup.add(btn_withdraw, btn_charge)
    markup.add(btn_gift, btn_records)
    markup.add(btn_support)
    return markup

def get_cancel_markup():
    markup = types.InlineKeyboardMarkup()
    markup.add(types.InlineKeyboardButton("❌ إلغاء", callback_data="cancel_action"))
    return markup

def get_admin_account_info(user_id):
    acc = users_accounts.get(user_id, {'username': 'غير مسجل', 'password': 'غير مسجل'})
    return f"\n🆔 **إيدي الزبون:** `{user_id}`\n👤 **حساب iChancy:** `{acc['username']}`\n🔑 **كلمة السر:** `{acc['password']}`"

def add_record(user_id, text):
    if user_id not in user_records:
        user_records[user_id] = []
    user_records[user_id].append(text)

def notify_all_users_about_bonus(rate_percent):
    users = get_all_users()
    if not users:
        return
    msg_text = (
        f"🎉 **تم تفعيل عرض البونص الجديد!**\n\n"
        f"🟢 احصل الآن على **بونص بنسبة +{rate_percent}%** عند شحن محفظتك في البوت!\n\n"
        f"🚀 سارع بالشحن الآن واكسب زيادة على رصيدك."
    )
    for u_id in users:
        try:
            bot.send_message(int(u_id), msg_text, parse_mode='Markdown')
        except Exception:
            pass

# ----------------------------------------------------
# 4. لوحة تحكم الأدمين
# ----------------------------------------------------
@bot.message_handler(commands=['admin'])
def admin_panel(message):
    if message.from_user.id != ADMIN_ID:
        return
    config = get_bonus_config()
    status_text = "🟢 مفعل" if config.get("is_active", True) else "🔴 متوقف"
    rate_text = int(config.get("bonus_rate", 0.05) * 100)
    total_users = len(get_all_users())
    
    markup = types.InlineKeyboardMarkup(row_width=2)
    markup.add(
        types.InlineKeyboardButton("📢 إذاعة للمستخدمين", callback_data="admin_broadcast_btn"),
        types.InlineKeyboardButton("🎁 إنشاء كود هدية", callback_data="admin_create_code")
    )
    markup.add(
        types.InlineKeyboardButton("🚫 حظر مستخدم", callback_data="admin_ban_user"),
        types.InlineKeyboardButton("✅ إلغاء حظر مستخدم", callback_data="admin_unban_user")
    )
    btn_toggle = types.InlineKeyboardButton("🔴 إيقاف البونص" if config.get("is_active", True) else "🟢 تفعيل البونص", callback_data="toggle_bonus")
    btn_change_rate = types.InlineKeyboardButton("✏️ تغيير نسبة البونص", callback_data="change_rate_btn")
    markup.add(btn_toggle, btn_change_rate)
    
    bot.send_message(
        ADMIN_ID,
        f"⚙️ **لوحة تحكم الأدمين:**\n\n"
        f"▪️ عدد المستخدمين: `{total_users}`\n"
        f"▪️ حالة البونص: {status_text}\n"
        f"▪️ نسبة البونص: `{rate_text}%`\n"
        f"▪️ عدد الأكواد المتاحة: `{len(gift_codes)}`",
        reply_markup=markup,
        parse_mode='Markdown'
    )

@bot.message_handler(commands=['broadcast'])
def broadcast_cmd(message):
    if message.from_user.id != ADMIN_ID:
        return
    msg = bot.send_message(message.chat.id, "📢 أرسل الآن الرسالة التي تريد إرسالها لجميع المستخدمين:")
    bot.register_next_step_handler(msg, send_broadcast_message)

def send_broadcast_message(message):
    users = get_all_users()
    if not users:
        bot.send_message(message.chat.id, "⚠️ لا يوجد مستخدمين مسجلين بعد.")
        return
    success, failed = 0, 0
    bot.send_message(message.chat.id, f"⏳ جاري إرسال الرسالة إلى {len(users)} مستخدم...")
    for user_id in users:
        try:
            bot.copy_message(chat_id=int(user_id), from_chat_id=message.chat.id, message_id=message.message_id)
            success += 1
        except Exception:
            failed += 1
    bot.send_message(
        message.chat.id,
        f"✅ **تم الانتهاء من الإذاعة!**\n\n🔹 نجاح: `{success}`\n🔸 فشل: `{failed}`",
        parse_mode="Markdown"
    )

# ----------------------------------------------------
# 5. التفاعلات الرئيسية
# ----------------------------------------------------
@bot.message_handler(commands=['start'])
def send_welcome(message):
    user_id = message.from_user.id
    save_user(user_id)
    first_name = message.from_user.first_name or "المستخدم"

    if user_id in banned_users:
        bot.send_message(message.chat.id, "🚫 **تم حظر حسابك من استخدام البوت.**")
        return

    if user_id not in users_contacts:
        markup = types.ReplyKeyboardMarkup(one_time_keyboard=True, resize_keyboard=True)
        btn = types.KeyboardButton("📱 مشاركة جهة الاتصال", request_contact=True)
        markup.add(btn)
        bot.send_message(
            message.chat.id,
            f"أهلاً بك {first_name} في **Rolecx Bot** 👑\n\nيرجى مشاركة رقم هاتفك للمرة الأولى للبدء:",
            reply_markup=markup,
            parse_mode='Markdown'
        )
        return

    if not check_subscription(user_id):
        bot.send_message(
            message.chat.id,
            "⚠️ **عذراً! يجب عليك الاشتراك في قناة البوت الرسمية أولاً لتستطيع دخول البوت.**",
            reply_markup=get_sub_markup(),
            parse_mode='Markdown'
        )
        return

    bot.send_message(
        message.chat.id,
        f"أهلاً بك في **Rolecx Bot** 👑\n\n🆔 `{user_id}`",
        reply_markup=get_main_markup(),
        parse_mode='Markdown'
    )

@bot.message_handler(content_types=['contact'])
def handle_contact(message):
    user_id = message.from_user.id
    if user_id in banned_users:
        return
    if message.contact is not None:
        phone = message.contact.phone_number
        users_contacts[user_id] = phone
        user_name = message.from_user.first_name or "مستخدم"
        username_str = f"@{message.from_user.username}" if message.from_user.username else "لا يوجد"
        
        remove_kb = types.ReplyKeyboardRemove()
        bot.send_message(message.chat.id, "✅ تم تسجيل رقم هاتفك بنجاح!", reply_markup=remove_kb)

        admin_alert = (
            f"📱 **تم انضمام زبون جديد بمشاركة رقم الهاتف:**\n\n"
            f"👤 **الاسم:** {user_name}\n"
            f"📞 **الرقم:** `{phone}`\n"
            f"🆔 **ID:** `{user_id}`\n"
            f"🔗 **اليوذر:** {username_str}"
        )
        try:
            bot.send_message(ADMIN_ID, admin_alert, parse_mode='Markdown')
        except Exception as e:
            print(f"خطأ بإرسال إشعار الرقم للأدمين: {e}")
            
        send_welcome(message)

@bot.callback_query_handler(func=lambda call: True)
def handle_callbacks(call):
    user_id = call.from_user.id
    if user_id in banned_users:
        bot.answer_callback_query(call.id, "🚫 حسابك محظور!", show_alert=True)
        return

    if call.data == "cancel_action":
        user_states[user_id] = None
        bot.send_message(call.message.chat.id, "❌ تم إلغاء العملية.", reply_markup=get_main_markup())
        return

    if call.data == "check_sub":
        if check_subscription(user_id):
            bot.answer_callback_query(call.id, "✅ شكراً لاشتراكك!")
            bot.delete_message(call.message.chat.id, call.message.message_id)
            send_welcome(call.message)
        else:
            bot.answer_callback_query(call.id, "❌ لم تشترك بالقناة بعد!", show_alert=True)
        return

    if call.data == "toggle_bonus" and user_id == ADMIN_ID:
        config = get_bonus_config()
        new_state = not config.get("is_active", True)
        config["is_active"] = new_state
        save_bonus_config(config)
        rate_text = int(config.get("bonus_rate", 0.05) * 100)
        bot.answer_callback_query(call.id, f"تم {'تفعيل' if new_state else 'إيقاف'} البونص!")
        if new_state:
            bot.send_message(ADMIN_ID, "📢 جاري إرسال إشعار تفعيل البونص لجميع المشتركين...")
            notify_all_users_about_bonus(rate_text)
            bot.send_message(ADMIN_ID, "✅ تم إرسال الإشعار بنجاح.")
        admin_panel(call.message)
        return

    elif call.data == "change_rate_btn" and user_id == ADMIN_ID:
        msg = bot.send_message(call.message.chat.id, "أرسل النسبة الجديدة برقم فقط (مثلاً: 5 أو 10):", reply_markup=get_cancel_markup())
        bot.register_next_step_handler(msg, save_new_rate)
        return

    elif call.data == "admin_broadcast_btn" and user_id == ADMIN_ID:
        msg = bot.send_message(ADMIN_ID, "📢 أرسل الآن الرسالة التي تريد إرسالها لجميع المستخدمين:", reply_markup=get_cancel_markup())
        bot.register_next_step_handler(msg, send_broadcast_message)
        return

    if call.data == "admin_create_code" and user_id == ADMIN_ID:
        user_states[ADMIN_ID] = 'adm_code_amount'
        bot.send_message(ADMIN_ID, "🎁 أدخل مبلغ كود الهدية المراد إنشاؤه:", reply_markup=get_cancel_markup())
        return

    elif call.data == "admin_ban_user" and user_id == ADMIN_ID:
        user_states[ADMIN_ID] = 'adm_ban_id'
        bot.send_message(ADMIN_ID, "🚫 أدخل ID المستخدم المراد حظره:", reply_markup=get_cancel_markup())
        return

    elif call.data == "admin_unban_user" and user_id == ADMIN_ID:
        user_states[ADMIN_ID] = 'adm_unban_id'
        bot.send_message(ADMIN_ID, "✅ أدخل ID المستخدم المراد إلغاء حظره:", reply_markup=get_cancel_markup())
        return

    if call.data.startswith("admin_edit_acc_") and user_id == ADMIN_ID:
        target_user_id = int(call.data.split("_")[3])
        admin_states[ADMIN_ID] = {'action': 'waiting_credentials', 'target_user_id': target_user_id}
        bot.send_message(
            ADMIN_ID,
            f"✏️ أرسل الآن بيانات الحساب للزبون `{target_user_id}` بالصيغة التالية:\n\n"
            f"`اسم_الحساب : كلمة_السر`\n\n"
            f"مثال:\n`User123 : Pass456`",
            parse_mode="Markdown",
            reply_markup=get_cancel_markup()
        )
        bot.answer_callback_query(call.id)
        return

    if call.data == "btn_account":
        if user_id in users_accounts and users_accounts[user_id].get('status') == 'approved':
            acc = users_accounts[user_id]
            bot.send_message(call.message.chat.id, f"✅ **لديك حساب معتمد بالفعل:**\n\n👤 اسم المستخدم: `{acc['username']}`\n🔑 كلمة المرور: `{acc['password']}`", parse_mode='Markdown')
        else:
            user_states[user_id] = 'acc_username'
            bot.send_message(call.message.chat.id, "👤 أدخل **اسم المستخدم** المطلوب (أحرف وأرقام إنجليزية فقط):", reply_markup=get_cancel_markup())

    elif call.data == "btn_withdraw":
        markup = types.InlineKeyboardMarkup(row_width=2)
        markup.add(
            types.InlineKeyboardButton("🔴 Syriatel Cash", callback_data="w_syriatel"),
            types.InlineKeyboardButton("🟢 ShamCash", callback_data="w_sham_choice")
        )
        bot.send_message(call.message.chat.id, "📥 **سحب الرصيد**\nاختر وسيلة السحب المناسبة:", reply_markup=markup)

    elif call.data == "w_syriatel":
        user_states[user_id] = 'w_syr_amount'
        bot.send_message(call.message.chat.id, "🔴 **سحب سيرياتيل كاش**\n\n• الحد الأدنى: `100,000 SYP`\n• الحد الأقصى: `500,000 SYP`\n• رسوم السحب: `15%`\n\nادخل المبلغ بالليرة السورية:", parse_mode='Markdown', reply_markup=get_cancel_markup())

    elif call.data == "w_sham_choice":
        markup = types.InlineKeyboardMarkup(row_width=2)
        markup.add(
            types.InlineKeyboardButton("🇸🇾 شام كاش (SYP)", callback_data="w_sham_syp"),
            types.InlineKeyboardButton("🇺🇸 شام كاش (USD)", callback_data="w_sham_usd")
        )
        bot.send_message(call.message.chat.id, "🟢 اختر عملة السحب عبر شام كاش:", reply_markup=markup)

    elif call.data in ["w_sham_syp", "w_sham_usd"]:
        user_temp_data[user_id] = {'currency': 'SYP' if call.data == "w_sham_syp" else 'USD'}
        user_states[user_id] = 'w_sham_amount'
        bot.send_message(call.message.chat.id, "🟢 **سحب شام كاش**\n\nادخل المبلغ المراد سحبه:", reply_markup=get_cancel_markup())

    elif call.data == "btn_charge":
        config = get_bonus_config()
        is_active = config.get("is_active", True)
        rate_text = int(config.get("bonus_rate", 0.05) * 100)
        bonus_str = ""
        if is_active and rate_text > 0:
            bonus_str = f"\n\nعروض البونص الفعالة الآن (زيادة على الشحن):\n\n➕ **بونص (ترحيبي): +{rate_text}%**\n"
        
        charge_msg = (
            f"⬆️ **شحن رصيد البوت**\n\n"
            f"⭐ **رصيد المحفظة:** 0 SYP"
            f"{bonus_str}\n"
            f"📥 **أقل مبلغ للشحن:** 25,000 SYP\n\n"
            f"اختر طريقة الدفع:"
        )
        markup = types.InlineKeyboardMarkup(row_width=2)
        markup.add(
            types.InlineKeyboardButton("🔴 Syriatel Cash", callback_data="c_syriatel"),
            types.InlineKeyboardButton("🟢 ShamCash", callback_data="c_sham_choice")
        )
        bot.send_message(call.message.chat.id, charge_msg, reply_markup=markup, parse_mode='Markdown')

    elif call.data == "c_syriatel":
        user_states[user_id] = 'c_syr_amount'
        caption_text = (
            f"🔴 **شحن البوت - سيرياتيل كاش**\n\n"
            f"📥 **الحد الأدنى للشحن:** `25,000 SYP`\n\n"
            f"أرسل المبلغ إلى الحساب التالية:\n\n➡️ `{SYRIATEL_ADMIN_CODE}`\n\n"
            f"البوت ينتظر منك ادخال المبلغ ..."
        )
        bot.send_message(call.message.chat.id, caption_text, parse_mode='Markdown', reply_markup=get_cancel_markup())

    elif call.data == "c_sham_choice":
        markup = types.InlineKeyboardMarkup(row_width=2)
        markup.add(
            types.InlineKeyboardButton("🇸🇾 شام كاش (SYP)", callback_data="c_sham_syp"),
            types.InlineKeyboardButton("🇺🇸 شام كاش (USD)", callback_data="c_sham_usd")
        )
        bot.send_message(call.message.chat.id, "🟢 اختر عملة الشحن عبر شام كاش:", reply_markup=markup)

    elif call.data in ["c_sham_syp", "c_sham_usd"]:
        curr = 'SYP' if call.data == "c_sham_syp" else 'USD'
        user_temp_data[user_id] = {'curr': curr}
        user_states[user_id] = 'c_sham_amount'
        caption_text = (
            f"🟢 **شحن البوت - شام كاش ({curr})**\n\n"
            f"أرسل المبلغ المراد شحنه إلى الحساب التالي:\n\n➡️ `{SHAM_ADMIN_ID}`\n\n"
            f"البوت ينتظر منك ادخال المبلغ ..."
        )
        bot.send_message(call.message.chat.id, caption_text, parse_mode='Markdown', reply_markup=get_cancel_markup())

    elif call.data == "btn_gift":
        user_states[user_id] = 'waiting_gift_code'
        bot.send_message(call.message.chat.id, "🎁 **كود الهدية**\n\nيرجى كتابة وإرسال كود الهدية الخاص بك:", reply_markup=get_cancel_markup())

    elif call.data == "btn_records":
        recs = user_records.get(user_id, [])
        if not recs:
            bot.send_message(call.message.chat.id, "📅 **السجلات:**\n\nلا توجد سجلات حالياً.")
        else:
            recs_text = "\n".join([f"• {r}" for r in recs])
            bot.send_message(call.message.chat.id, f"📅 **سجلات عملياتك المقبولة:**\n\n{recs_text}")

    elif call.data.startswith("admin_"):
        parts = call.data.split("_")
        action = parts[1]
        target_id = int(parts[2])
        req_type = parts[3]

        if action == "approve":
            if req_type == "acc":
                users_accounts[target_id]['status'] = 'approved'
                save_accounts()
                bot.send_message(target_id, "🎉 تم قبول طلب إنشاء حساب iChancy الخاص بك بنجاح!")
            else:
                info = user_temp_data.get(target_id, {}).get('last_details', 'عملية مقبولة')
                add_record(target_id, info)
                bot.send_message(target_id, "✅ تمت معالجة طلبك بنجاح!")
            bot.edit_message_text(f"{call.message.text}\n\n حالة الطلب: تم القبول ✅", ADMIN_ID, call.message.message_id)

        elif action == "reject":
            bot.send_message(target_id, "❌ العفو، تم رفض الطلب من قبل الإدارة.")
            bot.edit_message_text(f"{call.message.text}\n\n حالة الطلب: تم الرفض ❌", ADMIN_ID, call.message.message_id)

def save_new_rate(message):
    try:
        new_val = float(message.text)
        config = get_bonus_config()
        config["bonus_rate"] = new_val / 100
        save_bonus_config(config)
        bot.reply_to(message, f"✅ تم تغيير نسبة البونص إلى **{new_val}%** بنجاح!", parse_mode="Markdown")
    except ValueError:
        bot.reply_to(message, "⚠️ يرجى إدخال رقم صحيح فقط.")

# ----------------------------------------------------
# 6. المعالجة الأساسية للرسائل النصية
# ----------------------------------------------------
@bot.message_handler(func=lambda m: True)
def handle_text(message):
    user_id = message.from_user.id
    if user_id in banned_users:
        return

    state = user_states.get(user_id)
    text = message.text.strip()

    # 1. أوامر ووظائف الأدمين
    if user_id == ADMIN_ID and admin_states.get(ADMIN_ID, {}).get('action') == 'waiting_credentials':
        target_user_id = admin_states[ADMIN_ID]['target_user_id']
        admin_input = text
        try:
            if ":" in admin_input:
                u_name, p_word = admin_input.split(":", 1)
                users_accounts[target_user_id] = {'username': u_name.strip(), 'password': p_word.strip(), 'status': 'approved'}
                save_accounts()
                user_msg = (
                    f"🎉 **تم تجهيز حساب iChancy الخاص بك بنجاح!**\n\n"
                    f"🔑 **بيانات الدخول:**\n`{admin_input}`\n\n"
                    f"نتمنى لك تجربة ممتعة! ✨"
                )
                bot.send_message(target_user_id, user_msg, parse_mode="Markdown")
                bot.reply_to(message, f"✅ تم إرسال البيانات وتحديث حساب الزبون `{target_user_id}` بنجاح.", parse_mode="Markdown")
        except Exception as e:
            bot.reply_to(message, f"❌ حدث خطأ أثناء إرسال البيانات للزبون: {e}")
        admin_states[ADMIN_ID] = None
        return

    if user_id == ADMIN_ID and state == 'adm_code_amount':
        if text.isdigit():
            amt = int(text)
            code = "GIFT-" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            gift_codes[code] = amt
            save_gifts()
            user_states[ADMIN_ID] = None
            bot.send_message(ADMIN_ID, f"🎉 **تم إنشاء كود هدية بنجاح!**\n\n🎁 الكود: `{code}`\n💰 المبلغ: `{amt:,} SYP`", parse_mode='Markdown')
        else:
            bot.send_message(ADMIN_ID, "❌ يرجى إدخال مبلغ صحيح بالأرقام فقط.")
        return

    if user_id == ADMIN_ID and state == 'adm_ban_id':
        if text.isdigit():
            banned_users.add(int(text))
            user_states[ADMIN_ID] = None
            bot.send_message(ADMIN_ID, f"🚫 تم حظر المستخدم `{text}` بنجاح.", parse_mode='Markdown')
        return

    if user_id == ADMIN_ID and state == 'adm_unban_id':
        if text.isdigit():
            banned_users.discard(int(text))
            user_states[ADMIN_ID] = None
            bot.send_message(ADMIN_ID, f"✅ تم إلغاء حظر المستخدم `{text}`.", parse_mode='Markdown')
        return

    # 2. كود الهدية والحسابات
    if state == 'waiting_gift_code':
        if text in gift_codes:
            amt = gift_codes.pop(text)
            save_gifts()
            user_states[user_id] = None
            add_record(user_id, f"استخدام كود هدية بقيمة {amt:,} SYP")
            bot.send_message(message.chat.id, f"🎉 تم تفعيل الكود بنجاح بقيمة `{amt:,} SYP`!", parse_mode='Markdown')
        else:
            bot.send_message(message.chat.id, "❌ الكود غير صحيح أو تم استخدامه سابقاً.")
            user_states[user_id] = None
        return

    if state == 'acc_username':
        user_temp_data[user_id] = {'u': text}
        user_states[user_id] = 'acc_password'
        bot.send_message(message.chat.id, "🔑 أدخل **كلمة المرور** (8 عناصر على الأقل):", reply_markup=get_cancel_markup())
        return

    if state == 'acc_password':
        if len(text) < 8:
            bot.send_message(message.chat.id, "❌ كلمة المرور قصيرة جداً.")
            return
        u_name = user_temp_data[user_id]['u']
        users_accounts[user_id] = {'username': u_name, 'password': text, 'status': 'pending'}
        save_accounts()
        user_states[user_id] = None
        markup = types.InlineKeyboardMarkup(row_width=2)
        markup.add(
            types.InlineKeyboardButton("قبول ✅", callback_data=f"admin_approve_{user_id}_acc"),
            types.InlineKeyboardButton("رفض ❌", callback_data=f"admin_reject_{user_id}_acc")
        )
        markup.add(
            types.InlineKeyboardButton("⚙️ تعديل / إرسال الحساب للزبون", callback_data=f"admin_edit_acc_{user_id}")
        )
        bot.send_message(
            ADMIN_ID,
            f"👤 **طلب إنشاء حساب iChancy جديد:**\n- إيدي الزبون: `{user_id}`\n- اسم المستخدم المطلوبة: `{u_name}`\n- كلمة السر: `{text}`",
            reply_markup=markup,
            parse_mode='Markdown'
        )
        bot.send_message(message.chat.id, "⏳ تم إرسال طلبك للإدارة، جاري المعالجة...")
        return

    # 3. شحن سيرياتيل كاش
    if state == 'c_syr_amount':
        if not text.isdigit() or int(text) < 25000:
            bot.send_message(message.chat.id, "❌ الحد الأدنى للشحن هو 25,000 SYP:")
            return
        amt = float(text)
        config = get_bonus_config()
        bonus_rate = config.get("bonus_rate", 0.05) if config.get("is_active", True) else 0.0
        bonus_amt = amt * bonus_rate
        total_amt = amt + bonus_amt
        user_temp_data[user_id] = {'amt': amt, 'bonus': bonus_amt, 'total': total_amt}
        user_states[user_id] = 'c_syr_tx'
        bonus_msg = f"\n🎁 البونص المضاف: `{bonus_amt:,} SYP`\n💰 الإجمالي: `{total_amt:,} SYP`" if bonus_rate > 0 else ""
        bot.send_message(message.chat.id, f"💐 **تفاصيل الشحن:**\nالمبلغ: `{amt:,} SYP`{bonus_msg}\n\n🧾 أدخل الآن رقم عملية التحويل (الوصل):", parse_mode='Markdown', reply_markup=get_cancel_markup())
        return

    if state == 'c_syr_tx':
        data = user_temp_data.get(user_id, {})
        acc_info = get_admin_account_info(user_id)
        user_temp_data[user_id]['last_details'] = f"شحن سيرياتيل بقيمة {data.get('amt', 0)} SYP (المجموع {data.get('total', 0)} SYP)"
        user_states[user_id] = None
        markup = types.InlineKeyboardMarkup()
        markup.add(
            types.InlineKeyboardButton("قبول ✅", callback_data=f"admin_approve_{user_id}_csyr"),
            types.InlineKeyboardButton("رفض ❌", callback_data=f"admin_reject_{user_id}_csyr")
        )
        bot.send_message(ADMIN_ID, f"📤 **طلب شحن سيرياتيل:**\n- المبلغ الأصلي: `{data.get('amt', 0)}` SYP\n- الإجمالي مع البونص: `{data.get('total', 0)}` SYP\n- رقم العملية: `{text}`{acc_info}", reply_markup=markup, parse_mode='Markdown')
        bot.send_message(message.chat.id, "⏳ جاري معالجة طلب الشحن...")
        return

    # 4. شحن شام كاش
    if state == 'c_sham_amount':
        try:
            amt = float(text)
            if amt <= 0:
                bot.send_message(message.chat.id, "❌ يرجى إدخال مبلغ صحيح أكبر من 0:")
                return
        except ValueError:
            bot.send_message(message.chat.id, "❌ يرجى إدخال أرقام فقط:")
            return

        if user_id not in user_temp_data:
            user_temp_data[user_id] = {}
        curr = user_temp_data[user_id].get('curr', 'SYP')
        config = get_bonus_config()
        bonus_rate = config.get("bonus_rate", 0.05) if (config.get("is_active", True) and curr == 'SYP') else 0.0
        bonus_amt = amt * bonus_rate
        total_amt = amt + bonus_amt
        user_temp_data[user_id].update({'amt': amt, 'bonus': bonus_amt, 'total': total_amt})
        user_states[user_id] = 'c_sham_tx'
        bonus_msg = f"\n🎁 البونص المضاف: `{bonus_amt:,} {curr}`\n💰 الإجمالي: `{total_amt:,} {curr}`" if bonus_rate > 0 else ""
        bot.send_message(message.chat.id, f"🟢 **تفاصيل شحن شام كاش ({curr}):**\nالمبلغ: `{amt:,} {curr}`{bonus_msg}\n\n🧾 أدخل الآن رقم عملية التحويل (الوصل):", parse_mode='Markdown', reply_markup=get_cancel_markup())
        return

    if state == 'c_sham_tx':
        data = user_temp_data.get(user_id, {})
        curr = data.get('curr', 'SYP')
        acc_info = get_admin_account_info(user_id)
        user_temp_data[user_id]['last_details'] = f"شحن شام كاش بقيمة {data.get('amt', 0)} {curr}"
        user_states[user_id] = None
        markup = types.InlineKeyboardMarkup()
        markup.add(
            types.InlineKeyboardButton("قبول ✅", callback_data=f"admin_approve_{user_id}_csham"),
            types.InlineKeyboardButton("رفض ❌", callback_data=f"admin_reject_{user_id}_csham")
        )
        bot.send_message(ADMIN_ID, f"🟢 **طلب شحن شام كاش ({curr}):**\n- المبلغ: `{data.get('amt', 0)}` {curr}\n- الإجمالي مع البونص: `{data.get('total', 0)}` {curr}\n- رقم العملية: `{text}`{acc_info}", reply_markup=markup, parse_mode='Markdown')
        bot.send_message(message.chat.id, "⏳ جاري معالجة طلب الشحن...")
        return

    # 5. سحب سيرياتيل
    if state == 'w_syr_amount':
        try:
            amt = float(text)
            if amt < 100000 or amt > 500000:
                bot.send_message(message.chat.id, "❌ المبلغ خارج الحدود المسموحة (من 100,000 إلى 500,000 SYP):")
                return
        except ValueError:
            bot.send_message(message.chat.id, "❌ يرجى إدخال رقم فقط:")
            return

        user_temp_data[user_id] = {'w_amt': amt}
        user_states[user_id] = 'w_syr_phone'
        bot.send_message(message.chat.id, "📱 أدخل الآن **رقم كاش سيرياتيل** المراد التمويل إليه:", reply_markup=get_cancel_markup())
        return

    if state == 'w_syr_phone':
        amt = user_temp_data.get(user_id, {}).get('w_amt', 0)
        acc_info = get_admin_account_info(user_id)
        user_temp_data[user_id]['last_details'] = f"سحب سيرياتيل بقيمة {amt} SYP لرقم {text}"
        user_states[user_id] = None
        markup = types.InlineKeyboardMarkup()
        markup.add(
            types.InlineKeyboardButton("قبول ✅", callback_data=f"admin_approve_{user_id}_wsyr"),
            types.InlineKeyboardButton("رفض ❌", callback_data=f"admin_reject_{user_id}_wsyr")
        )
        bot.send_message(ADMIN_ID, f"📥 **طلب سحب سيرياتيل كاش:**\n- المبلغ المطلوبة: `{amt:,}` SYP\n- الرقم المطلوب التحويل له: `{text}`{acc_info}", reply_markup=markup, parse_mode='Markdown')
        bot.send_message(message.chat.id, "⏳ تم إرسال طلب السحب للإدارة، جاري المعالجة...")
        return

    # 6. سحب شام كاش
    if state == 'w_sham_amount':
        try:
            amt = float(text)
            if amt <= 0:
                bot.send_message(message.chat.id, "❌ أدخل مبلغ صحيح:")
                return
        except ValueError:
            bot.send_message(message.chat.id, "❌ أدخل أرقام فقط:")
            return

        if user_id not in user_temp_data:
            user_temp_data[user_id] = {}
        user_temp_data[user_id]['w_amt'] = amt
        user_states[user_id] = 'w_sham_acc'
        bot.send_message(message.chat.id, "🟢 أدخل الآن **معرّف/حساب شام كاش** الخاص بك للتحويل إليه:", reply_markup=get_cancel_markup())
        return

    if state == 'w_sham_acc':
        amt = user_temp_data.get(user_id, {}).get('w_amt', 0)
        curr = user_temp_data.get(user_id, {}).get('currency', 'SYP')
        acc_info = get_admin_account_info(user_id)
        user_temp_data[user_id]['last_details'] = f"سحب شام كاش بقيمة {amt} {curr} لحساب {text}"
        user_states[user_id] = None
        markup = types.InlineKeyboardMarkup()
        markup.add(
            types.InlineKeyboardButton("قبول ✅", callback_data=f"admin_approve_{user_id}_wsham"),
            types.InlineKeyboardButton("رفض ❌", callback_data=f"admin_reject_{user_id}_wsham")
        )
        bot.send_message(ADMIN_ID, f"📥 **طلب سحب شام كاش ({curr}):**\n- المبلغ: `{amt}` {curr}\n- عنوان شام كاش للزبون: `{text}`{acc_info}", reply_markup=markup, parse_mode='Markdown')
        bot.send_message(message.chat.id, "⏳ تم إرسال طلب السحب للإدارة، جاري المعالجة...")
        return

# ----------------------------------------------------
# 7. تشغيل البوت
# ----------------------------------------------------
if __name__ == '__main__':
    bot.remove_webhook()
    time.sleep(1)
    bot.infinity_polling()
