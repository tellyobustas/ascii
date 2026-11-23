import sharp from "sharp";
import { renderVectorText } from "@/lib/ascii/vector-font";
import {
  BRAILLE_DOT_MAP,
  BRAILLE_UNICODE_OFFSET,
  ASCII_RENDER_CELL_ASPECT_RATIO,
  IMAGE_ASCII_PRESETS,
  IMAGE_CHARACTER_SETS,
  IMAGE_LIMITS,
  brailleBitsToChar,
  calculateBrailleRasterSize,
  isImageAsciiPresetId,
  mapLumaToCharacter,
  type ImageAsciiPresetId,
} from "@/lib/ascii/image";

export type Rgb = {
  b: number;
  g: number;
  r: number;
};

export type RenderImageAsciiOptions = {
  invert?: boolean;
  presetId?: string;
  width?: number;
};

export type RenderedAsciiImage = {
  asciiText: string;
  height: number;
  mimeType: "image/png";
  png: Buffer;
  presetId: ImageAsciiPresetId;
  width: number;
};

export type PreparedAsciiImageFrame = {
  asciiText: string;
  canvasColumns: number;
  canvasRows: number;
  colors?: Array<Array<Rgb | undefined>>;
  lines: string[];
  presetId: ImageAsciiPresetId;
};

export type RenderedAsciiImageSvg = {
  height: number;
  svg: string;
  width: number;
};

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function adjustLuma(luma: number, options: { brightness: number; contrast: number }) {
  const contrasted = (luma - 128) * options.contrast + 128;
  const brightened = contrasted + (options.brightness - 1) * 80;

  return clampByte(brightened);
}

function colorToCss(color?: Rgb) {
  if (!color) return "#00ff66";

  return `rgb(${color.r},${color.g},${color.b})`;
}

export type RenderTheme = {
  backgroundColor: string;
  borderColor: string;
  cornerAccentColor: string;
  foreground: string;
  glowColor: string;
  glowStdDev: number;
  highlightColor?: string;
  isDuotone?: boolean;
  osdStyle?: "camcorder" | "cyber" | "minimal" | "none";
  scanlinesOpacity: number;
  scanlinesPeriod: number;
  secondaryColor?: string;
  vignette: boolean;
};

export const THEMES: Record<string, RenderTheme> = {
  "matrix-green": {
    backgroundColor: "#020704",
    borderColor: "rgba(0, 255, 102, 0.35)",
    cornerAccentColor: "#00ff66",
    foreground: "#00ff66",
    glowColor: "#00ff66",
    glowStdDev: 1.2,
    scanlinesOpacity: 0.45,
    scanlinesPeriod: 5,
    vignette: true,
  },
  "white-terminal": {
    backgroundColor: "#070809",
    borderColor: "rgba(240, 240, 240, 0.3)",
    cornerAccentColor: "#f2f2f2",
    foreground: "#f2f2f2",
    glowColor: "#ffffff",
    glowStdDev: 1.0,
    scanlinesOpacity: 0.35,
    scanlinesPeriod: 6,
    vignette: false,
  },
  "cyber-y2k": {
    backgroundColor: "#0a0316",
    borderColor: "rgba(0, 240, 255, 0.55)",
    cornerAccentColor: "#ff007f",
    foreground: "#00f0ff",
    glowColor: "#00f0ff",
    glowStdDev: 1.6,
    highlightColor: "#ccff00",
    isDuotone: true,
    osdStyle: "camcorder",
    scanlinesOpacity: 0.55,
    scanlinesPeriod: 4,
    secondaryColor: "#ff007f",
    vignette: true,
  },
  "liquid-chrome": {
    backgroundColor: "#090d14",
    borderColor: "rgba(168, 192, 222, 0.45)",
    cornerAccentColor: "#dbe7f5",
    foreground: "#e2ecf7",
    glowColor: "#8faec9",
    glowStdDev: 1.3,
    highlightColor: "#ffffff",
    isDuotone: true,
    osdStyle: "cyber",
    scanlinesOpacity: 0.4,
    scanlinesPeriod: 5,
    secondaryColor: "#708da8",
    vignette: true,
  },
  "amber-crt": {
    backgroundColor: "#0e0600",
    borderColor: "rgba(255, 150, 0, 0.45)",
    cornerAccentColor: "#ffaa00",
    foreground: "#ffb000",
    glowColor: "#ff8c00",
    glowStdDev: 1.5,
    highlightColor: "#fff0b3",
    scanlinesOpacity: 0.5,
    scanlinesPeriod: 4,
    secondaryColor: "#b36200",
    vignette: true,
  },
};

