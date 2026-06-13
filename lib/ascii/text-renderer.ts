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
const TELEGRAM_PRE_GUARD = "\u2060";

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
  if (typeof value !== "string") return "Send Nudes";

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.slice(0, MAX_TEXT_LENGTH) || "Send Nudes";
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

export async function renderTelegramInlineAsciiText(
  text: string,
  font: AsciiFontName,
) {
  registerFigletFonts();

  const widths = [42, 38, 34, 30];
  let bestAscii = "";

  for (const width of widths) {
    const asciiText = await figlet.text(text, {
      font,
      horizontalLayout: "default",
      verticalLayout: "default",
      whitespaceBreak: true,
      width,
    });
    const maxLineLength = Math.max(
      ...asciiText.split("\n").map((line) => line.length),
    );

    bestAscii = asciiText;

    if (maxLineLength <= 56 && asciiText.length <= 3900) {
      break;
    }
  }

  const fittedLines = bestAscii
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""));

  while (fittedLines.length > 0 && fittedLines[0].trim() === "") {
    fittedLines.shift();
  }

  while (
    fittedLines.length > 0 &&
    fittedLines[fittedLines.length - 1].trim() === ""
  ) {
    fittedLines.pop();
  }

  let normalized = fittedLines.join("\n");

  // Telegram trims leading whitespace at the beginning of preformatted inline
  // messages in some clients. A zero-width guard keeps the first row aligned.
  if (/^\s/.test(normalized)) {
    normalized = TELEGRAM_PRE_GUARD + normalized;
  }

  if (normalized.length <= 3900) {
    return normalized;
  }

  return normalized.slice(0, 3896) + "\n...";
}
