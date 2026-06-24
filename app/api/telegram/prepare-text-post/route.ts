import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { InlineQueryResultArticle } from "grammy/types";
import { isAsciiFontName, type AsciiFontName } from "@/lib/ascii/text";
import {
  cleanText,
  renderTelegramInlineAsciiText,
} from "@/lib/ascii/text-renderer";
import {
  requireTelegramChannelSubscription,
  TelegramSubscriptionRequiredError,
} from "@/lib/telegram/subscription";
import { validateTelegramInitData } from "@/lib/telegram/validate-init-data";

export const runtime = "nodejs";

type PrepareTextPostRequest = {
  font?: string;
  initData?: string;
  text?: string;
};

async function callTelegramJson<T>(
  method: string,
  token: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );
  const payload = (await response.json()) as {
    description?: string;
    ok: boolean;
    result?: T;
  };

  if (!response.ok || !payload.ok || !payload.result) {
    throw new Error(payload.description ?? `Telegram ${method} failed.`);
  }

  return payload.result;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PrepareTextPostRequest;
    const token = process.env.BOT_TOKEN ?? "";

    if (!token) {
      throw new Error("BOT_TOKEN is not configured.");
    }

    const session = await validateTelegramInitData(body.initData ?? "", token);
    await requireTelegramChannelSubscription({
      botToken: token,
      userId: session.userId,
    });
    const font: AsciiFontName = isAsciiFontName(String(body.font ?? ""))
      ? (body.font as AsciiFontName)
      : "Graffiti";
    const text = cleanText(body.text);
    const asciiText = await renderTelegramInlineAsciiText(text, font);
    const resultId = createHash("sha256")
      .update(`${session.userId}:${font}:${text}`)
      .digest("hex")
      .slice(0, 32);
    const result: InlineQueryResultArticle = {
      description: `${font} / fixed-width Telegram post`,
      id: resultId,
      input_message_content: {
        entities: [
          {
            length: asciiText.length,
            offset: 0,
            type: "pre",
          },
        ],
        message_text: asciiText,
      },
      title: `Publish "${text.slice(0, 36)}"`,
      type: "article",
    };
    const prepared = await callTelegramJson<{
      expiration_date: number;
      id: string;
    }>("savePreparedInlineMessage", token, {
      allow_bot_chats: false,
      allow_channel_chats: true,
      allow_group_chats: true,
      allow_user_chats: true,
      result,
      user_id: session.userId,
    });

    return NextResponse.json({
      expiresAt: prepared.expiration_date,
      id: prepared.id,
      ok: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        channelUrl:
          error instanceof TelegramSubscriptionRequiredError
            ? error.channelUrl
            : undefined,
        code:
          error instanceof TelegramSubscriptionRequiredError
            ? "SUBSCRIPTION_REQUIRED"
            : undefined,
        ok: false,
        message,
      },
      { status: 400 },
    );
  }
}
