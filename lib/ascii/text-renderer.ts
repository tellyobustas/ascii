import figlet from "figlet";
import bannerFont from "figlet/fonts/Banner";
import bigFont from "figlet/fonts/Big";
import blockFont from "figlet/fonts/Block";
import bubbleFont from "figlet/fonts/Bubble";
import digitalFont from "figlet/fonts/Digital";
import doomFont from "figlet/fonts/Doom";
import graffitiFont from "figlet/fonts/Graffiti";
import miniFont from "figlet/fonts/Mini";
import slantFont from "figlet/fonts/Slant";
import smallFont from "figlet/fonts/Small";
import standardFont from "figlet/fonts/Standard";
import {
  ASCII_FONTS,
  TEXT_CANVAS_PRESETS,
  type AsciiFontName,
  type TextCanvasPresetId,
} from "@/lib/ascii/text";
import {
  fitAsciiTextToCanvas,
  type FitAsciiTextResult,
} from "@/lib/canvas/fit";

export type RenderedAsciiText = {
  asciiText: string;
  fit: FitAsciiTextResult;
};

export const MAX_TEXT_LENGTH = 96;

const FIGLET_FONT_DATA: Record<AsciiFontName, string> = {
  Banner: bannerFont,
  Big: bigFont,
  Block: blockFont,
  Bubble: bubbleFont,
  Digital: digitalFont,
  Doom: doomFont,
  Graffiti: graffitiFont,
  Mini: miniFont,
  Slant: slantFont,
  Small: smallFont,
  Standard: standardFont,
};

let figletFontsRegistered = false;

export function registerFigletFonts() {
  if (figletFontsRegistered) return;

  for (const fontName of ASCII_FONTS) {
    figlet.parseFont(fontName, FIGLET_FONT_DATA[fontName], true);
  }

  figletFontsRegistered = true;
}

export function cleanText(value: unknown) {
  if (typeof value !== "string") return "Type Something";

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.slice(0, MAX_TEXT_LENGTH) || "Type Something";
}

export async function renderFigletText(
  text: string,
  font: AsciiFontName,
  preset: TextCanvasPresetId,
): Promise<RenderedAsciiText> {
  registerFigletFonts();

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
