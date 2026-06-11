import "dotenv/config";
import { createAsciiBot } from "../lib/telegram/bot";

const token = process.env.BOT_TOKEN;

if (!token) {
  console.error("BOT_TOKEN is required. Copy .env.example to .env.local or export BOT_TOKEN.");
  process.exit(1);
}

const bot = createAsciiBot(token);

bot.command("start", async (ctx) => {
  await ctx.reply("ASCII bot scaffold is ready. OPEN ASCII button arrives in stage 2.");
});

bot.catch((error) => {
  console.error("Bot error:", error);
});

void bot.start({
  onStart: (botInfo) => {
    console.log("ASCII bot started as @" + botInfo.username);
  },
});
