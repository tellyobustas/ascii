import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import { resolveFfmpegPath } from "@/lib/ascii/ffmpeg-path";
import {
  buildMurmurationCells,
  getMurmurationGridSize,
  getMurmurationMotion,
  MURMURATION_LIMITS,
  MURMURATION_STYLES,
  isMurmurationStyleId,
  type MurmurationCell,
  type MurmurationGridSize,
  type MurmurationStyleId,
} from "@/lib/ascii/murmuration";

export type RenderedMurmuration = {
  durationSeconds: number;
  fileName: string;
  mimeType: "video/mp4";
  mp4: Buffer;
  styleId: MurmurationStyleId;
};

function runFfmpeg(args: string[], cwd: string) {
  return new Promise<void>((resolve, reject) => {
    execFile(
      resolveFfmpegPath(ffmpegPath),
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

const PIXEL_CHARS: Record<string, readonly string[]> = {
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
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  "[": ["01110", "01000", "01000", "01000", "01000", "01000", "01110"],
  "]": ["01110", "00010", "00010", "00010", "00010", "00010", "01110"],
};

function renderPixelText(
  text: string,
  x: number,
  y: number,
  charWidth: number,
  charHeight: number,
  color: string,
  align: "left" | "right" = "left",
  opacity = 0.85,
) {
  const chars = Array.from(text.toUpperCase());
  const spacing = charWidth * 0.28;
  const totalWidth = chars.length * (charWidth + spacing) - spacing;
  const startX = align === "right" ? x - totalWidth : x;
  const rects: string[] = [];

  const dotW = (charWidth / 5).toFixed(2);
  const dotH = (charHeight / 7).toFixed(2);

  for (let cIdx = 0; cIdx < chars.length; cIdx += 1) {
    const char = chars[cIdx];
    const pattern = PIXEL_CHARS[char];
    if (!pattern) continue;
    const cx = startX + cIdx * (charWidth + spacing);
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        if (pattern[row][col] === "1") {
          const px = (cx + col * (charWidth / 5)).toFixed(2);
          const py = (y + row * (charHeight / 7)).toFixed(2);
          rects.push(`<rect x="${px}" y="${py}" width="${dotW}" height="${dotH}"/>`);
        }
      }
    }
  }

  return `<g fill="${color}" opacity="${opacity}">${rects.join("")}</g>`;
}

function renderStarlingVector(
  glyph: string,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  opacity: number,
): string {
  const op = opacity.toFixed(3);
  const w = width * 0.46;
  const h = height * 0.46;
  const strokeW = Math.max(1, Math.min(width, height) * 0.13).toFixed(2);

  switch (glyph) {
    case "^": // Wings swept UP (flapping upstroke)
      return `<path d="M ${(x - w).toFixed(2)} ${(y + h * 0.35).toFixed(2)} L ${x.toFixed(2)} ${(y - h * 0.45).toFixed(2)} L ${(x + w).toFixed(2)} ${(y + h * 0.35).toFixed(2)}" fill="none" stroke="${color}" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"/>`;

    case "v": // Wings swept DOWN (power downstroke)
      return `<path d="M ${(x - w).toFixed(2)} ${(y - h * 0.35).toFixed(2)} L ${x.toFixed(2)} ${(y + h * 0.45).toFixed(2)} L ${(x + w).toFixed(2)} ${(y - h * 0.35).toFixed(2)}" fill="none" stroke="${color}" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"/>`;

    case "/":
    case "<": // Banking turn left
      return `<path d="M ${(x - w * 0.8).toFixed(2)} ${(y + h * 0.4).toFixed(2)} L ${x.toFixed(2)} ${(y - h * 0.1).toFixed(2)} L ${(x + w * 0.8).toFixed(2)} ${(y - h * 0.5).toFixed(2)}" fill="none" stroke="${color}" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"/>`;

    case "\\":
    case ">": // Banking turn right
      return `<path d="M ${(x - w * 0.8).toFixed(2)} ${(y - h * 0.5).toFixed(2)} L ${x.toFixed(2)} ${(y - h * 0.1).toFixed(2)} L ${(x + w * 0.8).toFixed(2)} ${(y + h * 0.4).toFixed(2)}" fill="none" stroke="${color}" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"/>`;

    case "-":
    case "~": // Flat glide
      return `<path d="M ${(x - w).toFixed(2)} ${y.toFixed(2)} Q ${x.toFixed(2)} ${(y - h * 0.25).toFixed(2)} ${(x + w).toFixed(2)} ${y.toFixed(2)}" fill="none" stroke="${color}" stroke-width="${strokeW}" stroke-linecap="round" opacity="${op}"/>`;

    case ".": // Far distance speck
      return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(Math.min(w, h) * 0.4).toFixed(2)}" fill="${color}" opacity="${op}"/>`;

    case "x": // Fast crossing bird
      return `<path d="M ${(x - w * 0.6).toFixed(2)} ${(y - h * 0.4).toFixed(2)} L ${(x + w * 0.6).toFixed(2)} ${(y + h * 0.4).toFixed(2)} M ${(x + w * 0.6).toFixed(2)} ${(y - h * 0.4).toFixed(2)} L ${(x - w * 0.6).toFixed(2)} ${(y + h * 0.4).toFixed(2)}" stroke="${color}" stroke-width="${strokeW}" stroke-linecap="round" opacity="${op}"/>`;

    case "+":
      return `<path d="M ${(x - w * 0.6).toFixed(2)} ${y.toFixed(2)} L ${(x + w * 0.6).toFixed(2)} ${y.toFixed(2)} M ${x.toFixed(2)} ${(y - h * 0.5).toFixed(2)} L ${x.toFixed(2)} ${(y + h * 0.5).toFixed(2)}" stroke="${color}" stroke-width="${strokeW}" stroke-linecap="round" opacity="${op}"/>`;

    case "*": // Star flare in dense cluster
      return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(Math.min(w, h) * 0.6).toFixed(2)}" fill="${color}" opacity="${op}"/>`;

    default: // Dense cluster node (M, B, 8, #, @, %)
      return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(Math.min(w, h) * 0.85).toFixed(2)}" fill="${color}" opacity="${op}"/>`;
  }
}

