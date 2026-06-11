import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "Telegram result sending will be implemented in a later stage.",
    },
    { status: 501 },
  );
}
