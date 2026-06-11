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