export function resolveTheme(
  preset: (typeof IMAGE_ASCII_PRESETS)[ImageAsciiPresetId],
): RenderTheme {
  const modeKey = String(preset.mode);
  if (modeKey in THEMES) {
    return THEMES[modeKey];
  }
  if (modeKey === "white-terminal") {
    return THEMES["white-terminal"];
  }
  return THEMES["matrix-green"];
}

function getDuotoneCharColor(character: string, theme: RenderTheme): string {
  if ("@#%$█▓WMB8&".includes(character)) {
    return theme.highlightColor || theme.foreground;
  }
  if ("*+=oxO01▒/\\|!<>?[]{}".includes(character)) {
    return theme.foreground;
  }
  return theme.secondaryColor || theme.foreground;
}

function renderOsdHud(options: {
  height: number;
  osdStyle?: "camcorder" | "cyber" | "minimal" | "none";
  padding: number;
  preset: (typeof IMAGE_ASCII_PRESETS)[ImageAsciiPresetId];
  theme: RenderTheme;
  width: number;
}) {
  if (!options.osdStyle || options.osdStyle === "none") return "";

  const { width, height, padding, theme } = options;
  const fg = theme.cornerAccentColor || theme.foreground;
  const sub = "rgba(255,255,255,0.6)";
  const parts: string[] = [];

  const bracketSize = Math.max(12, Math.min(24, Math.round(width * 0.03)));
  const strokeW = 1.5;
  const inset = Math.max(6, Math.round(padding * 0.35));

  // Corner brackets [ + ]
  parts.push(
    `<path d="M ${svgNumber(inset + bracketSize)} ${svgNumber(inset)} L ${svgNumber(inset)} ${svgNumber(inset)} L ${svgNumber(inset)} ${svgNumber(inset + bracketSize)}" fill="none" stroke="${fg}" stroke-width="${strokeW}"/>`,
  );
  parts.push(
    `<path d="M ${svgNumber(width - inset - bracketSize)} ${svgNumber(inset)} L ${svgNumber(width - inset)} ${svgNumber(inset)} L ${svgNumber(width - inset)} ${svgNumber(inset + bracketSize)}" fill="none" stroke="${fg}" stroke-width="${strokeW}"/>`,
  );
  parts.push(
    `<path d="M ${svgNumber(inset)} ${svgNumber(height - inset - bracketSize)} L ${svgNumber(inset)} ${svgNumber(height - inset)} L ${svgNumber(inset + bracketSize)} ${svgNumber(height - inset)}" fill="none" stroke="${fg}" stroke-width="${strokeW}"/>`,
  );
  parts.push(
    `<path d="M ${svgNumber(width - inset)} ${svgNumber(height - inset - bracketSize)} L ${svgNumber(width - inset)} ${svgNumber(height - inset)} L ${svgNumber(width - inset - bracketSize)} ${svgNumber(height - inset)}" fill="none" stroke="${fg}" stroke-width="${strokeW}"/>`,
  );

  if (options.osdStyle === "camcorder") {
    const fontSize = Math.max(9, Math.min(13, Math.round(width * 0.016)));
    const charW = fontSize * 0.62;
    parts.push(
      `<circle cx="${svgNumber(inset + bracketSize + 14)}" cy="${svgNumber(inset + fontSize * 0.6)}" r="3.5" fill="#ff0055"/>`,
    );
    parts.push(
      renderVectorText({
        charHeight: fontSize,
        charWidth: charW,
        color: "#ff0055",
        text: "REC",
        x: inset + bracketSize + 22,
        y: inset + 1,
      }),
    );
    parts.push(
      renderVectorText({
        charHeight: fontSize * 0.88,
        charWidth: charW * 0.88,
        color: sub,
        text: "SP 0:00:04",
        x: inset + bracketSize + 58,
        y: inset + 2,
      }),
    );
    const battX = width - inset - bracketSize - 22;
    const battY = inset + fontSize * 0.15;
    const battW = 16;
    const battH = 8;
    parts.push(
      renderVectorText({
        align: "right",
        charHeight: fontSize * 0.88,
        charWidth: charW * 0.88,
        color: fg,
        text: "STEREO 48KHZ",
        x: battX - 6,
        y: inset + 2,
      }),
      `<rect x="${svgNumber(battX)}" y="${svgNumber(battY)}" width="${svgNumber(battW)}" height="${svgNumber(battH)}" rx="1.5" fill="none" stroke="${fg}" stroke-width="1.2"/>`,
      `<rect x="${svgNumber(battX + battW)}" y="${svgNumber(battY + battH * 0.25)}" width="1.5" height="${svgNumber(battH * 0.5)}" rx="0.5" fill="${fg}"/>`,
      `<rect x="${svgNumber(battX + 2.2)}" y="${svgNumber(battY + 1.8)}" width="3" height="${svgNumber(battH - 3.6)}" fill="${fg}"/>`,
      `<rect x="${svgNumber(battX + 6.8)}" y="${svgNumber(battY + 1.8)}" width="3" height="${svgNumber(battH - 3.6)}" fill="${fg}"/>`,
      `<rect x="${svgNumber(battX + 11.4)}" y="${svgNumber(battY + 1.8)}" width="3" height="${svgNumber(battH - 3.6)}" fill="${fg}" opacity="0.25"/>`,
    );
    parts.push(
      renderVectorText({
        charHeight: fontSize * 0.88,
        charWidth: charW * 0.88,
        color: fg,
        text: "OCT.24.2001 02:47:19",
        x: inset + 10,
        y: height - inset - fontSize - 2,
      }),
    );
    parts.push(
      renderVectorText({
        align: "right",
        charHeight: fontSize * 0.88,
        charWidth: charW * 0.88,
        color: sub,
        text: "ASCIILOGRAPH Y2K",
        x: width - inset - 10,
        y: height - inset - fontSize - 2,
      }),
    );
  } else if (options.osdStyle === "cyber") {
    const fontSize = Math.max(9, Math.min(13, Math.round(width * 0.016)));
    const charW = fontSize * 0.62;
    parts.push(
      renderVectorText({
        charHeight: fontSize,
        charWidth: charW,
        color: fg,
        text: "SYS_SIG: ONLINE [100%]",
        x: inset + bracketSize + 8,
        y: inset + 1,
      }),
    );
    parts.push(
      renderVectorText({
        align: "right",
        charHeight: fontSize,
        charWidth: charW,
        color: sub,
        text: "CH-02 // DITHER",
        x: width - inset - bracketSize - 8,
        y: inset + 1,
      }),
    );
    parts.push(
      renderVectorText({
        charHeight: fontSize * 0.88,
        charWidth: charW * 0.88,
        color: sub,
        text: "RAW BITSTREAM // 2000S",
        x: inset + 10,
        y: height - inset - fontSize - 2,
      }),
    );
    parts.push(
      renderVectorText({
        align: "right",
        charHeight: fontSize * 0.88,
        charWidth: charW * 0.88,
        color: fg,
        text: "ASCIILOGRAPH",
        x: width - inset - 10,
        y: height - inset - fontSize - 2,
      }),
    );
  }

  return `<g class="osd-overlay">${parts.join("\n    ")}</g>`;
}

