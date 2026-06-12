import { NextResponse } from "next/server";
import { validateTelegramInitData } from "@/lib/telegram/validate-init-data";

export const runtime = "nodejs";

type TelegramValidateRequest = {
  initData?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TelegramValidateRequest;
    const session = await validateTelegramInitData(
      body.initData ?? "",
      process.env.BOT_TOKEN ?? "",
    );

    return NextResponse.json({
      ok: true,
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
