import { Bot, InlineKeyboard } from "grammy";

export const OPEN_ASCII_BUTTON_TEXT = "OPEN ASCII";
export const CHECK_SUBSCRIPTION_CALLBACK = "check_subscription";

export function createAsciiBot(token: string) {
  return new Bot(token);
}

export function createOpenAsciiKeyboard(webAppUrl: string) {
  return new InlineKeyboard().webApp(OPEN_ASCII_BUTTON_TEXT, webAppUrl);
}

export function createSubscriptionKeyboard({
  channelUrl,
  webAppUrl,
}: {
  channelUrl: string;
  webAppUrl: string;
}) {
  const keyboard = new InlineKeyboard();

  if (channelUrl) {
    keyboard.url("SUBSCRIBE", channelUrl).row();
  }

  return keyboard
    .text("CHECK SUBSCRIPTION", CHECK_SUBSCRIPTION_CALLBACK)
    .row()
    .webApp(OPEN_ASCII_BUTTON_TEXT, webAppUrl);
}

export function resolveTelegramWebAppUrl(
  env: Record<string, string | undefined>,
) {
  const webAppUrl = env.TELEGRAM_WEBAPP_URL ?? env.NEXT_PUBLIC_APP_URL;

  if (!webAppUrl) {
    throw new Error(
      "TELEGRAM_WEBAPP_URL or NEXT_PUBLIC_APP_URL is required for OPEN ASCII.",
    );
  }

  const parsedUrl = new URL(webAppUrl);

  if (parsedUrl.protocol !== "https:") {
    console.warn(
      "Telegram Mini Apps require an HTTPS web_app URL outside local development.",
    );
  }

  return parsedUrl.toString();
}
