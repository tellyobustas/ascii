import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "Video rendering will be implemented in the VIDEO generator stage.",
    },
    { status: 501 },
  );
}
