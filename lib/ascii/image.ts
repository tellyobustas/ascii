export const IMAGE_RENDER_MODES = [
  "ascii-png",
  "1-bit-bitmap",
  "bayer-dither",
  "floyd-steinberg-dither",
  "blocks-braille",
  "matrix-green",
  "white-terminal",
] as const;

export type ImageRenderMode = (typeof IMAGE_RENDER_MODES)[number];

export const IMAGE_LIMITS = {
  maxFileBytes: 12 * 1024 * 1024,
  maxInputWidth: 8192,
  maxInputHeight: 8192,
  defaultAsciiWidth: 120,
  maxAsciiWidth: 500,
  defaultPixelSize: 8,
} as const;

export const BRAILLE_UNICODE_OFFSET = 0x2800;

export const BRAILLE_DOT_MAP = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
] as const;

export const IMAGE_CHARACTER_SETS = {
  standard: {
    label: "Standard ASCII",
    chars: " .:-=+*#%@",
  },
  fine: {
    label: "Fine detail",
    chars: " `^\",:;Il!i~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  },
  terminal: {
    label: "Terminal",
    chars: " .,:;ox%#@",
  },
  blocks: {
    label: "Blocks",
    chars: " ░▒▓█",
  },
  shadedBlocks: {
    label: "Soft shades",
    chars: " .░▒▓█",
  },
  binary: {
    label: "Binary",
    chars: " 01",
  },
} as const;

export type ImageCharacterSetId = keyof typeof IMAGE_CHARACTER_SETS;

export const IMAGE_ASCII_PRESETS = {
  brailleColor: {
    label: "Braille color",
    shortLabel: "BRAILLE",
    mode: "blocks-braille",
    characterSet: "fine",
    outputWidth: 120,
    threshold: 50,
    density: 0.92,
    contrast: 1.12,
    brightness: 1,
    sharpen: 1.08,
    colorBoost: 1.2,
    litPixelColorSampling: true,
    transparentBackground: false,
    notes: [
      "2x4 Unicode braille cells",
      "samples color only from lit pixels",
      "best for detailed Telegram PNGs",
    ],
  },
  brailleMono: {
    label: "Braille mono",
    shortLabel: "MONO",
    mode: "blocks-braille",
    characterSet: "fine",
    outputWidth: 132,
    threshold: 64,
    density: 0.84,
    contrast: 1.18,
    brightness: 1,
    sharpen: 1.12,
    colorBoost: 1,
    litPixelColorSampling: false,
    transparentBackground: false,
    notes: [
      "clean single-color braille",
      "higher threshold for crisp edges",
      "good for logos and silhouettes",
    ],
  },
  matrixAscii: {
    label: "Matrix ASCII",
    shortLabel: "MATRIX",
    mode: "matrix-green",
    characterSet: "terminal",
    outputWidth: 96,
    threshold: 42,
    density: 1.05,
    contrast: 1.24,
    brightness: 0.96,
    sharpen: 1,
    colorBoost: 1,
    litPixelColorSampling: false,
    transparentBackground: false,
    notes: [
      "classic green terminal glyphs",
      "uses a compact readable charset",
      "intended for fast live preview",
    ],
  },
  bayerDither: {
    label: "Bayer dither",
    shortLabel: "BAYER",
    mode: "bayer-dither",
    characterSet: "shadedBlocks",
    outputWidth: 144,
    threshold: 128,
    density: 1,
    contrast: 1.1,
    brightness: 1,
    sharpen: 1,
    colorBoost: 1,
    litPixelColorSampling: false,
    transparentBackground: false,
    notes: [
      "stable ordered dither",
      "less shimmer for video frames",
      "great for pixel-art surfaces",
    ],
  },
  floydSteinberg: {
    label: "Floyd-Steinberg",
    shortLabel: "FLOYD",
    mode: "floyd-steinberg-dither",
    characterSet: "standard",
    outputWidth: 132,
    threshold: 128,
    density: 1,
    contrast: 1.08,
    brightness: 1,
    sharpen: 1,
    colorBoost: 1,
    litPixelColorSampling: false,
    transparentBackground: false,
    notes: [
      "organic error diffusion",
      "better gradients on photos",
      "heavier than Bayer for video",
    ],
  },
  blocks: {
    label: "Block elements",
    shortLabel: "BLOCKS",
    mode: "1-bit-bitmap",
    characterSet: "blocks",
    outputWidth: 160,
    threshold: 118,
    density: 1.12,
    contrast: 1.2,
    brightness: 1,
    sharpen: 1.05,
    colorBoost: 1,
    litPixelColorSampling: false,
    transparentBackground: false,
    notes: [
      "bold poster-like bitmap",
      "high readability at small sizes",
      "safe choice for Telegram previews",
    ],
  },
} as const satisfies Record<
  string,
  {
    brightness: number;
    characterSet: ImageCharacterSetId;
    colorBoost: number;
    contrast: number;
    density: number;
    label: string;
    litPixelColorSampling: boolean;
    mode: ImageRenderMode;
    notes: readonly string[];
    outputWidth: number;
    sharpen: number;
    shortLabel: string;
    threshold: number;
    transparentBackground: boolean;
  }
>;

export type ImageAsciiPresetId = keyof typeof IMAGE_ASCII_PRESETS;

export function isImageAsciiPresetId(
  preset: string,
): preset is ImageAsciiPresetId {
  return Object.hasOwn(IMAGE_ASCII_PRESETS, preset);
}

export function brailleBitsToChar(bits: number) {
  return String.fromCharCode(BRAILLE_UNICODE_OFFSET + (bits & 0xff));
}

export function mapLumaToCharacter(
  luma: number,
  chars: string,
  invert = false,
) {
  const clampedLuma = Math.max(0, Math.min(255, luma));
  const normalized = invert ? 1 - clampedLuma / 255 : clampedLuma / 255;
  const index = Math.round(normalized * (chars.length - 1));

  return chars[Math.max(0, Math.min(chars.length - 1, index))] ?? " ";
}

export function calculateBrailleRasterSize(
  characterWidth: number,
  sourceAspectRatio: number,
) {
  const width = Math.max(
    10,
    Math.min(IMAGE_LIMITS.maxAsciiWidth, Math.round(characterWidth)),
  );
  const characterHeight = Math.max(1, Math.round(width * sourceAspectRatio * 0.5));

  return {
    characterHeight,
    characterWidth: width,
    pixelHeight: characterHeight * 4,
    pixelWidth: width * 2,
  };
}
