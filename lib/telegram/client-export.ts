"use client";

export type TelegramSendErrorCode =
  | "BOT_CHAT_NOT_STARTED"
  | "SUBSCRIPTION_REQUIRED"
  | "TELEGRAM_SEND_FAILED";

export type TelegramSendResponse =
  | {
      ok: true;
      message: string;
    }
  | {
      code?: TelegramSendErrorCode;
      channelUrl?: string;
      message: string;
      ok: false;
      startUrl?: string;
    };

const TELEGRAM_WEB_APP_SDK_URL = "https://telegram.org/js/telegram-web-app.js";

let telegramSdkPromise: Promise<void> | null = null;

export function loadTelegramWebAppSdk() {
  if (typeof window === "undefined") return Promise.resolve();

  if (window.Telegram?.WebApp) return Promise.resolve();

  if (telegramSdkPromise) return telegramSdkPromise;

  telegramSdkPromise = new Promise((resolve, reject) => {
    const currentScript = document.querySelector<HTMLScriptElement>(
      `script[src="${TELEGRAM_WEB_APP_SDK_URL}"]`,
    );

    if (currentScript) {
      currentScript.addEventListener("load", () => resolve(), { once: true });
      currentScript.addEventListener("error", () => reject(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = TELEGRAM_WEB_APP_SDK_URL;
    script.onload = () => resolve();
    script.onerror = () => reject();
    document.head.appendChild(script);
  });

  return telegramSdkPromise;
}

export function getTelegramInitData() {
  if (typeof window === "undefined") return "";

  return window.Telegram?.WebApp?.initData ?? "";
}

export function getBotStartUrl() {
  const username = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(
    /^@/,
    "",
  ).trim();

  return username ? `https://t.me/${username}?start=ascii_export` : "";
}

export function openBotStartUrl(startUrl = getBotStartUrl()) {
  if (!startUrl) return;

  if (typeof window === "undefined") return;

  window.Telegram?.WebApp?.openTelegramLink?.(startUrl);

  if (!window.Telegram?.WebApp?.openTelegramLink) {
    window.open(startUrl, "_blank", "noopener,noreferrer");
  }
}

export function getTelegramSendErrorCopy(
  payload: Extract<TelegramSendResponse, { ok: false }>,
  fallback: string,
) {
  if (payload.code === "BOT_CHAT_NOT_STARTED") {
    return "Press START BOT once, then return to ASCII and export again.";
  }

  if (payload.code === "SUBSCRIPTION_REQUIRED") {
    return "Subscribe to the channel, then return to ASCIILOGRAPH and try again.";
  }

  return payload.message || fallback;
}
