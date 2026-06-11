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
  await ctx.reply(
    [
      "ASCII is online.",
      "",
      "Open the Mini App and turn text, images, and videos into terminal-style ASCII.",
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
