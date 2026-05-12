# OfficeTech Pro — чистый проект для Vercel

В проекте нет `server.js`.  
Для Vercel используются только:

- `public/` — сайт
- `api/lead.js` — заявки с сайта
- `api/bot.js` — Telegram-бот через webhook
- `api/set-webhook.js` — подключение webhook

## Минимальные переменные Vercel

TELEGRAM_BOT_TOKEN
ADMIN_TELEGRAM_ID
PUBLIC_URL

## После деплоя открыть

https://ВАШ-ДОМЕН.vercel.app/api/set-webhook
