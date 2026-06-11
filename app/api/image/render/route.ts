import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "Image rendering will be implemented in the IMAGE generator stage.",
    },
    { status: 501 },
  );
}
