# ASCII

ASCII — Telegram Mini App и Telegram Bot для генераторов текста, изображений и видео в ASCII / Matrix / terminal стиле.

Текущий этап: готов базовый проект, Telegram bot с кнопкой OPEN ASCII, главный экран Mini App, процедурный ASCII background, рабочие TEXT / IMAGE / VIDEO генераторы для MVP.

## Стек

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- grammY для Telegram Bot
- Framer Motion для UI-анимаций
- figlet для TEXT generator
- Sharp / FFmpeg / p-queue зарезервированы под следующие этапы IMAGE/VIDEO

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

## Research notes

В проект перенесены не копии чужого кода, а полезные архитектурные и алгоритмические идеи из референсов:

- [divisionseven/artty](https://github.com/divisionseven/artty): 2x4 Unicode Braille cell mapping, threshold pipeline, contrast/sharpness pre-processing, lit-pixel-only color sampling и безопасные image limits. Это отражено в `lib/ascii/image.ts`.
- [miketierney/artii](https://github.com/miketierney/artii): идея font registry/listing поверх Figlet. В TEXT generator добавлены searchable font faces, группы и семплы.
- [2dameneko/img-vid-ascii](https://github.com/2dameneko/img-vid-ascii): отдельный ASCII video container/job metadata подход, charsets, batch/video pipeline и recorder separation. В `lib/ascii/video.ts` добавлены stages, presets и metadata contract для будущего worker.
- [collidingscopes ASCII](https://collidingscopes.github.io/ascii/): UX-паттерны live preview controls, effect width, style/resolution controls и browser-first preview. Для MVP это заложено как единые presets/limits, которые сможет читать frontend.

Главный принцип: TEXT работает через figlet и canvas fitting, IMAGE работает через Sharp + ASCII/Braille/Dither PNG renderer, VIDEO работает через FFmpeg + тот же image renderer по кадрам и собирает silent H.264 MP4.

## Установка

    npm install

## Env

Создай .env.local на основе .env.example:

    BOT_TOKEN=
    NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=
    NEXT_PUBLIC_APP_URL=
    TELEGRAM_WEBAPP_URL=
    REQUIRED_CHANNEL_USERNAME=
    REQUIRED_CHANNEL_ID=
    REQUIRED_CHANNEL_URL=
    REQUIRED_CHANNEL_TITLE=
    BLOB_READ_WRITE_TOKEN=

Для ограничения доступа по подписке укажи один из вариантов:

- `REQUIRED_CHANNEL_USERNAME=@your_channel` для публичного канала.
- `REQUIRED_CHANNEL_ID=-1001234567890` для приватного канала.
- `REQUIRED_CHANNEL_URL=https://t.me/your_channel` или invite link для кнопки SUBSCRIBE.
- `REQUIRED_CHANNEL_TITLE=@your_channel` для текста в боте и Mini App.
- `NEXT_PUBLIC_REQUIRED_CHANNEL_URL=https://t.me/your_channel` для кнопки SUBSCRIBE прямо на gate screen.
- `NEXT_PUBLIC_REQUIRED_CHANNEL_TITLE=@your_channel` для подписи канала на gate screen.

Бот должен быть админом канала, иначе Telegram Bot API может не дать проверить подписку через `getChatMember`.

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
4. Главный экран Mini App в terminal UI.
5. Живой процедурный ASCII background.
6. TEXT generator: figlet font cards, canvas ratio, live fit preview, Telegram text publish, MP4 export.
7. IMAGE generator: upload JPG/PNG/WebP, mode buttons, Sharp render, preview, download PNG, copy ASCII.
8. VIDEO generator: upload MP4/MOV/WebM, mode buttons, fps/width controls, FFmpeg render, preview, download MP4.
9. Subscription gate: /start, Mini App validate, Telegram publish/export закрываются проверкой подписки на канал.

Следующие этапы добавят:

1. Асинхронный queue/job UI для долгого VIDEO render.
2. Расширенные настройки яркости, контраста, density, invert и glow.

Для локального теста Mini App в Telegram обычно понадобится публичный HTTPS URL, например через ngrok:

    ngrok http 3000

После этого URL нужно указать в BotFather для Mini App / Web App button.

## Vercel

Проект рассчитан на деплой frontend + лёгких API routes на Vercel. Видео-обработка будет спроектирована с жёсткими лимитами и очередью, чтобы позже можно было вынести video worker на VPS без переписывания frontend API-контракта.

## MVP лимиты

- Images: входной файл до 12 MB, входные dimensions до 8192x8192, output ASCII width до 500.
- Video: входной файл до 40 MB, максимум 15 секунд, output width до 480px, fps 6/8/10/12, silent H.264 MP4, очередь с concurrency 1.
- Jobs: in-memory для MVP, с возможностью заменить на Redis/BullMQ.
- Storage: временные файлы очищаются после обработки.

Если FFmpeg на Vercel упрётся в лимиты, frontend/API контракт останется прежним: video worker можно вынести на VPS и оставить `/api/video/render` как thin job gateway.

## GitHub

Плановый remote:

    git remote add origin git@github.com:tellyobustas/ascii.git
    git branch -M main
    git push -u origin main
