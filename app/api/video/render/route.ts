import { NextResponse } from "next/server";
import {
  VIDEO_ASCII_CONTAINER,
  VIDEO_ASCII_PRESETS,
  VIDEO_JOB_STAGES,
  VIDEO_RENDER_LIMITS,
  VIDEO_RENDER_MODES,
} from "@/lib/ascii/video";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    container: VIDEO_ASCII_CONTAINER,
    limits: VIDEO_RENDER_LIMITS,
    modes: VIDEO_RENDER_MODES,
    presets: VIDEO_ASCII_PRESETS,
    stages: VIDEO_JOB_STAGES,
  });
}

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "Video rendering will be implemented in the VIDEO generator stage.",
    },
    { status: 501 },
  );
}
