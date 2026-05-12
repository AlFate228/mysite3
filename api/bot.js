import { Telegraf, Markup } from "telegraf";
import nodemailer from "nodemailer";

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new Telegraf(token || "missing-token");

const CONTACT_PHONE = "+7 985 888 92 63";
const CONTACT_EMAIL = "galolo066@gmail.com";

function menu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("🧰 Услуги", "services"), Markup.button.callback("📦 Пакеты", "packages")],
    [Markup.button.callback("🤖 Интеграция ИИ", "ai"), Markup.button.callback("🆘 Поддержка 24/7", "support")],
    [Markup.button.callback("📝 Оставить заявку", "lead"), Markup.button.callback("📞 Контакты", "contacts")]
  ]);
}

async function sendAdmin(text) {
  if (!process.env.ADMIN_TELEGRAM_ID) {
    console.log("ADMIN_TELEGRAM_ID missing:", text);
    return;
  }

  await bot.telegram.sendMessage(process.env.ADMIN_TELEGRAM_ID, text);
}

async function sendEmail(text) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.LEAD_EMAIL_TO) {
    console.log("Email не настроен:", text);
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
    text
  });
}

bot.start(async (ctx) => {
  await ctx.reply("Здравствуйте! Я бот IT-услуг и поддержки. Выберите раздел:", menu());
});

bot.action("services", async (ctx) => {
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
    Markup.inlineKeyboard([[Markup.button.callback("📝 Оставить заявку", "lead")]])
  );
});

bot.action("packages", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
`📦 Пакеты:

Office Start — от 65 000 ₽
Office Pro — от 140 000 ₽
Office Enterprise — индивидуально`,
    Markup.inlineKeyboard([[Markup.button.callback("📝 Оставить заявку", "lead")]])
  );
});

bot.action("ai", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
`🤖 Интеграция ИИ — от 30 000 ₽

Можно сделать:
• Telegram-бот для заявок
• AI-ассистент для сайта
• Автоматизация ответов клиентам
• Обработка документов
• Автоматизация внутренних процессов`,
    Markup.inlineKeyboard([[Markup.button.callback("📝 Заявка на ИИ", "lead")]])
  );
});

bot.action("support", async (ctx) => {
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

bot.action("lead", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
`📝 Оставьте заявку одним сообщением:

ФИО:
Почта:
Компания:
Услуга:
Комментарий:
Телефон:`
  );
});

bot.action("contacts", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(`📞 Телефон: ${CONTACT_PHONE}\n📧 Почта: ${CONTACT_EMAIL}`);
});

bot.on("text", async (ctx) => {
  const from = ctx.from;
  const text = [
    "📩 Новое сообщение/заявка из Telegram-бота",
    "",
    ctx.message.text,
    "",
    from?.username ? `Telegram: @${from.username}` : "",
    from?.id ? `Telegram ID: ${from.id}` : ""
  ].filter(Boolean).join("\n");

  await Promise.all([
    sendAdmin(text),
    sendEmail(text)
  ]);

  await ctx.reply("Спасибо! Я передал сообщение специалисту. С вами скоро свяжутся.", menu());
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
