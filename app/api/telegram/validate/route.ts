import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "Telegram initData validation will be implemented in stage 2.",
    },
    { status: 501 },
  );
}