function boostColor(color: Rgb, boost: number): Rgb {
  if (boost === 1) return color;

  return {
    b: clampByte(color.b * boost),
    g: clampByte(color.g * boost),
    r: clampByte(color.r * boost),
  };
}

function sampleRgb(raw: Buffer, index: number): Rgb {
  const offset = index * 3;

  return {
    r: raw[offset] ?? 0,
    g: raw[offset + 1] ?? 0,
    b: raw[offset + 2] ?? 0,
  };
}

function svgNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "0";
}

function effectiveThreshold(
  preset: (typeof IMAGE_ASCII_PRESETS)[ImageAsciiPresetId],
) {
  return clampByte(preset.threshold + (1 - preset.density) * 72);
}

const PIXEL_GLYPHS: Record<string, readonly string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "11100"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10011", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  "$": ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "%": ["11001", "11010", "00100", "01000", "10010", "00110", "10011"],
  "@": ["01110", "10001", "10111", "10101", "10111", "10000", "01110"],
};

function renderPixelGlyph(
  pattern: readonly string[],
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const columns = pattern[0]?.length ?? 5;
  const rows = pattern.length;
  const gap = Math.max(0.35, Math.min(width, height) * 0.04);
  const pixelWidth = Math.max(0.4, (width - gap * (columns + 1)) / columns);
  const pixelHeight = Math.max(0.4, (height - gap * (rows + 1)) / rows);
  const radius = Math.min(pixelWidth, pixelHeight) * 0.18;
  const parts: string[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (pattern[row][column] !== "1") continue;

      parts.push(
        `<rect x="${svgNumber(x + gap + column * (pixelWidth + gap))}" y="${svgNumber(
          y + gap + row * (pixelHeight + gap),
        )}" width="${svgNumber(pixelWidth)}" height="${svgNumber(
          pixelHeight,
        )}" rx="${svgNumber(radius)}"/>`,
      );
    }
  }

  return parts.join("");
}

