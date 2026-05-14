import { Telegraf, Markup } from "telegraf";
import nodemailer from "nodemailer";

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new Telegraf(token || "missing-token");

const CONTACT_PHONE = "+7 985 888 92 63";
const CONTACT_EMAIL = "galolo066@gmail.com";

const ADMIN_TELEGRAM_ID = String(process.env.ADMIN_TELEGRAM_ID || "");
const ADMIN_CHAT_ID = String(process.env.ADMIN_CHAT_ID || process.env.ADMIN_TELEGRAM_ID || "");

// Простое хранение состояния диалога.
// Для Vercel этого достаточно для обычных заявок, но после перезапуска функции состояние может сброситься.
// Если потом нужна полноценная CRM/история заявок — лучше подключить базу данных.
const userSessions = new Map();

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

function cancelMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("❌ Отменить заявку", "cancel_lead")]
  ]);
}

async function showStart(ctx) {
  userSessions.delete(String(ctx.from?.id || ""));

  if (isAdmin(ctx)) {
    await ctx.reply(
      "🔐 Админ-панель OfficeTech Pro\n\nВы вошли как администратор.\n\nКлиенты видят клиентское меню и отправляют заявки. Уведомления о заявках приходят сюда или в отдельный ADMIN_CHAT_ID.",
      adminMenu()
    );
    return;
  }

  await ctx.reply(
    "Здравствуйте! Я бот OfficeTech Pro.\n\nЗдесь можно посмотреть услуги, выбрать пакет, оставить заявку или обратиться в поддержку 24/7.",
    clientMenu()
  );
}

function required(value) {
  return value && String(value).trim().length > 0;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
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

function buildAdminLead(ctx, data) {
  const from = ctx.from || {};
  const tgName = [from.first_name, from.last_name].filter(Boolean).join(" ") || "Не указано";
  const username = from.username ? `@${from.username}` : "Не указан";

  return [
    "📩 <b>Новая заявка из Telegram-бота</b>",
    "",
    `👤 <b>Имя клиента:</b> ${escapeHtml(data.firstName)}`,
    `📧 <b>Почта:</b> ${escapeHtml(data.email)}`,
    `🏢 <b>Компания:</b> ${escapeHtml(data.company)}`,
    `💬 <b>Комментарий:</b> ${escapeHtml(data.comment || "Нет комментария")}`,
    "",
    `👤 <b>Имя в Telegram:</b> ${escapeHtml(tgName)}`,
    `🔗 <b>Username:</b> ${escapeHtml(username)}`,
    `🆔 <b>Telegram ID:</b> <code>${escapeHtml(String(from.id || ""))}</code>`
  ].join("\n");
}

function buildPlainLead(ctx, data) {
  const from = ctx.from || {};
  const tgName = [from.first_name, from.last_name].filter(Boolean).join(" ") || "Не указано";
  const username = from.username ? `@${from.username}` : "Не указан";

  return [
    "Новая заявка из Telegram-бота",
    "",
    `Имя клиента: ${data.firstName}`,
    `Почта: ${data.email}`,
    `Компания: ${data.company}`,
    `Комментарий: ${data.comment || "Нет комментария"}`,
    "",
    `Имя в Telegram: ${tgName}`,
    `Username: ${username}`,
    `Telegram ID: ${from.id || ""}`
  ].join("\n");
}

async function startLeadFlow(ctx) {
  if (isAdmin(ctx)) {
    await ctx.reply(
      "🔐 Вы в админ-режиме. Чтобы проверить клиентскую заявку, откройте бота с другого Telegram-аккаунта.",
      adminMenu()
    );
    return;
  }

  const userId = String(ctx.from.id);
  userSessions.set(userId, {
    mode: "lead",
    step: "firstName",
    data: {}
  });

  await ctx.reply(
    "📝 Оставим заявку.\n\nВведите ваше имя.\n\nФамилия и отчество не нужны — только имя.",
    cancelMenu()
  );
}

bot.start(showStart);

bot.action("cancel_lead", async (ctx) => {
  await ctx.answerCbQuery();
  userSessions.delete(String(ctx.from?.id || ""));
  await ctx.reply("Заявка отменена.", clientMenu());
});

bot.action("admin_info", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    "📥 Как работает разделение:\n\n1. Клиент видит клиентское меню.\n2. Клиент заполняет обязательные поля: имя, почта и компания.\n3. Если поле не заполнено — бот показывает ошибку.\n4. Потом клиент пишет комментарий.\n5. Заявка отправляется администратору."
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
Интеграция ИИ — от 30 000 ₽
Удалённый Windows-ПК в США — от 10 000 ₽ / месяц`,
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

Чтобы оставить обращение, нажмите «Оставить заявку» и заполните имя, почту и компанию.

После этого напишите комментарий с описанием проблемы.`,
    Markup.inlineKeyboard([[Markup.button.callback("📝 Оставить заявку", "client_lead")]])
  );
});

