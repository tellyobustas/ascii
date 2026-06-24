import { NextResponse } from "next/server";
import { checkTelegramChannelSubscription } from "@/lib/telegram/subscription";
import { validateTelegramInitData } from "@/lib/telegram/validate-init-data";

export const runtime = "nodejs";

type TelegramValidateRequest = {
  initData?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TelegramValidateRequest;
    const token = process.env.BOT_TOKEN ?? "";
    const session = await validateTelegramInitData(
      body.initData ?? "",
      token,
    );
    const subscription = await checkTelegramChannelSubscription({
      botToken: token,
      userId: session.userId,
    });

    return NextResponse.json({
      ok: true,
      subscription,
      user: {
        id: session.userId,
        username: session.username,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 401 },
    );
  }
}
