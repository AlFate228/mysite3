export default async function handler(req, res) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const publicUrl = process.env.PUBLIC_URL;

    if (!token || !publicUrl) {
      return res.status(400).json({
        ok: false,
        message: "Нужно указать TELEGRAM_BOT_TOKEN и PUBLIC_URL в Vercel Environment Variables"
      });
    }

    const webhookUrl = `${publicUrl.replace(/\/$/, "")}/api/bot`;
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
    const data = await response.json();

    return res.status(200).json({ ok: true, webhookUrl, telegram: data });
  } catch (error) {
    return res.status(500).json({ ok: false, message: String(error) });
  }
}
