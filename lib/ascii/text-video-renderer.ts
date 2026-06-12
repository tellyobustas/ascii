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

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
  const glitchRate = 0.035 + pulse * 0.055;

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
  const tspans = lines
    .map((line, index) => {
      const dy = index === 0 ? 0 : lineHeight;

      return `<tspan x="${x.toFixed(2)}" dy="${dy.toFixed(2)}">${escapeXml(
        line,
      )}</tspan>`;
    })
    .join("");

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
  <text
    x="${x.toFixed(2)}"
    y="${y.toFixed(2)}"
    fill="${color.hex}"
    filter="url(#glow)"
    font-family="Menlo, Consolas, 'DejaVu Sans Mono', monospace"
    font-size="${fontSize.toFixed(2)}"
    opacity="${opacity.toFixed(3)}"
    xml:space="preserve"
  >${tspans}</text>
  <text
    x="${x.toFixed(2)}"
    y="${y.toFixed(2)}"
    fill="${color.hex}"
    font-family="Menlo, Consolas, 'DejaVu Sans Mono', monospace"
    font-size="${fontSize.toFixed(2)}"
    opacity="0.36"
    transform="translate(${(Math.sin(progress * 22) * 2).toFixed(2)} 0)"
    xml:space="preserve"
  >${tspans}</text>
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
