import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import {
  cleanText,
  renderFigletText,
} from "@/lib/ascii/text-renderer";
import {
  TEXT_CANVAS_PRESETS,
  TEXT_VIDEO_COLORS,
  isAsciiFontName,
  isTextCanvasPresetId,
  isTextVideoColorId,
  type AsciiFontName,
  type TextCanvasPresetId,
  type TextVideoColorId,
} from "@/lib/ascii/text";

export type RenderTextVideoOptions = {
  canvasPreset?: string;
  color?: string;
  font?: string;
  text?: string;
};

export type RenderedAsciiTextVideo = {
  canvas: {
    height: number;
    label: string;
    shortLabel: string;
    width: number;
  };
  color: TextVideoColorId;
  durationSeconds: number;
  fileName: string;
  font: AsciiFontName;
  mimeType: "video/mp4";
  mp4: Buffer;
  text: string;
};

const GLITCH_GLYPHS = "#$%*@";
const VIDEO_DURATION_SECONDS = 4;
const VIDEO_FPS = 12;
const MAX_OUTPUT_BYTES = 50 * 1024 * 1024;

type FfmpegResult = {
  stderr: string;
  stdout: string;
};

function getFfmpegPath() {
  return process.platform === "win32"
    ? "node_modules/ffmpeg-static/ffmpeg.exe"
    : "node_modules/ffmpeg-static/ffmpeg";
}

function errorOutputToString(error: unknown, field: "stderr" | "stdout") {
  if (!error || typeof error !== "object" || !(field in error)) return "";

  const output = (error as Record<string, unknown>)[field];

  if (typeof output === "string") return output;
  if (Buffer.isBuffer(output)) return output.toString("utf8");

  return "";
}

function execFfmpeg(args: string[], cwd?: string): Promise<FfmpegResult> {
  return new Promise((resolve, reject) => {
    execFile(
      getFfmpegPath(),
      args,
      {
        cwd,
        maxBuffer: 1024 * 1024 * 16,
        timeout: 1000 * 60 * 2,
      },
      (error, stdout, stderr) => {
        const result = {
          stderr: String(stderr ?? ""),
          stdout: String(stdout ?? ""),
        };

        if (error) {
          reject(Object.assign(new Error(error.message), result));
          return;
        }

        resolve(result);
      },
    );
  });
}

async function runFfmpeg(args: string[], cwd?: string) {
  try {
    return await execFfmpeg(args, cwd);
  } catch (error) {
    const stderr = errorOutputToString(error, "stderr");

    if (stderr) {
      throw new Error(stderr.split("\n").slice(-8).join("\n"));
    }

    throw error;
  }
}

function normalizeColor(color?: string): TextVideoColorId {
  const requestedColor = color ?? "";

  return isTextVideoColorId(requestedColor) ? requestedColor : "green";
}

function normalizeFont(font?: string): AsciiFontName {
  return isAsciiFontName(font ?? "") ? (font as AsciiFontName) : "Graffiti";
}

function normalizeCanvasPreset(preset?: string): TextCanvasPresetId {
  return isTextCanvasPresetId(preset ?? "")
    ? (preset as TextCanvasPresetId)
    : "telegramPost";
}

