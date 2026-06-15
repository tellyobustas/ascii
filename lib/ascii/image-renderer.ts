import sharp from "sharp";
import {
  BRAILLE_DOT_MAP,
  BRAILLE_UNICODE_OFFSET,
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

function renderVectorGlyph(
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
  colors?: Array<Array<Rgb | undefined>>;
  lines: string[];
  overlay?: string;
  preset: (typeof IMAGE_ASCII_PRESETS)[ImageAsciiPresetId];
}) {
  const maxColumns = Math.max(...options.lines.map((line) => line.length), 1);
  const cellWidth = Math.max(5.8, Math.min(9.5, 900 / maxColumns));
  const cellHeight = cellWidth * 1.85;
  const padding = Math.round(cellWidth * 3);
  const width = Math.ceil(maxColumns * cellWidth + padding * 2);
  const height = Math.ceil(options.lines.length * cellHeight + padding * 2);
  const dotRadius = cellWidth * 0.15;
  const shapes: string[] = [];
  const foreground =
    String(options.preset.mode) === "white-terminal" ? "#f2f2f2" : "#00ff66";
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
          )}" r="${svgNumber(dotRadius)}" fill="${color}"/>`,
        );
      }
    }
  }

  return {
    height,
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#000000"/>
  <defs>
    <filter id="softGlow" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="1.4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <pattern id="scanlines" width="1" height="7" patternUnits="userSpaceOnUse">
      <rect y="0" width="1" height="1" fill="rgba(255,255,255,0.04)"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#scanlines)" opacity="0.55"/>
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="rgba(0,255,102,0.25)" stroke-width="1"/>
  <g filter="url(#softGlow)" fill="${foreground}">${shapes.join("\n    ")}</g>
  ${options.overlay ?? ""}
</svg>`,
    width,
  };
}

function renderAsciiSvg(options: {
  colors?: Array<Array<Rgb | undefined>>;
  lines: string[];
  overlay?: string;
  preset: (typeof IMAGE_ASCII_PRESETS)[ImageAsciiPresetId];
}) {
  if (options.preset.mode === "blocks-braille") {
    return renderBrailleSvg(options);
  }

  const maxColumns = Math.max(...options.lines.map((line) => line.length), 1);
  const fontSize = Math.max(7, Math.min(15, Math.floor(940 / maxColumns)));
  const charWidth = fontSize * 0.62;
  const lineHeight = fontSize * 1.12;
  const padding = Math.round(fontSize * 2.2);
  const width = Math.ceil(maxColumns * charWidth + padding * 2);
  const height = Math.ceil(options.lines.length * lineHeight + padding * 2);
  const foreground =
    String(options.preset.mode) === "white-terminal" ? "#f2f2f2" : "#00ff66";
  const shapes: string[] = [];

  for (let row = 0; row < options.lines.length; row += 1) {
    const line = options.lines[row] || " ";
    const top = padding + row * lineHeight;

    for (let column = 0; column < line.length; column += 1) {
      const character = line[column];
      if (character === " ") continue;

      shapes.push(
        renderVectorGlyph(
          character,
          padding + column * charWidth,
          top,
          charWidth,
          fontSize,
        ),
      );
    }
  }

  return {
    height,
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#000000"/>
  <defs>
    <filter id="softGlow" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="1.2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <pattern id="scanlines" width="1" height="7" patternUnits="userSpaceOnUse">
      <rect y="0" width="1" height="1" fill="rgba(255,255,255,0.04)"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#scanlines)" opacity="0.55"/>
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="rgba(0,255,102,0.25)" stroke-width="1"/>
  <g filter="url(#softGlow)" fill="${foreground}" stroke="${foreground}" stroke-linecap="round" stroke-linejoin="round">
    ${shapes.join("\n    ")}
  </g>
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
  } else {
    const characterWidth = requestedWidth;
    const characterHeight = Math.max(
      8,
      Math.round(characterWidth * aspectRatio * 0.5),
    );
    const pixels = await readResizedPixels(input, characterWidth, characterHeight);
    const lumas = Array.from(pixels.grayscale);
    lines = ditherToChars(lumas, pixels.width, pixels.height, preset, invert);
  }

  return {
    asciiText: lines.join("\n"),
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
