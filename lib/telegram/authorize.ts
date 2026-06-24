import { requireTelegramChannelSubscription } from "@/lib/telegram/subscription";
import {
  validateTelegramInitData,
  type TelegramUserSession,
} from "@/lib/telegram/validate-init-data";

export async function authorizeTelegramRequest(
  initData: string,
  botToken = process.env.BOT_TOKEN ?? "",
): Promise<TelegramUserSession> {
  const session = await validateTelegramInitData(initData, botToken);

  await requireTelegramChannelSubscription({
    botToken,
    userId: session.userId,
  });

  return session;
}