function random(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function makeGlitchedLines(
  lines: string[],
  frameIndex: number,
  totalFrames: number,
  seed: number,
) {
  const pulse = 0.5 + 0.5 * Math.sin((frameIndex / totalFrames) * Math.PI * 8);
  const glitchRate = 0.028 + pulse * 0.052;

  return lines.map((line, lineIndex) =>
    Array.from(line)
      .map((character, charIndex) => {
        if (character === " ") return character;

        const noise = random(
          seed +
            frameIndex * 97.13 +
            lineIndex * 31.71 +
            charIndex * 11.19,
        );

        if (noise > glitchRate) return character;

        const glyphIndex = Math.floor(
          random(seed + frameIndex * 17.29 + charIndex * 41.11) *
            GLITCH_GLYPHS.length,
        );

        return GLITCH_GLYPHS[glyphIndex] ?? "#";
      })
      .join(""),
  );
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

function svgNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "0";
}

function renderPixelGlyph(
  pattern: readonly string[],
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const columns = pattern[0]?.length ?? 5;
  const rows = pattern.length;
  const gap = Math.max(0.45, Math.min(width, height) * 0.045);
  const pixelWidth = (width - gap * (columns + 1)) / columns;
  const pixelHeight = (height - gap * (rows + 1)) / rows;
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

function renderVectorGlyph(
  character: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const left = x + width * 0.16;
  const right = x + width * 0.84;
  const top = y + height * 0.16;
  const midX = x + width * 0.5;
  const midY = y + height * 0.52;
  const bottom = y + height * 0.86;
  const strokeWidth = Math.max(1.2, Math.min(width, height) * 0.11);
  const path = (data: string) =>
    `<path d="${data}" stroke-width="${svgNumber(strokeWidth)}"/>`;
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    path(
      `M ${svgNumber(x1)} ${svgNumber(y1)} L ${svgNumber(x2)} ${svgNumber(y2)}`,
    );
  const circle = (cx: number, cy: number, radius = strokeWidth * 0.62) =>
    `<circle cx="${svgNumber(cx)}" cy="${svgNumber(cy)}" r="${svgNumber(
      radius,
    )}"/>`;

  switch (character) {
    case " ":
      return "";
    case "_":
      return line(left, bottom, right, bottom);
    case "-":
      return line(left, midY, right, midY);
    case "=":
      return (
        line(left, y + height * 0.42, right, y + height * 0.42) +
        line(left, y + height * 0.66, right, y + height * 0.66)
      );
    case "|":
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
    case "'":
      return line(midX, top, x + width * 0.42, y + height * 0.36);
    case '"':
      return (
        line(x + width * 0.36, top, x + width * 0.3, y + height * 0.36) +
        line(x + width * 0.68, top, x + width * 0.62, y + height * 0.36)
      );
    case "`":
      return line(x + width * 0.34, top, x + width * 0.55, y + height * 0.34);
    case "^":
      return line(left, midY, midX, top) + line(midX, top, right, midY);
    case "~":
      return path(
        `M ${svgNumber(left)} ${svgNumber(midY)} C ${svgNumber(
          x + width * 0.34,
        )} ${svgNumber(top)} ${svgNumber(x + width * 0.5)} ${svgNumber(
          bottom,
        )} ${svgNumber(right)} ${svgNumber(midY)}`,
      );
    case "(":
      return path(
        `M ${svgNumber(right)} ${svgNumber(top)} C ${svgNumber(
          left,
        )} ${svgNumber(top)} ${svgNumber(left)} ${svgNumber(bottom)} ${svgNumber(
          right,
        )} ${svgNumber(bottom)}`,
      );
    case ")":
      return path(
        `M ${svgNumber(left)} ${svgNumber(top)} C ${svgNumber(
          right,
        )} ${svgNumber(top)} ${svgNumber(right)} ${svgNumber(
          bottom,
        )} ${svgNumber(left)} ${svgNumber(bottom)}`,
      );
    case "[":
      return line(right, top, left, top) + line(left, top, left, bottom) + line(left, bottom, right, bottom);
    case "]":
      return line(left, top, right, top) + line(right, top, right, bottom) + line(right, bottom, left, bottom);
    case "{":
      return (
        path(
          `M ${svgNumber(right)} ${svgNumber(top)} C ${svgNumber(
            left,
          )} ${svgNumber(top)} ${svgNumber(midX)} ${svgNumber(
            midY,
          )} ${svgNumber(left)} ${svgNumber(midY)}`,
        ) +
        path(
          `M ${svgNumber(left)} ${svgNumber(midY)} C ${svgNumber(
            midX,
          )} ${svgNumber(midY)} ${svgNumber(left)} ${svgNumber(
            bottom,
          )} ${svgNumber(right)} ${svgNumber(bottom)}`,
        )
      );
    case "}":
      return (
        path(
          `M ${svgNumber(left)} ${svgNumber(top)} C ${svgNumber(
            right,
          )} ${svgNumber(top)} ${svgNumber(midX)} ${svgNumber(
            midY,
          )} ${svgNumber(right)} ${svgNumber(midY)}`,
        ) +
        path(
          `M ${svgNumber(right)} ${svgNumber(midY)} C ${svgNumber(
            midX,
          )} ${svgNumber(midY)} ${svgNumber(right)} ${svgNumber(
            bottom,
          )} ${svgNumber(left)} ${svgNumber(bottom)}`,
        )
      );
    case "!":
      return line(midX, top, midX, y + height * 0.66) + circle(midX, bottom);
    default: {
      const pattern = PIXEL_GLYPHS[character.toUpperCase()];
      if (pattern) {
        return renderPixelGlyph(pattern, x + width * 0.08, y + height * 0.05, width * 0.84, height * 0.9);
      }

      return line(left, top, right, bottom) + line(right, top, left, bottom);
    }
  }
}

function renderAsciiShapes(
  lines: string[],
  x: number,
  y: number,
  fontSize: number,
  lineHeight: number,
) {
  const charWidth = fontSize * 0.58;
  const parts: string[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const top = y + lineIndex * lineHeight;

    for (let charIndex = 0; charIndex < line.length; charIndex += 1) {
      const character = line[charIndex];
      if (character === " ") continue;

      parts.push(
        renderVectorGlyph(
          character,
          x + charIndex * charWidth,
          top,
          charWidth,
          fontSize,
        ),
      );
    }
  }

  return parts.join("\n");
}

function renderFrameSvg({
  canvasHeight,
  canvasWidth,
  color,
  frameIndex,
  lines,
  lineHeight,
  fontSize,
  totalFrames,
  x,
  y,
}: {
  canvasHeight: number;
  canvasWidth: number;
  color: (typeof TEXT_VIDEO_COLORS)[TextVideoColorId];
  fontSize: number;
  frameIndex: number;
  lineHeight: number;
  lines: string[];
  totalFrames: number;
  x: number;
  y: number;
}) {
  const progress = frameIndex / Math.max(1, totalFrames - 1);
  const flicker = 0.88 + 0.12 * Math.sin(progress * Math.PI * 22);
  const opacity = Math.max(0.76, Math.min(1, flicker));
  const shapes = renderAsciiShapes(lines, x, y, fontSize, lineHeight);
  const jitterX = Math.sin(progress * Math.PI * 44) * 1.4;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#000000"/>
  <defs>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3.2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <pattern id="scanlines" width="1" height="8" patternUnits="userSpaceOnUse">
      <rect y="0" width="1" height="1" fill="rgba(255,255,255,0.055)"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#scanlines)" opacity="0.35"/>
  <g fill="${color.hex}" stroke="${color.hex}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity.toFixed(
    3,
  )}" filter="url(#glow)">
    ${shapes}
  </g>
  <g fill="${color.hex}" stroke="${color.hex}" stroke-linecap="round" stroke-linejoin="round" opacity="0.28" transform="translate(${svgNumber(
    jitterX,
  )} 0)">
    ${shapes}
  </g>