function renderBlockGlyph(character: string, x: number, y: number, size: number) {
  const opacityByChar: Record<string, number> = {
    "░": 0.24,
    "▒": 0.48,
    "▓": 0.74,
    "█": 1,
  };
  const opacity = opacityByChar[character];

  if (!opacity) return "";

  return `<rect x="${svgNumber(x + size * 0.08)}" y="${svgNumber(
    y + size * 0.08,
  )}" width="${svgNumber(size * 0.84)}" height="${svgNumber(
    size * 0.84,
  )}" opacity="${svgNumber(opacity)}"/>`;
}

function renderVectorGlyphContent(
  character: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const blockGlyph = renderBlockGlyph(character, x, y, Math.min(width, height));
  if (blockGlyph) return blockGlyph;

  const left = x + width * 0.16;
  const right = x + width * 0.84;
  const top = y + height * 0.16;
  const midX = x + width * 0.5;
  const midY = y + height * 0.52;
  const bottom = y + height * 0.86;
  const strokeWidth = Math.max(0.9, Math.min(width, height) * 0.11);
  const path = (data: string) =>
    `<path d="${data}" stroke-width="${svgNumber(strokeWidth)}"/>`;
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    path(
      `M ${svgNumber(x1)} ${svgNumber(y1)} L ${svgNumber(x2)} ${svgNumber(y2)}`,
    );
  const circle = (cx: number, cy: number, radius = strokeWidth * 0.66) =>
    `<circle cx="${svgNumber(cx)}" cy="${svgNumber(cy)}" r="${svgNumber(
      radius,
    )}"/>`;

  switch (character) {
    case " ":
      return "";
    case ".":
      return circle(midX, bottom);
    case ",":
      return circle(midX, bottom - strokeWidth) + line(midX, bottom, left, y + height);
    case ":":
      return circle(midX, y + height * 0.34) + circle(midX, y + height * 0.7);
    case ";":
      return (
        circle(midX, y + height * 0.34) +
        circle(midX, y + height * 0.68) +
        line(midX, y + height * 0.75, left, y + height * 0.96)
      );
    case "-":
    case "_":
      return line(left, character === "-" ? midY : bottom, right, character === "-" ? midY : bottom);
    case "=":
      return (
        line(left, y + height * 0.42, right, y + height * 0.42) +
        line(left, y + height * 0.66, right, y + height * 0.66)
      );
    case "|":
    case "I":
    case "l":
      return line(midX, top, midX, bottom);
    case "/":
      return line(left, bottom, right, top);
    case "\\":
      return line(left, top, right, bottom);
    case "<":
      return line(right, top, left, midY) + line(left, midY, right, bottom);
    case ">":
      return line(left, top, right, midY) + line(right, midY, left, bottom);
    case "+":
      return line(left, midY, right, midY) + line(midX, top, midX, bottom);
    case "*":
      return (
        line(left, midY, right, midY) +
        line(midX, top, midX, bottom) +
        line(left, top, right, bottom) +
        line(left, bottom, right, top)
      );
    case "o":
    case "O":
      return `<ellipse cx="${svgNumber(midX)}" cy="${svgNumber(
        midY,
      )}" rx="${svgNumber(width * 0.32)}" ry="${svgNumber(
        height * 0.34,
      )}" stroke-width="${svgNumber(strokeWidth)}" fill="none"/>`;
    case "x":
    case "X":
      return line(left, top, right, bottom) + line(right, top, left, bottom);
    case "!":
      return line(midX, top, midX, y + height * 0.66) + circle(midX, bottom);
    case "~":
      return (
        line(left, midY, left + width * 0.25, top + height * 0.1) +
        line(left + width * 0.25, top + height * 0.1, midX, midY) +
        line(midX, midY, right - width * 0.25, bottom - height * 0.1) +
        line(right - width * 0.25, bottom - height * 0.1, right, midY)
      );
    case "^":
      return line(left, midY, midX, top) + line(midX, top, right, midY);
    case "[":
      return (
        line(right, top, left, top) +
        line(left, top, left, bottom) +
        line(left, bottom, right, bottom)
      );
    case "]":
      return (
        line(left, top, right, top) +
        line(right, top, right, bottom) +
        line(right, bottom, left, bottom)
      );
    case "(":
      return line(right, top, left, midY) + line(left, midY, right, bottom);
    case ")":
      return line(left, top, right, midY) + line(right, midY, left, bottom);
    case "'":
    case "`":
      return line(midX, top, left + width * 0.2, top + height * 0.28);
    case '"':
      return (
        line(left + width * 0.2, top, left + width * 0.1, top + height * 0.28) +
        line(right - width * 0.1, top, right - width * 0.2, top + height * 0.28)
      );
    case "?":
      return (
        line(left, top + height * 0.1, midX, top) +
        line(midX, top, right, top + height * 0.1) +
        line(right, top + height * 0.1, midX, midY) +
        line(midX, midY, midX, y + height * 0.66) +
        circle(midX, bottom)
      );
    default: {
      const pattern = PIXEL_GLYPHS[character.toUpperCase()];
      if (pattern) {
        return renderPixelGlyph(
          pattern,
          x + width * 0.08,
          y + height * 0.05,
          width * 0.84,
          height * 0.9,
        );
      }

      return line(left, top, right, bottom) + line(right, top, left, bottom);
    }
  }
}

