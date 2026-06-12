import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramUserSession = {
  userId: number;
  username?: string;
};

const MAX_INIT_DATA_AGE_SECONDS = 60 * 60 * 24;

export async function validateTelegramInitData(
  initData: string,
  botToken: string,
): Promise<TelegramUserSession> {
  if (!initData) {
    throw new Error("Telegram initData is missing. Open ASCII inside Telegram.");
  }

  if (!botToken) {
    throw new Error("BOT_TOKEN is not configured.");
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    throw new Error("Telegram initData hash is missing.");
  }

  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => key + "=" + value)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const calculatedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const hashBuffer = Buffer.from(hash, "hex");
  const calculatedHashBuffer = Buffer.from(calculatedHash, "hex");

  if (
    hashBuffer.length !== calculatedHashBuffer.length ||
    !timingSafeEqual(hashBuffer, calculatedHashBuffer)
  ) {
    throw new Error("Telegram initData validation failed.");
  }

  const authDate = Number(params.get("auth_date") ?? 0);

  if (
    !Number.isFinite(authDate) ||
    Date.now() / 1000 - authDate > MAX_INIT_DATA_AGE_SECONDS
  ) {
    throw new Error("Telegram initData expired. Reopen the Mini App.");
  }

  const userPayload = params.get("user");

  if (!userPayload) {
    throw new Error("Telegram user payload is missing.");
  }

  const user = JSON.parse(userPayload) as {
    id?: unknown;
    username?: unknown;
  };

  if (typeof user.id !== "number") {
    throw new Error("Telegram user id is invalid.");
  }

  return {
    userId: user.id,
    username: typeof user.username === "string" ? user.username : undefined,
  };
}
