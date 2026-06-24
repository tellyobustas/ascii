export type SubscriptionCheckResult =
  | {
      channelTitle: string;
      channelUrl: string;
      ok: false;
      required: true;
    }
  | {
      channelTitle: string;
      channelUrl: string;
      ok: true;
      required: boolean;
    };

type TelegramChatMemberResponse = {
  description?: string;
  ok: boolean;
  result?: {
    is_member?: boolean;
    status?: string;
  };
};

export class TelegramSubscriptionRequiredError extends Error {
  channelTitle: string;
  channelUrl: string;

  constructor(channelTitle: string, channelUrl: string) {
    super(`Subscribe to ${channelTitle} to unlock ASCIILOGRAPH.`);
    this.name = "TelegramSubscriptionRequiredError";
    this.channelTitle = channelTitle;
    this.channelUrl = channelUrl;
  }
}

export function getRequiredChannelConfig(
  env: Record<string, string | undefined> = process.env,
) {
  const chatId =
    env.REQUIRED_CHANNEL_ID?.trim() || env.REQUIRED_CHANNEL_USERNAME?.trim();

  if (!chatId) {
    return null;
  }

  const username = chatId.startsWith("@") ? chatId.slice(1) : "";
  const channelUrl =
    env.REQUIRED_CHANNEL_URL?.trim() ||
    (username ? `https://t.me/${username}` : "");
  const channelTitle =
    env.REQUIRED_CHANNEL_TITLE?.trim() ||
    (username ? `@${username}` : "the required channel");

  return {
    channelTitle,
    channelUrl,
    chatId,
  };
}

export async function checkTelegramChannelSubscription({
  botToken,
  userId,
}: {
  botToken: string;
  userId: number;
}): Promise<SubscriptionCheckResult> {
  const channel = getRequiredChannelConfig();

  if (!channel) {
    return {
      channelTitle: "",
      channelUrl: "",
      ok: true,
      required: false,
    };
  }

  if (!botToken) {
    throw new Error("BOT_TOKEN is not configured.");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(
      channel.chatId,
    )}&user_id=${userId}`,
  );
  const payload = (await response.json()) as TelegramChatMemberResponse;
  const status = payload.result?.status;
  const isSubscribed =
    payload.ok &&
    (status === "creator" ||
      status === "administrator" ||
      status === "member" ||
      (status === "restricted" && payload.result?.is_member === true));

  return {
    channelTitle: channel.channelTitle,
    channelUrl: channel.channelUrl,
    ok: isSubscribed,
    required: true,
  };
}

export async function requireTelegramChannelSubscription({
  botToken,
  userId,
}: {
  botToken: string;
  userId: number;
}) {
  const subscription = await checkTelegramChannelSubscription({
    botToken,
    userId,
  });

  if (!subscription.ok && subscription.required) {
    throw new TelegramSubscriptionRequiredError(
      subscription.channelTitle,
      subscription.channelUrl,
    );
  }

  return subscription;
}
