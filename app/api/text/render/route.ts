import { NextResponse } from "next/server";
import {
  ASCII_FONT_PROFILES,
  ASCII_FONTS,
  TEXT_CANVAS_PRESETS,
  TEXT_FONT_GROUPS,
  isAsciiFontName,
  isTextCanvasPresetId,
  type AsciiFontName,
  type TextCanvasPresetId,
} from "@/lib/ascii/text";
import {
  cleanText,
  renderFigletText,
} from "@/lib/ascii/text-renderer";

export const runtime = "nodejs";

type TextRenderRequest = {
  canvasPreset?: string;
  font?: string;
  text?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TextRenderRequest;
    const text = cleanText(body.text);
    const requestedFont = typeof body.font === "string" ? body.font : "";
    const requestedCanvasPreset =
      typeof body.canvasPreset === "string" ? body.canvasPreset : "";
    const font: AsciiFontName = isAsciiFontName(requestedFont)
      ? requestedFont
      : "Graffiti";
    const canvasPreset: TextCanvasPresetId = isTextCanvasPresetId(
      requestedCanvasPreset,
    )
      ? requestedCanvasPreset
      : "telegramPost";
    const canvas = TEXT_CANVAS_PRESETS[canvasPreset];
    const rendered = await renderFigletText(text, font, canvasPreset);

    return NextResponse.json({
      ok: true,
      asciiText: rendered.asciiText,
      canvas,
      canvasPreset,
      fit: rendered.fit,
      font,
      fontGroups: TEXT_FONT_GROUPS,
      fontProfile: ASCII_FONT_PROFILES[font],
      fonts: ASCII_FONTS,
      text,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 400 },
    );
  }
}
