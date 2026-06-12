import { NextResponse } from "next/server";
import {
  BRAILLE_DOT_MAP,
  IMAGE_ASCII_PRESETS,
  IMAGE_CHARACTER_SETS,
  IMAGE_LIMITS,
  IMAGE_RENDER_MODES,
} from "@/lib/ascii/image";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    brailleDotMap: BRAILLE_DOT_MAP,
    characterSets: IMAGE_CHARACTER_SETS,
    limits: IMAGE_LIMITS,
    modes: IMAGE_RENDER_MODES,
    presets: IMAGE_ASCII_PRESETS,
  });
}

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "Image rendering will be implemented in the IMAGE generator stage.",
    },
    { status: 501 },
  );
}
