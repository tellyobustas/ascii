import figlet from "figlet";
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
  fitAsciiTextToCanvas,
  type FitAsciiTextResult,
} from "@/lib/canvas/fit";

export const runtime = "nodejs";

type TextRenderRequest = {
  canvasPreset?: string;
  font?: string;
  text?: string;
};

const MAX_TEXT_LENGTH = 96;

function cleanText(value: unknown) {
  if (typeof value !== "string") return "Type Something";

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.slice(0, MAX_TEXT_LENGTH) || "Type Something";
}

async function renderFigletText(
  text: string,
  font: AsciiFontName,
  preset: TextCanvasPresetId,
) {
  const canvas = TEXT_CANVAS_PRESETS[preset];
  const widths = [
    canvas.figletWidth,
    Math.max(36, Math.floor(canvas.figletWidth * 0.82)),
    Math.max(32, Math.floor(canvas.figletWidth * 0.68)),
  ];

  let bestAscii = "";
  let bestFit: FitAsciiTextResult | null = null;

  for (const width of widths) {
    const asciiText = await figlet.text(text, {
      font,
      horizontalLayout: "default",
      verticalLayout: "default",
      whitespaceBreak: true,
      width,
    });
    const fit = fitAsciiTextToCanvas(
      asciiText,
      canvas.width,
      canvas.height,
      {
        align: "center",
        charAspectRatio: 0.58,
        lineHeightRatio: 1.08,
        maxFontSize: preset === "telegramPost" ? 48 : 58,
        minFontSize: 10,
        padding: preset === "story" ? 92 : 76,
        verticalAlign: "middle",
      },
    );

    if (!bestFit || fit.fontSize > bestFit.fontSize) {
      bestAscii = asciiText;
      bestFit = fit;
    }
  }

  if (!bestFit) {
    throw new Error("Could not fit ASCII text to canvas.");
  }

  return {
    asciiText: bestAscii,
    fit: bestFit,
  };
}

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
