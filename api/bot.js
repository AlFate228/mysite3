import { Telegraf, Markup } from "telegraf";
import nodemailer from "nodemailer";

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new Telegraf(token || "missing-token");

const CONTACT_PHONE = "+7 985 888 92 63";
const CONTACT_EMAIL = "galolo066@gmail.com";

// ADMIN_TELEGRAM_ID — твой личный Telegram ID.
// ADMIN_CHAT_ID — отдельный чат/группа для заявок. Если не указан, заявки идут в ADMIN_TELEGRAM_ID.
const ADMIN_TELEGRAM_ID = String(process.env.ADMIN_TELEGRAM_ID || "");
const ADMIN_CHAT_ID = String(process.env.ADMIN_CHAT_ID || process.env.ADMIN_TELEGRAM_ID || "");

function isAdmin(ctx) {
  return String(ctx.from?.id || "") === ADMIN_TELEGRAM_ID;
}

function clientMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("🧰 Услуги", "client_services"), Markup.button.callback("📦 Пакеты", "client_packages")],
    [Markup.button.callback("🤖 Интеграция ИИ", "client_ai"), Markup.button.callback("🆘 Поддержка 24/7", "client_support")],
    [Markup.button.callback("📝 Оставить заявку", "client_lead"), Markup.button.callback("📞 Контакты", "client_contacts")]
  ]);
}

function adminMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("📥 Как приходят заявки", "admin_info")],
    [Markup.button.callback("🧰 Посмотреть услуги как клиент", "client_services")],
    [Markup.button.callback("📞 Контакты", "client_contacts")]
  ]);
}

async function showStart(ctx) {
  if (isAdmin(ctx)) {
    await ctx.reply(
      "🔐 Админ-панель OfficeTech Pro\n\nВы вошли как администратор.\n\nСюда будут приходить уведомления о заявках клиентов. Клиенты при входе в бот видят другое меню — клиентское.",
      adminMenu()
    );
    return;
  }

  await ctx.reply(
    "Здравствуйте! Я бот OfficeTech Pro.\n\nЗдесь можно посмотреть услуги, выбрать пакет, оставить заявку или обратиться в поддержку 24/7.",
    clientMenu()
  );
}

async function sendAdmin(text) {
  if (!ADMIN_CHAT_ID) {
    console.log("ADMIN_CHAT_ID / ADMIN_TELEGRAM_ID missing:", text);
    return;
  }

  await bot.telegram.sendMessage(ADMIN_CHAT_ID, text, {
    parse_mode: "HTML"
  });
}

async function sendEmail(textPlain) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.LEAD_EMAIL_TO) {
    console.log("Email не настроен:", textPlain);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.LEAD_EMAIL_FROM || process.env.SMTP_USER,
    to: process.env.LEAD_EMAIL_TO,
    subject: "Новая заявка из Telegram-бота",
    text: textPlain
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function adminLeadText(ctx, userText, type = "Заявка/сообщение") {
  const from = ctx.from || {};
  const name = [from.first_name, from.last_name].filter(Boolean).join(" ") || "Не указано";
  const username = from.username ? `@${from.username}` : "Не указан";

  return [
    `📩 <b>${escapeHtml(type)}</b>`,
    "",
    `👤 <b>Имя в Telegram:</b> ${escapeHtml(name)}`,
    `🔗 <b>Username:</b> ${escapeHtml(username)}`,
    `🆔 <b>Telegram ID:</b> <code>${escapeHtml(String(from.id || ""))}</code>`,
    "",
    `💬 <b>Сообщение клиента:</b>`,
    escapeHtml(userText)
  ].join("\n");
}

function plainLeadText(ctx, userText, type = "Заявка/сообщение") {
  const from = ctx.from || {};
  const name = [from.first_name, from.last_name].filter(Boolean).join(" ") || "Не указано";
  const username = from.username ? `@${from.username}` : "Не указан";

  return [
    type,
    "",
    `Имя в Telegram: ${name}`,
    `Username: ${username}`,
    `Telegram ID: ${from.id || ""}`,
    "",
    "Сообщение клиента:",
    userText
  ].join("\n");
}

bot.start(showStart);

bot.action("admin_info", async (ctx) => {
  await ctx.answerCbQuery();

  await ctx.reply(
    "📥 Как работает разделение:\n\n1. Обычные клиенты видят клиентское меню.\n2. Клиент отправляет заявку или пишет проблему.\n3. Клиент получает только подтверждение: «Заявка отправлена».\n4. Ты как админ получаешь полную заявку сюда или в отдельный ADMIN_CHAT_ID.\n\nЛучший вариант: создать отдельную Telegram-группу «OfficeTech заявки», добавить туда бота и указать её ID как ADMIN_CHAT_ID в Vercel."
  );
});

bot.action("client_services", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
`🧰 Услуги:

Компьютеры сотрудников — от 7 000 ₽
Сеть / Wi‑Fi / VPN — от 18 000 ₽
Серверы и Active Directory — от 25 000 ₽
Microsoft 365 / Google Workspace — от 15 000 ₽
IP-телефония и CRM — от 22 000 ₽
Backup и безопасность — от 20 000 ₽
Интеграция ИИ — от 30 000 ₽`,
    Markup.inlineKeyboard([[Markup.button.callback("📝 Оставить заявку", "client_lead")]])
  );
});

