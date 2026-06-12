import { config } from "dotenv";
import {
  createAsciiBot,
  createOpenAsciiKeyboard,
  resolveTelegramWebAppUrl,
} from "../lib/telegram/bot";

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

bot.catch((error) => {
  console.error("Bot error:", error);
});

void bot.start({
  onStart: (botInfo) => {
    console.log("ASCII bot started as @" + botInfo.username);
  },
});
