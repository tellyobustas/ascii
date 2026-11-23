import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import { resolveFfmpegPath } from "@/lib/ascii/ffmpeg-path";
import { renderVectorText } from "@/lib/ascii/vector-font";
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
  ${renderVectorText({ align: "left", charHeight: hudH, charWidth: hudW, color: style.secondaryColor || style.color, opacity: 0.8, text: hudHeader, x: inset + bracketSize + 6, y: inset + 4 })}
  ${renderVectorText({ align: "right", charHeight: hudH, charWidth: hudW, color: style.color, opacity: 0.8, text: hudFrame, x: size.width - inset - bracketSize - 6, y: inset + 4 })}
  ${renderVectorText({ align: "left", charHeight: hudH, charWidth: hudW, color: style.color, opacity: 0.8, text: "OCT.24.2001 // BIRD SWARM", x: inset + 8, y: size.height - inset - hudH - 4 })}
  ${renderVectorText({ align: "right", charHeight: hudH, charWidth: hudW, color: style.secondaryColor || style.color, opacity: 0.8, text: "ASCIILOGRAPH", x: size.width - inset - 8, y: size.height - inset - hudH - 4 })}
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