bot.action("client_lead", async (ctx) => {
  await ctx.answerCbQuery();
  await startLeadFlow(ctx);
});

bot.action("client_contacts", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(`📞 Телефон: ${CONTACT_PHONE}\n📧 Почта: ${CONTACT_EMAIL}`);
});

bot.on("text", async (ctx) => {
  const userId = String(ctx.from?.id || "");
  const text = String(ctx.message.text || "").trim();
  const session = userSessions.get(userId);

  if (isAdmin(ctx)) {
    await ctx.reply(
      "🔐 Вы в админ-режиме.\n\nЧтобы проверить клиентскую часть, откройте бота с другого Telegram-аккаунта.",
      adminMenu()
    );
    return;
  }

  if (!session || session.mode !== "lead") {
    await ctx.reply(
      "Выберите раздел в меню или нажмите «Оставить заявку».",
      clientMenu()
    );
    return;
  }

  if (session.step === "firstName") {
    if (!required(text)) {
      await ctx.reply("❗ Вы не заполнили обязательное поле: имя.\n\nВведите ваше имя:", cancelMenu());
      return;
    }

    session.data.firstName = text;
    session.step = "email";
    userSessions.set(userId, session);

    await ctx.reply("Введите вашу почту:", cancelMenu());
    return;
  }

  if (session.step === "email") {
    if (!required(text)) {
      await ctx.reply("❗ Вы не заполнили обязательное поле: почта.\n\nВведите вашу почту:", cancelMenu());
      return;
    }

    if (!isValidEmail(text)) {
      await ctx.reply("❗ Почта указана некорректно.\n\nВведите почту в формате name@example.com:", cancelMenu());
      return;
    }

    session.data.email = text;
    session.step = "company";
    userSessions.set(userId, session);

    await ctx.reply("Введите название компании:", cancelMenu());
    return;
  }

  if (session.step === "company") {
    if (!required(text)) {
      await ctx.reply("❗ Вы не заполнили обязательное поле: компания.\n\nВведите название компании:", cancelMenu());
      return;
    }

    session.data.company = text;
    session.step = "comment";
    userSessions.set(userId, session);

    await ctx.reply(
      "Теперь напишите комментарий к заявке.\n\nНапример: что нужно настроить, какая проблема, какой тариф интересует или когда удобно связаться.",
      cancelMenu()
    );
    return;
  }

  if (session.step === "comment") {
    session.data.comment = text || "Нет комментария";

    const adminText = buildAdminLead(ctx, session.data);
    const plainText = buildPlainLead(ctx, session.data);

    await Promise.all([
      sendAdmin(adminText),
      sendEmail(plainText)
    ]);

    userSessions.delete(userId);

    await ctx.reply(
      "✅ Спасибо! Заявка отправлена. Специалист получил уведомление и скоро свяжется с вами.",
      clientMenu()
    );
    return;
  }
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
