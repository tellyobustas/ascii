# ASCII

ASCII — Telegram Mini App и Telegram Bot для будущих генераторов текста, изображений и видео в ASCII / Matrix / terminal стиле.

Текущий этап: базовый setup проекта и Telegram bot с кнопкой OPEN ASCII. Генераторы, Telegram-валидация, отправка результатов и video worker будут добавляться следующими этапами.

## Стек

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- grammY для Telegram Bot
- Framer Motion для UI-анимаций
- Sharp / FFmpeg / figlet / p-queue зарезервированы под следующие этапы

## Структура

    app/                         Next.js App Router
    app/api/                     API routes
    components/                  UI-компоненты
    components/ascii-background/ Живой ASCII/Matrix фон
    components/editor/           Общий UI редактора
    lib/telegram/                Telegram WebApp и bot helpers
    lib/ascii/                   Text/image/video ASCII processors
    lib/canvas/                  Canvas fitting/export helpers
    lib/storage/                 Временное хранение файлов
    lib/queue/                   Очереди обработки
    bot/                         Telegram bot entry
    public/                      Статичные ассеты
    tmp/                         Временные файлы, не коммитятся

## Установка

    npm install

## Env

Создай .env.local на основе .env.example:

    BOT_TOKEN=
    NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=
    NEXT_PUBLIC_APP_URL=
    TELEGRAM_WEBAPP_URL=
    BLOB_READ_WRITE_TOKEN=

## Локальный запуск

Frontend/API:

    npm run dev

Bot worker:

    npm run bot

Команда /start отправляет inline-кнопку OPEN ASCII. URL Mini App берётся из TELEGRAM_WEBAPP_URL, затем из NEXT_PUBLIC_APP_URL.

Проверки:

    npm run lint
    npm run build

## Telegram Mini App

Уже добавлено:

1. Bot worker на grammY.
2. Команда /start.
3. Inline-кнопка OPEN ASCII через web_app.

Следующие этапы добавят:

1. Вызов Telegram.WebApp.ready() и Telegram.WebApp.expand().
2. Серверную проверку initData через BOT_TOKEN.
3. Отправку PNG/MP4 результата пользователю из backend/bot слоя.

Для локального теста Mini App в Telegram обычно понадобится публичный HTTPS URL, например через ngrok:

    ngrok http 3000

После этого URL нужно указать в BotFather для Mini App / Web App button.

## Vercel

Проект рассчитан на деплой frontend + лёгких API routes на Vercel. Видео-обработка будет спроектирована с жёсткими лимитами и очередью, чтобы позже можно было вынести video worker на VPS без переписывания frontend API-контракта.

## MVP лимиты, которые будут заложены позже

- Images: ограничение размера входного файла и resize перед обработкой.
- Video: максимум 15 секунд, output width до 480px, fps 6/8/10/12, silent H.264 MP4, очередь с concurrency 1.
- Jobs: in-memory для MVP, с возможностью заменить на Redis/BullMQ.
- Storage: временные файлы очищаются после обработки.

## GitHub

Плановый remote:

    git remote add origin git@github.com:tellyobustas/ascii.git
    git branch -M main
    git push -u origin main
