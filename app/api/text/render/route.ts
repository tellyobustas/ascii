import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "Text rendering will be implemented in the TEXT generator stage.",
    },
    { status: 501 },
  );
}
