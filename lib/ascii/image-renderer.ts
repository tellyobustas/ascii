import sharp from "sharp";
import {
  BRAILLE_DOT_MAP,
  IMAGE_ASCII_PRESETS,
  IMAGE_CHARACTER_SETS,
  IMAGE_LIMITS,
  brailleBitsToChar,
  calculateBrailleRasterSize,
  isImageAsciiPresetId,
  mapLumaToCharacter,
  type ImageAsciiPresetId,
} from "@/lib/ascii/image";

type Rgb = {
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

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
            ? adjusted < preset.threshold
            : adjusted > preset.threshold;

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

    for (let y = 0; y < height; y += 1) {
      let line = "";

      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        const oldValue = adjustLuma(errors[index] ?? 0, preset);
        const newValue = oldValue > preset.threshold ? 255 : 0;
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
          ? adjusted + (adjusted - bayerThreshold) * 0.28
          : adjusted;

      line += mapLumaToCharacter(luma, chars, invert);
    }

    lines.push(line.replace(/\s+$/g, ""));
  }

  return lines;
}

function renderAsciiSvg(options: {
  colors?: Array<Array<Rgb | undefined>>;
  lines: string[];
  preset: (typeof IMAGE_ASCII_PRESETS)[ImageAsciiPresetId];
}) {
  const maxColumns = Math.max(...options.lines.map((line) => line.length), 1);
  const fontSize = Math.max(6, Math.min(14, Math.floor(980 / maxColumns)));
  const charWidth = fontSize * 0.62;
  const lineHeight = fontSize * 1.18;
  const padding = Math.round(fontSize * 2.5);
  const width = Math.ceil(maxColumns * charWidth + padding * 2);
  const height = Math.ceil(options.lines.length * lineHeight + padding * 2);
  const textParts: string[] = [];

  for (let y = 0; y < options.lines.length; y += 1) {
    const line = options.lines[y] || " ";
    const baseline = padding + y * lineHeight + fontSize;

    if (options.colors) {
      const tspans = Array.from(line, (char, x) => {
        const color = options.colors?.[y]?.[x];

        return `<tspan fill="${colorToCss(color)}">${escapeXml(char)}</tspan>`;
      }).join("");

      textParts.push(
        `<text x="${padding}" y="${baseline}" class="ascii">${tspans}</text>`,
      );
    } else {
      textParts.push(
        `<text x="${padding}" y="${baseline}" class="ascii">${escapeXml(line)}</text>`,
      );
    }
  }

  const foreground =
    String(options.preset.mode) === "white-terminal" ? "#f2f2f2" : "#00ff66";

  return {
    height,
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#000000"/>
  <style>
    .ascii {
      fill: ${foreground};
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: ${fontSize}px;
      font-weight: 700;
      white-space: pre;
    }
  </style>
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="rgba(0,255,102,0.25)" stroke-width="1"/>
  ${textParts.join("\n  ")}
</svg>`,
    width,
  };
}

export async function renderImageToAsciiPng(
  input: Buffer,
  options: RenderImageAsciiOptions = {},
): Promise<RenderedAsciiImage> {
  if (input.byteLength > IMAGE_LIMITS.maxFileBytes) {
    throw new Error("Image file is too large. Maximum size is 12 MB.");
  }

  const requestedPresetId = options.presetId ?? "";
  const presetId: ImageAsciiPresetId = isImageAsciiPresetId(requestedPresetId)
    ? requestedPresetId
    : "brailleColor";
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
    const lumas = Array.from(pixels.grayscale, (luma) =>
      adjustLuma(luma, preset),
    );
    lines = ditherToChars(lumas, pixels.width, pixels.height, preset, invert);
  }

  const svg = renderAsciiSvg({ colors, lines, preset });
  const png = await sharp(Buffer.from(svg.svg)).png().toBuffer();

  return {
    asciiText: lines.join("\n"),
    height: svg.height,
    mimeType: "image/png",
    png,
    presetId,
    width: svg.width,
  };
}
