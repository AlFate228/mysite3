import nodemailer from "nodemailer";

function required(value) {
  return value && String(value).trim().length > 0;
}

function buildLeadText(data) {
  return [
    "📩 Новая заявка с сайта",
    "",
    `👤 ФИО: ${data.fullName || "Не указано"}`,
    `📧 Почта: ${data.email || "Не указана"}`,
    `🏢 Компания: ${data.company || "Не указана"}`,
    `🧰 Услуга: ${data.service || "Не указана"}`,
    `💬 Комментарий: ${data.message || "Нет"}`
  ].join("\n");
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
    subject: "Новая заявка на IT консультацию",
    text
  });
}

async function sendTelegram(text) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.ADMIN_TELEGRAM_ID) {
    console.log("Telegram не настроен:", text);
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: process.env.ADMIN_TELEGRAM_ID,
      text
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    const data = req.body || {};

    if (!required(data.fullName) || !required(data.email)) {
      return res.status(400).json({ ok: false, message: "ФИО и почта обязательны" });
    }

    const text = buildLeadText(data);

    await Promise.all([
      sendEmail(text),
      sendTelegram(text)
    ]);

    return res.status(200).json({ ok: true, message: "Заявка отправлена" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Ошибка сервера" });
  }
}
