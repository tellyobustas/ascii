export type TextRenderMode = "plain" | "png" | "telegram-post";

export const ASCII_FONTS = [
  "Standard",
  "Slant",
  "Big",
  "Small",
  "Graffiti",
  "Doom",
  "Block",
  "Bubble",
  "Digital",
  "Mini",
  "Banner",
] as const;

export type AsciiFontName = (typeof ASCII_FONTS)[number];

export const TEXT_CANVAS_PRESETS = {
  square: {
    label: "1:1 square",
    shortLabel: "1:1",
    width: 1080,
    height: 1080,
    figletWidth: 72,
  },
  portrait: {
    label: "4:5 post",
    shortLabel: "4:5",
    width: 1080,
    height: 1350,
    figletWidth: 66,
  },
  story: {
    label: "9:16 story",
    shortLabel: "9:16",
    width: 1080,
    height: 1920,
    figletWidth: 58,
  },
  telegramPost: {
    label: "Telegram post",
    shortLabel: "TG",
    width: 1200,
    height: 675,
    figletWidth: 82,
  },
} as const;

export type TextCanvasPresetId = keyof typeof TEXT_CANVAS_PRESETS;

export function isAsciiFontName(font: string): font is AsciiFontName {
  return (ASCII_FONTS as readonly string[]).includes(font);
}

export function isTextCanvasPresetId(
  preset: string,
): preset is TextCanvasPresetId {
  return Object.hasOwn(TEXT_CANVAS_PRESETS, preset);
}