function renderFrame(
  cells: MurmurationCell[],
  size: MurmurationGridSize,
  frameIndex: number,
  styleId: MurmurationStyleId,
) {
  const style = MURMURATION_STYLES[styleId] ?? MURMURATION_STYLES.signal;
  const totalFrames = MURMURATION_LIMITS.durationSeconds * MURMURATION_LIMITS.fps;
  const progress = frameIndex / totalFrames;
  const nodes: string[] = [];
  const trails: string[] = [];

  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index];
    const motion = getMurmurationMotion(cell, progress, styleId);
    const x = size.paddingX + (cell.column + 0.5 + motion.dx) * size.cellWidth;
    const y = size.paddingY + (cell.row + 0.82 + motion.dy) * size.cellHeight;
    const opacity = Math.min(0.98, 0.28 + motion.opacity * 0.68);
    const cellColor = motion.color || style.color;

    nodes.push(
      renderStarlingVector(
        motion.glyph,
        x,
        y,
        size.cellWidth,
        size.cellHeight,
        cellColor,
        opacity,
      ),
    );

    // Starlings peeling off in wide aerial sweeps (outer whispers of the flock)
    const hash = Math.abs(Math.sin(cell.column * 127.1 + cell.row * 311.7));
    if (cell.tone < 0.42 && hash > 0.945) {
      const trailAngle = progress * Math.PI * 2 + cell.phase;
      const trailDist = (1.4 + Math.sin(trailAngle * 2) * 0.7) * size.cellWidth * 2.2;
      const trailX = x + Math.cos(trailAngle) * trailDist;
      const trailY = y - Math.sin(trailAngle) * size.cellHeight * 1.4;
      const trailGlyph = (cell.column + cell.row) % 2 === 0 ? "^" : "~";
      trails.push(
        renderStarlingVector(
          trailGlyph,
          trailX,
          trailY,
          size.cellWidth * 0.75,
          size.cellHeight * 0.75,
          style.secondaryColor || style.color,
          0.32,
        ),
      );
    }
  }

  // Corner brackets
  const inset = Math.max(8, Math.round(size.paddingX * 0.45));
  const bracketSize = Math.max(12, Math.min(22, Math.round(size.width * 0.03)));
  const cornerColor = style.secondaryColor || style.color;
  const corners = [
    `<path d="M ${inset + bracketSize} ${inset} L ${inset} ${inset} L ${inset} ${inset + bracketSize}" fill="none" stroke="${cornerColor}" stroke-width="1.5"/>`,
    `<path d="M ${size.width - inset - bracketSize} ${inset} L ${size.width - inset} ${inset} L ${size.width - inset} ${inset + bracketSize}" fill="none" stroke="${cornerColor}" stroke-width="1.5"/>`,
    `<path d="M ${inset} ${size.height - inset - bracketSize} L ${inset} ${size.height - inset} L ${inset + bracketSize} ${size.height - inset}" fill="none" stroke="${cornerColor}" stroke-width="1.5"/>`,
    `<path d="M ${size.width - inset} ${size.height - inset - bracketSize} L ${size.width - inset} ${size.height - inset} L ${size.width - inset - bracketSize} ${size.height - inset}" fill="none" stroke="${cornerColor}" stroke-width="1.5"/>`,
  ].join("");

  const hudHeader = `MURMURATION // ${style.label.toUpperCase()}`;
  const hudFrame = `BOIDS FLOCK [${String(frameIndex + 1).padStart(2, "0")}/${totalFrames}]`;
  const hudW = Math.max(5, Math.min(7.5, size.width * 0.012));
  const hudH = hudW * 1.45;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}">
  <rect width="100%" height="100%" fill="${style.backgroundColor}"/>
  <defs>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${style.glow * 0.75}" result="sharpBlur"/>
      <feGaussianBlur stdDeviation="${style.glow * 2}" result="wideBlur"/>
      <feMerge>
        <feMergeNode in="wideBlur" opacity="0.35"/>
        <feMergeNode in="sharpBlur" opacity="0.65"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <radialGradient id="skyVignette" cx="50%" cy="50%" r="72%">
      <stop offset="48%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="85%" stop-color="#000000" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.72"/>
    </radialGradient>
    <pattern id="scanlines" width="1" height="5" patternUnits="userSpaceOnUse">
      <rect y="0" width="1" height="1.2" fill="#000000" opacity="0.42"/>
    </pattern>
  </defs>
  <rect x="1" y="1" width="${size.width - 2}" height="${size.height - 2}" fill="none" stroke="${style.borderColor}" stroke-width="1.5"/>
  <g filter="url(#glow)">${nodes.join("")}</g>
  <g>${trails.join("")}</g>
  <rect width="100%" height="100%" fill="url(#scanlines)"/>
  <rect width="100%" height="100%" fill="url(#skyVignette)"/>
  ${corners}
  ${renderPixelText(hudHeader, inset + bracketSize + 6, inset + 4, hudW, hudH, style.secondaryColor || style.color, "left", 0.8)}
  ${renderPixelText(hudFrame, size.width - inset - bracketSize - 6, inset + 4, hudW, hudH, style.color, "right", 0.8)}
  ${renderPixelText("OCT.24.2001 // BIRD SWARM", inset + 8, size.height - inset - hudH - 4, hudW, hudH, style.color, "left", 0.8)}
  ${renderPixelText("ASCIILOGRAPH", size.width - inset - 8, size.height - inset - hudH - 4, hudW, hudH, style.secondaryColor || style.color, "right", 0.8)}