function renderVectorGlyph(
  character: string,
  x: number,
  y: number,
  width: number,
  height: number,
  color?: string,
) {
  const content = renderVectorGlyphContent(character, x, y, width, height);
  if (!content) return "";
  if (!color) return content;
  return `<g fill="${color}" stroke="${color}">${content}</g>`;
}

async function readResizedPixels(
  input: Buffer,
  width: number,
  height: number,
) {
  const base = sharp(input, {
    limitInputPixels: IMAGE_LIMITS.maxInputWidth * IMAGE_LIMITS.maxInputHeight,
  })
    .rotate()
    .resize(width, height, {
      fit: "fill",
      kernel: "lanczos3",
    });
  const grayscale = await base
    .clone()
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgb = await base
    .clone()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    grayscale: grayscale.data,
    height: grayscale.info.height,
    rgb: rgb.data,
    width: grayscale.info.width,
  };
}

async function getImageAspectRatio(input: Buffer) {
  const metadata = await sharp(input, {
    limitInputPixels: IMAGE_LIMITS.maxInputWidth * IMAGE_LIMITS.maxInputHeight,
  })
    .rotate()
    .metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Could not read image dimensions.");
  }

  if (
    metadata.width > IMAGE_LIMITS.maxInputWidth ||
    metadata.height > IMAGE_LIMITS.maxInputHeight
  ) {
    throw new Error("Image is too large. Use a file under 8192x8192 pixels.");
  }

  return metadata.height / metadata.width;
}

function renderBrailleText(
  raw: {
    grayscale: Buffer;
    height: number;
    rgb: Buffer;
    width: number;
  },
  preset: (typeof IMAGE_ASCII_PRESETS)[ImageAsciiPresetId],
  invert: boolean,
) {
  const rows: string[] = [];
  const colors: Array<Array<Rgb | undefined>> = [];
  const threshold = effectiveThreshold(preset);

  for (let y = 0; y < raw.height; y += 4) {
    let line = "";
    const lineColors: Array<Rgb | undefined> = [];

    for (let x = 0; x < raw.width; x += 2) {
      let bits = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      let litCount = 0;

      for (let dy = 0; dy < 4; dy += 1) {
        for (let dx = 0; dx < 2; dx += 1) {
          const px = Math.min(raw.width - 1, x + dx);
          const py = Math.min(raw.height - 1, y + dy);
          const index = py * raw.width + px;
          const adjusted = adjustLuma(raw.grayscale[index] ?? 0, preset);
          const lit = invert
            ? adjusted < threshold
            : adjusted > threshold;

          if (!lit) continue;

          bits |= BRAILLE_DOT_MAP[dy][dx];

          if (preset.litPixelColorSampling) {
            const sample = sampleRgb(raw.rgb, index);
            r += sample.r;
            g += sample.g;
            b += sample.b;
            litCount += 1;
          }
        }
      }

      line += brailleBitsToChar(bits);
      lineColors.push(
        litCount > 0
          ? boostColor(
              {
                b: Math.round(b / litCount),
                g: Math.round(g / litCount),
                r: Math.round(r / litCount),
              },
              preset.colorBoost,
            )
          : undefined,
      );
    }

    rows.push(line.replace(/\u2800+$/g, ""));
    colors.push(lineColors);
  }

  while (rows.length > 1 && rows[rows.length - 1].trim() === "") {
    rows.pop();
    colors.pop();
  }

  return {
    colors,
    lines: rows.map((row) => row || " "),
  };
}

