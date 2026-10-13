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

function xml(value: string) {
  return value.replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[
      character
    ] ?? character,
  );
}

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

function renderFrame(
  cells: MurmurationCell[],
  size: MurmurationGridSize,
  frameIndex: number,
  styleId: MurmurationStyleId,
) {
  const style = MURMURATION_STYLES[styleId];
  const progress = frameIndex / (MURMURATION_LIMITS.durationSeconds * MURMURATION_LIMITS.fps);
  const nodes: string[] = [];
  const trails: string[] = [];

  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index];
    const motion = getMurmurationMotion(cell, progress, styleId);
    const x = size.paddingX + (cell.column + 0.5 + motion.dx) * size.cellWidth;
    const y = size.paddingY + (cell.row + 0.82 + motion.dy) * size.cellHeight;
    const opacity = Math.min(0.98, 0.28 + motion.opacity * 0.68);
    nodes.push(
      `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" opacity="${opacity.toFixed(3)}">${xml(motion.glyph)}</text>`,
    );

    // A small number of dim edge glyphs detach and rejoin the same silhouette.
    const hash = Math.abs(Math.sin(cell.column * 127.1 + cell.row * 311.7));
    if (cell.tone < 0.48 && hash > 0.968) {
      const drift = Math.sin(progress * Math.PI * 2 + cell.phase);
      const echoX = x + drift * size.cellWidth * 2.1;
      const echoY = y - Math.cos(progress * Math.PI * 2 + cell.phase) * size.cellHeight * 1.15;
      trails.push(
        `<text x="${echoX.toFixed(2)}" y="${echoY.toFixed(2)}" font-size="${(size.fontSize * 0.78).toFixed(2)}" opacity="0.22">${xml(motion.glyph)}</text>`,
      );
    }
  }

  const scanlines = Array.from({ length: Math.floor(size.height / 8) }, (_, index) =>
    `<rect y="${index * 8}" width="${size.width}" height="1"/>`,
  ).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}">
  <rect width="100%" height="100%" fill="#000000"/>
  <defs>
    <filter id="glow" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="${style.glow}" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <g fill="${style.color}" font-family="monospace" font-size="${size.fontSize.toFixed(2)}" text-anchor="middle" filter="url(#glow)">${nodes.join("")}</g>
  <g fill="${style.color}" font-family="monospace" text-anchor="middle">${trails.join("")}</g>
  <g fill="#ffffff" opacity="0.035">${scanlines}</g>
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