</svg>`;
}

function orientedDimensions(metadata: sharp.Metadata) {
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const swapsAxes = [5, 6, 7, 8].includes(metadata.orientation ?? 0);
  return swapsAxes ? { width: height, height: width } : { width, height };
}

export async function renderMurmurationPortrait(
  input: Buffer,
  requestedStyle?: string,
): Promise<RenderedMurmuration> {
  if (input.byteLength > MURMURATION_LIMITS.maxFileBytes) {
    throw new Error("Portrait is too large. Maximum size is 12 MB.");
  }

  const styleId: MurmurationStyleId = isMurmurationStyleId(requestedStyle ?? "")
    ? requestedStyle as MurmurationStyleId
    : "signal";
  const metadata = await sharp(input, { failOn: "none" }).metadata();
  const source = orientedDimensions(metadata);
  if (!source.width || !source.height) throw new Error("Could not read portrait dimensions.");
  const size = getMurmurationGridSize(source.width, source.height);
  const sample = await sharp(input, { failOn: "none" })
    .rotate()
    .resize(size.columns, size.rows, { fit: "fill", kernel: "lanczos3" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cells = buildMurmurationCells(sample.data, sample.info.width, sample.info.height);

  if (cells.length < 80) {
    throw new Error("This portrait has too little contrast. Try a clearer, brighter image with a visible subject.");
  }

  const workDir = await mkdtemp(path.join(tmpdir(), "ascii-murmuration-"));
  try {
    const framePattern = path.join(workDir, "frame-%04d.png");
    const outputPath = path.join(workDir, "asciilograph-murmuration.mp4");
    const frameCount = MURMURATION_LIMITS.durationSeconds * MURMURATION_LIMITS.fps;

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      const svg = renderFrame(cells, size, frameIndex, styleId);
      const png = await sharp(Buffer.from(svg)).png().toBuffer();
      const filename = framePattern.replace("%04d", String(frameIndex + 1).padStart(4, "0"));
      await writeFile(filename, png);
    }

    await runFfmpeg([
      "-y", "-framerate", String(MURMURATION_LIMITS.fps), "-i", framePattern,
      "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast",
      "-crf", "23", "-movflags", "+faststart", outputPath,
    ], workDir);

    const outputStat = await stat(outputPath);
    if (outputStat.size > 50 * 1024 * 1024) {
      throw new Error("Rendered MP4 is over Telegram's 50 MB limit.");
    }

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
