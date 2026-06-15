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
  "Mini",
  "Banner",
] as const;

export type AsciiFontName = (typeof ASCII_FONTS)[number];

export const ASCII_FONT_PROFILES: Record<
  AsciiFontName,
  {
    mood: string;
    sample: string;
    searchTags: readonly string[];
  }
> = {
  Standard: {
    mood: "clean terminal headline",
    sample: "ASCII",
    searchTags: ["default", "clean", "readable", "terminal"],
  },
  Slant: {
    mood: "italic hacker banner",
    sample: "/ASCII/",
    searchTags: ["italic", "dynamic", "classic", "patorjk"],
  },
  Big: {
    mood: "large block poster",
    sample: "A S C I I",
    searchTags: ["poster", "wide", "bold", "title"],
  },
  Small: {
    mood: "compact caption",
    sample: "ascii",
    searchTags: ["small", "compact", "caption", "telegram"],
  },
  Graffiti: {
    mood: "street terminal logo",
    sample: "ASCII!",
    searchTags: ["graffiti", "logo", "wild", "display"],
  },
  Doom: {
    mood: "heavy game title",
    sample: "DOOM",
    searchTags: ["heavy", "game", "dark", "title"],
  },
  Block: {
    mood: "solid square letters",
    sample: "BLOCK",
    searchTags: ["block", "square", "poster", "bold"],
  },
  Bubble: {
    mood: "rounded pop text",
    sample: "(ASCII)",
    searchTags: ["bubble", "round", "soft", "fun"],
  },
  Mini: {
    mood: "tiny utility text",
    sample: "mini",
    searchTags: ["mini", "tiny", "dense", "caption"],
  },
  Banner: {
    mood: "old-school terminal banner",
    sample: "BANNER",
    searchTags: ["banner", "classic", "wide", "oldschool"],
  },
};

export const TEXT_FONT_GROUPS = [
  {
    label: "poster",
    fonts: ["Big", "Block", "Banner", "Doom"],
  },
  {
    label: "terminal",
    fonts: ["Standard", "Slant", "Mini"],
  },
  {
    label: "expressive",
    fonts: ["Graffiti", "Bubble", "Small"],
  },
] as const satisfies ReadonlyArray<{
  fonts: readonly AsciiFontName[];
  label: string;
}>;

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

export type TextVideoColorId =
  | "green"
  | "white"
  | "amber"
  | "cyan"
  | "magenta";

export const TEXT_VIDEO_COLORS: Record<
  TextVideoColorId,
  {
    glow: string;
    hex: string;
    label: string;
  }
> = {
  green: {
    glow: "rgba(0, 255, 102, 0.62)",
    hex: "#00ff66",
    label: "green",
  },
  white: {
    glow: "rgba(242, 242, 242, 0.52)",
    hex: "#f2f2f2",
    label: "white",
  },
  amber: {
    glow: "rgba(255, 190, 64, 0.5)",
    hex: "#ffbe40",
    label: "amber",
  },
  cyan: {
    glow: "rgba(80, 255, 220, 0.52)",
    hex: "#50ffdc",
    label: "cyan",
  },
  magenta: {
    glow: "rgba(255, 80, 190, 0.45)",
    hex: "#ff50be",
    label: "magenta",
  },
};

export function isAsciiFontName(font: string): font is AsciiFontName {
  return (ASCII_FONTS as readonly string[]).includes(font);
}

export function isTextCanvasPresetId(
  preset: string,
): preset is TextCanvasPresetId {
  return Object.hasOwn(TEXT_CANVAS_PRESETS, preset);
}

export function isTextVideoColorId(color: string): color is TextVideoColorId {
  return Object.hasOwn(TEXT_VIDEO_COLORS, color);
}
