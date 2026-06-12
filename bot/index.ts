import { config } from "dotenv";
import { createHash } from "node:crypto";
import type { InlineQueryResultArticle } from "grammy/types";
import { cleanText, renderTelegramInlineAsciiText } from "../lib/ascii/text-renderer";
import {
  createAsciiBot,
  createOpenAsciiKeyboard,
  resolveTelegramWebAppUrl,
} from "../lib/telegram/bot";
import { parseInlineTextQuery } from "../lib/telegram/inline-text";

config({ path: ".env.local" });
config();

const token = process.env.BOT_TOKEN;

if (!token) {
  console.error(
    "BOT_TOKEN is required. Copy .env.example to .env.local or export BOT_TOKEN.",
  );
  process.exit(1);
}

const webAppUrl = resolveTelegramWebAppUrl(process.env);
const bot = createAsciiBot(token);

bot.command("start", async (ctx) => {
  const startPayload = typeof ctx.match === "string" ? ctx.match.trim() : "";
  const heading =
    startPayload === "ascii_export"
      ? "ASCII bot connected."
      : "ASCII is online.";

  await ctx.reply(
    [
      heading,
      "",
      "Open the Mini App and turn text, images, and videos into terminal-style ASCII.",
      startPayload === "ascii_export"
        ? "Then return to the app and press export again."
        : "",
    ].join("\n"),
    {
      reply_markup: createOpenAsciiKeyboard(webAppUrl),
    },
  );
});

bot.on("inline_query", async (ctx) => {
  const parsedQuery = parseInlineTextQuery(ctx.inlineQuery.query);

  if (!parsedQuery) {
    await ctx.answerInlineQuery(
      [
        {
          description: "Open the Mini App, generate text, then tap PUBLISH TEXT.",
          id: "asciilograph-open",
          input_message_content: {
            message_text:
              "Open ASCIILOGRAPH, generate ASCII text, then tap PUBLISH TEXT.",
          },
          title: "ASCIILOGRAPH text publisher",
          type: "article",
        },
      ],
      {
        cache_time: 0,
        is_personal: true,
      },
    );
    return;
  }

  const text = cleanText(parsedQuery.text);
  const asciiText = await renderTelegramInlineAsciiText(text, parsedQuery.font);
  const resultId = createHash("sha256")
    .update(ctx.inlineQuery.query)
    .digest("hex")
    .slice(0, 32);
  const result: InlineQueryResultArticle = {
    description: `${parsedQuery.font} / fixed-width Telegram post`,
    id: resultId,
    input_message_content: {
      entities: [
        {
          length: asciiText.length,
          offset: 0,
          type: "pre",
        },
      ],
      message_text: asciiText,
    },
    title: `Publish "${text.slice(0, 36)}"`,
    type: "article",
  };

  await ctx.answerInlineQuery([result], {
    cache_time: 0,
    is_personal: true,
  });
});

bot.catch((error) => {
  console.error("Bot error:", error);
});

void bot.start({
  onStart: (botInfo) => {
    console.log("ASCII bot started as @" + botInfo.username);
  },
});
