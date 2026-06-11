export type TelegramUserSession = {
  userId: number;
  username?: string;
};

export async function validateTelegramInitData(
  initData: string,
  botToken: string,
): Promise<TelegramUserSession> {
  void initData;
  void botToken;

  throw new Error("Telegram initData validation will be implemented in stage 2.");
}