function ditherToChars(
  lumas: number[],
  width: number,
  height: number,
  preset: (typeof IMAGE_ASCII_PRESETS)[ImageAsciiPresetId],
  invert: boolean,
) {
  const chars = IMAGE_CHARACTER_SETS[preset.characterSet].chars;

  if (preset.mode === "floyd-steinberg-dither") {
    const errors = lumas.slice();
    const lines: string[] = [];
    const levels = Math.max(1, chars.length - 1);

    for (let y = 0; y < height; y += 1) {
      let line = "";

      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        const oldValue = adjustLuma(errors[index] ?? 0, preset);
        const quantizedIndex = Math.max(
          0,
          Math.min(levels, Math.round((oldValue / 255) * levels)),
        );
        const newValue = (quantizedIndex / levels) * 255;
        const error = oldValue - newValue;
        const luma = invert ? 255 - newValue : newValue;
        line += mapLumaToCharacter(luma, chars);

        if (x + 1 < width) errors[index + 1] += (error * 7) / 16;
        if (y + 1 < height) {
          if (x > 0) errors[index + width - 1] += (error * 3) / 16;
          errors[index + width] += (error * 5) / 16;
          if (x + 1 < width) errors[index + width + 1] += error / 16;
        }
      }

      lines.push(line.replace(/\s+$/g, ""));
    }

    return lines;
  }

  const lines: string[] = [];

  for (let y = 0; y < height; y += 1) {
    let line = "";

    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const adjusted = adjustLuma(lumas[index] ?? 0, preset);
      const bayerThreshold =
        ((BAYER_4X4[y % 4][x % 4] + 0.5) / 16) * 255;
      const luma =
        preset.mode === "bayer-dither"
          ? clampByte(adjusted + (bayerThreshold - 127.5) * 0.42)
          : adjusted;

      line += mapLumaToCharacter(luma, chars, invert);
    }

    lines.push(line.replace(/\s+$/g, ""));
  }

  return lines;
}

