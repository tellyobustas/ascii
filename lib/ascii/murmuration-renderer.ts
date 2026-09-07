import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import {
  MURMURATION_GLYPHS,
  MURMURATION_LIMITS,
  MURMURATION_STYLES,
  isMurmurationStyleId,
  type MurmurationStyleId,
} from "@/lib/ascii/murmuration";

type Point = {
  alpha: number;
  glyph: string;
  homeX: number;
  homeY: number;
  phase: number;
  size: number;
  vectorX: number;
  vectorY: number;
};

export type RenderedMurmuration = {
  durationSeconds: number;
  fileName: string;
  mimeType: "video/mp4";
  mp4: Buffer;
  styleId: MurmurationStyleId;
};

function random(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[
      character
    ] ?? character,
  );
}

function getFfmpegPath() {
  return process.platform === "win32"
    ? "node_modules/ffmpeg-static/ffmpeg.exe"
    : "node_modules/ffmpeg-static/ffmpeg";
}

function runFfmpeg(args: string[], cwd: string) {
  return new Promise<void>((resolve, reject) => {
    execFile(
      getFfmpegPath(),
      args,
      { cwd, maxBuffer: 1024 * 1024 * 16, timeout: 1000 * 60 * 2 },
      (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(String(stderr || error.message).split("\n").slice(-8).join("\n")));
          return;
        }
        resolve();
      },
    );
  });
}

function buildPoints(data: Buffer, width: number, height: number, seed: number) {
  const points: Point[] = [];
  const maxPoints = 820;
  const step = Math.max(5, Math.round(Math.sqrt((width * height) / maxPoints)));

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4;
      const red = data[index] ?? 0;
      const green = data[index + 1] ?? 0;
      const blue = data[index + 2] ?? 0;
      const alpha = (data[index + 3] ?? 255) / 255;
      const luma = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
      const localSeed = seed + x * 0.217 + y * 13.91;
      // A mixture of luminance and a tiny uniform base preserves faces instead of only white highlights.
      const keepChance = (0.16 + luma * 0.84) * alpha;

      if (random(localSeed) > keepChance) continue;

      points.push({
        alpha: 0.28 + luma * 0.68,
        glyph:
          MURMURATION_GLYPHS[
            Math.min(
              MURMURATION_GLYPHS.length - 1,
              Math.floor(luma * MURMURATION_GLYPHS.length),
            )
          ] ?? "+",
        homeX: x + (random(localSeed + 2) - 0.5) * step,
        homeY: y + (random(localSeed + 3) - 0.5) * step,
        phase: random(localSeed + 4) * Math.PI * 2,
        size: 8 + luma * 9 + random(localSeed + 5) * 3,
        vectorX: (random(localSeed + 6) - 0.5) * 2,
        vectorY: (random(localSeed + 7) - 0.5) * 2,
      });
    }
  }

  return points.sort((a, b) => a.homeY - b.homeY).slice(0, maxPoints);
}

function renderFrame(points: Point[], frameIndex: number, totalFrames: number, styleId: MurmurationStyleId) {
  const size = MURMURATION_LIMITS.outputSize;
  const style = MURMURATION_STYLES[styleId];
  const time = frameIndex / Math.max(1, totalFrames - 1);
  const breath = 0.5 + 0.5 * Math.sin(time * Math.PI * 4);
  const intenseBurst = styleId === "shatter" && Math.sin(time * Math.PI * 6) > 0.76;
  const particles = points.map((point, index) => {
    const wave = Math.sin(time * 8 + point.phase);
    const curl = Math.cos(time * 6.2 + point.phase * 1.7);
    const edgePulse = 7 + breath * style.intensity * 13;
    const burst = intenseBurst && index % 13 === 0 ? 42 * style.intensity : 0;
    const x = point.homeX + wave * edgePulse * point.vectorX + curl * 3 + burst * point.vectorX;
    const y = point.homeY + curl * edgePulse * point.vectorY + wave * 3 + burst * point.vectorY;
    const flicker = 0.76 + Math.sin(time * 23 + point.phase) * 0.18;
    const glyph = intenseBurst && index % 19 === 0 ? "#$%*@"[index % 5] : point.glyph;
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${point.size.toFixed(1)}" opacity="${Math.max(0.14, point.alpha * flicker).toFixed(2)}">${escapeXml(glyph)}</text>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#000"/>
  <defs>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <pattern id="scan" width="1" height="7" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="#ffffff" opacity=".08"/></pattern>
  </defs>
  <g fill="${style.color}" font-family="monospace" text-anchor="middle" filter="url(#glow)">${particles}</g>
  <rect width="100%" height="100%" fill="url(#scan)" opacity=".35"/>
</svg>`;
}

export async function renderMurmurationPortrait(input: Buffer, style?: string): Promise<RenderedMurmuration> {
  if (input.byteLength > MURMURATION_LIMITS.maxFileBytes) {
    throw new Error("Portrait is too large. Maximum size is 12 MB.");
  }

  const requestedStyle = style ?? "";
  const styleId: MurmurationStyleId = isMurmurationStyleId(requestedStyle)
    ? requestedStyle
    : "signal";
  const canvasSize = MURMURATION_LIMITS.outputSize;
  const image = sharp(input, { failOn: "none" })
    .resize(canvasSize, canvasSize, { fit: "contain", background: "#000000" })
    .removeAlpha()
    .ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const seed = Math.random() * 10000;
  const points = buildPoints(data, info.width, info.height, seed);

  if (points.length < 40) {
    throw new Error("Could not read enough detail. Try a brighter portrait with a clear subject.");
  }

  const workDir = await mkdtemp(path.join(tmpdir(), "ascii-murmuration-"));
  try {
    const pattern = path.join(workDir, "frame-%04d.png");
    const outputPath = path.join(workDir, "murmuration.mp4");
    const totalFrames = MURMURATION_LIMITS.durationSeconds * MURMURATION_LIMITS.fps;

    for (let index = 0; index < totalFrames; index += 1) {
      const svg = renderFrame(points, index, totalFrames, styleId);
      const png = await sharp(Buffer.from(svg)).png().toBuffer();
      await writeFile(pattern.replace("%04d", String(index + 1).padStart(4, "0")), png);
    }

    await runFfmpeg([
      "-y", "-framerate", String(MURMURATION_LIMITS.fps), "-i", pattern,
      "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast",
      "-crf", "24", "-movflags", "+faststart", outputPath,
    ], workDir);

    const fileInfo = await stat(outputPath);
    if (fileInfo.size > 50 * 1024 * 1024) throw new Error("Rendered MP4 is over Telegram's 50 MB limit.");

    return {
      durationSeconds: MURMURATION_LIMITS.durationSeconds,
      fileName: "asciilograph-murmuration.mp4",
      mimeType: "video/mp4",
      mp4: await readFile(outputPath),
      styleId,
    };
  } finally {
    await rm(workDir, { force: true, recursive: true });
  }
}