</svg>`;
}

async function writePngFrame(
  svg: string,
  outputPath: string,
) {
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  await writeFile(outputPath, png);
}

export async function renderAsciiTextVideo(
  options: RenderTextVideoOptions,
): Promise<RenderedAsciiTextVideo> {
  const text = cleanText(options.text);
  const font = normalizeFont(options.font);
  const canvasPreset = normalizeCanvasPreset(options.canvasPreset);
  const colorId = normalizeColor(options.color);
  const color = TEXT_VIDEO_COLORS[colorId];
  const canvas = TEXT_CANVAS_PRESETS[canvasPreset];
  const rendered = await renderFigletText(text, font, canvasPreset);
  const totalFrames = VIDEO_DURATION_SECONDS * VIDEO_FPS;
  const seed = Math.random() * 10000;
  const workDir = await mkdtemp(path.join(tmpdir(), "ascii-text-video-"));

  try {
    const framePattern = path.join(workDir, "frame-%04d.png");
    const outputPath = path.join(workDir, "ascii-text.mp4");

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
      const glitchedLines = makeGlitchedLines(
        rendered.fit.fittedLines,
        frameIndex,
        totalFrames,
        seed,
      );
      const svg = renderFrameSvg({
        canvasHeight: canvas.height,
        canvasWidth: canvas.width,
        color,
        fontSize: rendered.fit.fontSize,
        frameIndex,
        lineHeight: rendered.fit.lineHeight,
        lines: glitchedLines,
        totalFrames,
        x: rendered.fit.x,
        y: rendered.fit.y + rendered.fit.fontSize,
      });
      await writePngFrame(
        svg,
        framePattern.replace("%04d", String(frameIndex + 1).padStart(4, "0")),
      );
    }

    await runFfmpeg([
      "-y",
      "-framerate",
      String(VIDEO_FPS),
      "-i",
      framePattern,
      "-t",
      String(VIDEO_DURATION_SECONDS),
      "-vf",
      "pad=ceil(iw/2)*2:ceil(ih/2)*2:0:0:black,format=yuv420p",
      "-an",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-preset",
      "veryfast",
      "-crf",
      "24",
      "-movflags",
      "+faststart",
      outputPath,
    ]);

    const outputStat = await stat(outputPath);

    if (outputStat.size > MAX_OUTPUT_BYTES) {
      throw new Error("Rendered MP4 is over 50 MB. Try a smaller canvas.");
    }

    const mp4 = await readFile(outputPath);

    return {
      canvas,
      color: colorId,
      durationSeconds: VIDEO_DURATION_SECONDS,
      fileName: "ascii-text-glitch.mp4",
      font,
      mimeType: "video/mp4",
      mp4,
      text,
    };
  } finally {
    await rm(workDir, {
      force: true,
      recursive: true,
    });
  }
}