function renderBrailleSvg(options: {
  canvasColumns: number;
  canvasRows: number;
  colors?: Array<Array<Rgb | undefined>>;
  lines: string[];
  overlay?: string;
  preset: (typeof IMAGE_ASCII_PRESETS)[ImageAsciiPresetId];
}) {
  const theme = resolveTheme(options.preset);
  const maxColumns = Math.max(options.canvasColumns, 1);
  const cellWidth = Math.max(5.8, Math.min(9.5, 900 / maxColumns));
  const cellHeight = cellWidth * 1.85;
  const padding = Math.round(cellWidth * 3);
  const width = Math.ceil(maxColumns * cellWidth + padding * 2);
  const height = Math.ceil(options.canvasRows * cellHeight + padding * 2);
  const dotRadius = cellWidth * 0.15;
  const shapes: string[] = [];
  const foreground = theme.foreground;
  const dotPositions = [
    [0.3, 0.16, 0x01],
    [0.3, 0.39, 0x02],
    [0.3, 0.62, 0x04],
    [0.3, 0.85, 0x40],
    [0.7, 0.16, 0x08],
    [0.7, 0.39, 0x10],
    [0.7, 0.62, 0x20],
    [0.7, 0.85, 0x80],
  ] as const;

  for (let row = 0; row < options.lines.length; row += 1) {
    const line = options.lines[row] || " ";

    for (let column = 0; column < line.length; column += 1) {
      const bits = line.charCodeAt(column) - BRAILLE_UNICODE_OFFSET;
      if (bits <= 0) continue;

      const cellX = padding + column * cellWidth;
      const cellY = padding + row * cellHeight;
      const color = colorToCss(options.colors?.[row]?.[column]);

      for (const [dotX, dotY, bit] of dotPositions) {
        if ((bits & bit) === 0) continue;

        shapes.push(
          `<circle cx="${svgNumber(cellX + dotX * cellWidth)}" cy="${svgNumber(
            cellY + dotY * cellHeight,
          )}" r="${svgNumber(dotRadius)}" fill="${color || foreground}"/>`,
        );
      }
    }
  }

  return {
    height,
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${theme.backgroundColor}"/>
  <defs>
    <radialGradient id="crtVignette" cx="50%" cy="50%" r="72%">
      <stop offset="50%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="85%" stop-color="#000000" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.75"/>
    </radialGradient>
    <filter id="softGlow" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="${svgNumber(theme.glowStdDev * 0.75)}" result="blur1"/>
      <feGaussianBlur stdDeviation="${svgNumber(theme.glowStdDev * 2)}" result="blur2"/>
      <feMerge>
        <feMergeNode in="blur2" opacity="0.35"/>
        <feMergeNode in="blur1" opacity="0.65"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <pattern id="scanlines" width="1" height="${theme.scanlinesPeriod}" patternUnits="userSpaceOnUse">
      <rect y="0" width="1" height="1.2" fill="#000000" opacity="${svgNumber(theme.scanlinesOpacity)}"/>
    </pattern>
  </defs>
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="${theme.borderColor}" stroke-width="1.5"/>
  <g filter="url(#softGlow)" fill="${foreground}">${shapes.join("\n    ")}</g>
  <rect width="100%" height="100%" fill="url(#scanlines)"/>
  ${theme.vignette ? '<rect width="100%" height="100%" fill="url(#crtVignette)"/>' : ""}
  ${renderOsdHud({ height, osdStyle: theme.osdStyle, padding, preset: options.preset, theme, width })}
  ${options.overlay ?? ""}
</svg>`,
    width,
  };
}

function renderAsciiSvg(options: {
  canvasColumns: number;
  canvasRows: number;
  colors?: Array<Array<Rgb | undefined>>;
  lines: string[];
  overlay?: string;
  preset: (typeof IMAGE_ASCII_PRESETS)[ImageAsciiPresetId];
}) {
  if (options.preset.mode === "blocks-braille") {
    return renderBrailleSvg(options);
  }

  const theme = resolveTheme(options.preset);
  const maxColumns = Math.max(options.canvasColumns, 1);
  const fontSize = Math.max(7, Math.min(15, Math.floor(940 / maxColumns)));
  const charWidth = fontSize * 0.62;
  const lineHeight = fontSize * 1.12;
  const padding = Math.round(fontSize * 2.2);
  const width = Math.ceil(maxColumns * charWidth + padding * 2);
  const height = Math.ceil(options.canvasRows * lineHeight + padding * 2);
  const foreground = theme.foreground;
  const shapes: string[] = [];

  for (let row = 0; row < options.lines.length; row += 1) {
    const line = options.lines[row] || " ";
    const top = padding + row * lineHeight;

    for (let column = 0; column < line.length; column += 1) {
      const character = line[column];
      if (character === " ") continue;

      let color: string | undefined;
      if (options.colors?.[row]?.[column]) {
        color = colorToCss(options.colors[row][column]);
      } else if (theme.isDuotone) {
        color = getDuotoneCharColor(character, theme);
      }

      shapes.push(
        renderVectorGlyph(
          character,
          padding + column * charWidth,
          top,
          charWidth,
          fontSize,
          color,
        ),
      );
    }
  }

  return {
    height,
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${theme.backgroundColor}"/>
  <defs>
    <radialGradient id="crtVignette" cx="50%" cy="50%" r="72%">
      <stop offset="50%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="85%" stop-color="#000000" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.75"/>
    </radialGradient>
    <filter id="softGlow" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="${svgNumber(theme.glowStdDev * 0.75)}" result="blur1"/>
      <feGaussianBlur stdDeviation="${svgNumber(theme.glowStdDev * 2)}" result="blur2"/>
      <feMerge>
        <feMergeNode in="blur2" opacity="0.35"/>
        <feMergeNode in="blur1" opacity="0.65"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <pattern id="scanlines" width="1" height="${theme.scanlinesPeriod}" patternUnits="userSpaceOnUse">
      <rect y="0" width="1" height="1.2" fill="#000000" opacity="${svgNumber(theme.scanlinesOpacity)}"/>
    </pattern>
  </defs>
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="${theme.borderColor}" stroke-width="1.5"/>
  <g filter="url(#softGlow)" fill="${foreground}" stroke="${foreground}" stroke-linecap="round" stroke-linejoin="round">
    ${shapes.join("\n    ")}
  </g>
  <rect width="100%" height="100%" fill="url(#scanlines)"/>
  ${theme.vignette ? '<rect width="100%" height="100%" fill="url(#crtVignette)"/>' : ""}
  ${renderOsdHud({ height, osdStyle: theme.osdStyle, padding, preset: options.preset, theme, width })}
  ${options.overlay ?? ""}
</svg>`,
    width,
  };
}