bot.action("client_packages", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
`📦 Пакеты:

Office Start — от 65 000 ₽
Для небольшого офиса до 5 рабочих мест.

Office Pro — от 140 000 ₽
Офис под ключ до 15 рабочих мест.

Office Enterprise — индивидуально
Аудит, серверы, телефония, безопасность, SLA, 24/7.`,
    Markup.inlineKeyboard([[Markup.button.callback("📝 Оставить заявку", "client_lead")]])
  );
});

bot.action("client_ai", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
`🤖 Интеграция ИИ — от 30 000 ₽

Можно сделать:
• Telegram-бот для заявок
• AI-ассистент для сайта
• Автоматизация ответов клиентам
• Обработка документов
• Автоматизация внутренних процессов`,
    Markup.inlineKeyboard([[Markup.button.callback("📝 Заявка на ИИ", "client_lead")]])
  );
});

bot.action("client_support", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
`🆘 Поддержка 24/7

Напишите одним сообщением вашу проблему.

Например:
ФИО: Иван Иванов
Компания: Ромашка
Проблема: не работает принтер
Телефон: +7...`
  );
});

bot.action("client_lead", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
`📝 Оставьте заявку одним сообщением:

ФИО:
Почта:
Компания:
Услуга:
Комментарий:
Телефон:

После отправки я передам заявку специалисту.`
  );
});

bot.action("client_contacts", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(`📞 Телефон: ${CONTACT_PHONE}\n📧 Почта: ${CONTACT_EMAIL}`);
});

bot.on("text", async (ctx) => {
  // Если пишет админ — не отправляем его же сообщение как заявку самому себе.
  if (isAdmin(ctx)) {
    await ctx.reply(
      "🔐 Вы в админ-режиме.\n\nЧтобы проверить клиентскую часть, нажмите «Посмотреть услуги как клиент» или откройте бота с другого Telegram-аккаунта.",
      adminMenu()
    );
    return;
  }

  const htmlText = adminLeadText(ctx, ctx.message.text, "Новая заявка из Telegram-бота");
  const plainText = plainLeadText(ctx, ctx.message.text, "Новая заявка из Telegram-бота");

  await Promise.all([
    sendAdmin(htmlText),
    sendEmail(plainText)
  ]);

  // Клиенту отправляем только обычное подтверждение, без админской информации.
  await ctx.reply(
    "✅ Спасибо! Заявка отправлена. Специалист получил уведомление и скоро свяжется с вами.",
    clientMenu()
  );
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("Telegram bot webhook is running");
  }

  try {
    await bot.handleUpdate(req.body);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: String(error) });
  }
}
