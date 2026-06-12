"use client";

export type TelegramSendErrorCode =
  | "BOT_CHAT_NOT_STARTED"
  | "TELEGRAM_SEND_FAILED";

export type TelegramSendResponse =
  | {
      ok: true;
      message: string;
    }
  | {
      code?: TelegramSendErrorCode;
      message: string;
      ok: false;
      startUrl?: string;
    };

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

  return payload.message || fallback;
}