export async function prepareImageAsciiFrame(
  input: Buffer,
  options: RenderImageAsciiOptions = {},
): Promise<PreparedAsciiImageFrame> {
  if (input.byteLength > IMAGE_LIMITS.maxFileBytes) {
    throw new Error("Image file is too large. Maximum size is 12 MB.");
  }

  const requestedPresetId = options.presetId ?? "";
  const presetId: ImageAsciiPresetId = isImageAsciiPresetId(requestedPresetId)
    ? requestedPresetId
    : "matrixAscii";
  const preset = IMAGE_ASCII_PRESETS[presetId];
  const requestedWidth = Math.max(
    24,
    Math.min(IMAGE_LIMITS.maxAsciiWidth, options.width ?? preset.outputWidth),
  );
  const aspectRatio = await getImageAspectRatio(input);
  const invert = Boolean(options.invert);

  let lines: string[];
  let colors: Array<Array<Rgb | undefined>> | undefined;
  let canvasColumns: number;
  let canvasRows: number;

  if (preset.mode === "blocks-braille") {
    const raster = calculateBrailleRasterSize(requestedWidth, aspectRatio);
    const pixels = await readResizedPixels(
      input,
      raster.pixelWidth,
      raster.pixelHeight,
    );
    const rendered = renderBrailleText(pixels, preset, invert);
    lines = rendered.lines;
    colors = preset.litPixelColorSampling ? rendered.colors : undefined;
    canvasColumns = raster.characterWidth;
    canvasRows = raster.characterHeight;
  } else {
    const characterWidth = requestedWidth;
    const characterHeight = Math.max(
      8,
      Math.round(
        characterWidth * aspectRatio / ASCII_RENDER_CELL_ASPECT_RATIO,
      ),
    );
    const pixels = await readResizedPixels(input, characterWidth, characterHeight);
    const lumas = Array.from(pixels.grayscale);
    lines = ditherToChars(lumas, pixels.width, pixels.height, preset, invert);
    canvasColumns = pixels.width;
    canvasRows = pixels.height;

    if (preset.litPixelColorSampling) {
      const sampledColors: Array<Array<Rgb | undefined>> = [];
      for (let y = 0; y < pixels.height; y += 1) {
        const lineColors: Array<Rgb | undefined> = [];
        for (let x = 0; x < pixels.width; x += 1) {
          const index = y * pixels.width + x;
          const sample = sampleRgb(pixels.rgb, index);
          lineColors.push(boostColor(sample, preset.colorBoost));
        }
        sampledColors.push(lineColors);
      }
      colors = sampledColors;
    }
  }

  return {
    asciiText: lines.join("\n"),
    canvasColumns,
    canvasRows,
    colors,
    lines,
    presetId,
  };
}

export function renderAsciiFrameToSvg(
  frame: PreparedAsciiImageFrame,
  options: { overlay?: string } = {},
): RenderedAsciiImageSvg {
  const preset = IMAGE_ASCII_PRESETS[frame.presetId];

  return renderAsciiSvg({
    canvasColumns: frame.canvasColumns,
    canvasRows: frame.canvasRows,
    colors: frame.colors,
    lines: frame.lines,
    overlay: options.overlay,
    preset,
  });
}

export async function renderImageToAsciiPng(
  input: Buffer,
  options: RenderImageAsciiOptions = {},
): Promise<RenderedAsciiImage> {
  const frame = await prepareImageAsciiFrame(input, options);
  const svg = renderAsciiFrameToSvg(frame);
  const png = await sharp(Buffer.from(svg.svg)).png().toBuffer();

  return {
    asciiText: frame.asciiText,
    height: svg.height,
    mimeType: "image/png",
    png,
    presetId: frame.presetId,
    width: svg.width,
  };
}
