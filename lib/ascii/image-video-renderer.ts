import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import {
  BRAILLE_UNICODE_OFFSET,
  IMAGE_ASCII_PRESETS,
  IMAGE_LIMITS,
  brailleBitsToChar,
  type ImageAsciiPresetId,
} from "@/lib/ascii/image";
import {
  prepareImageAsciiFrame,
  renderAsciiFrameToSvg,
  type PreparedAsciiImageFrame,
  type RenderImageAsciiOptions,
  type Rgb,
} from "@/lib/ascii/image-renderer";

export type RenderedAsciiImageVideo = {
  asciiText: string;
  durationSeconds: number;
  fileName: string;
  fps: number;
  height: number;
  mimeType: "video/mp4";
  mp4: Buffer;
  presetId: ImageAsciiPresetId;
  renderedFrames: number;
  width: number;
};

const IMAGE_VIDEO_DURATION_SECONDS = 4;
const IMAGE_VIDEO_FPS = 10;
const MAX_OUTPUT_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_DIMENSION = 720;
const GLITCH_GLYPHS = "#$%*@01+<>[]{}";
const GLITCH_COLORS: Rgb[] = [
  { b: 102, g: 255, r: 0 },
  { b: 210, g: 255, r: 190 },
  { b: 242, g: 242, r: 242 },
  { b: 180, g: 230, r: 60 },
];

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

function random(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;

  return value - Math.floor(value);
}

function svgNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "0";
}

function shiftTextLine(line: string, shift: number) {
  if (shift === 0) return line;

  const spaces = " ".repeat(Math.abs(shift));

  return shift > 0
    ? spaces + line.slice(0, Math.max(0, line.length - shift))
    : line.slice(Math.abs(shift)) + spaces;
}

function shiftColorLine(
  colors: Array<Rgb | undefined> | undefined,
  shift: number,
  width: number,
) {
  if (!colors) return undefined;
  if (shift === 0) return colors.slice(0, width);

  const nextColors = new Array<Rgb | undefined>(width);

  for (let index = 0; index < width; index += 1) {
    const sourceIndex = index - shift;
    nextColors[index] =
      sourceIndex >= 0 && sourceIndex < colors.length
        ? colors[sourceIndex]
        : undefined;
  }

  return nextColors;
}

function mutateBrailleCharacter(character: string, seed: number) {
  const bits = character.charCodeAt(0) - BRAILLE_UNICODE_OFFSET;

  if (bits <= 0 || bits > 0xff) return character;

  const flipBit = 1 << Math.floor(random(seed) * 8);
  const nextBits = bits ^ flipBit;

  return brailleBitsToChar(nextBits);
}

function mutateColor(
  color: Rgb | undefined,
  frameIndex: number,
  rowIndex: number,
  columnIndex: number,
  seed: number,
) {
  const noise = random(seed + frameIndex * 37.7 + rowIndex * 11.3 + columnIndex);

  if (noise > 0.035) return color;

  return GLITCH_COLORS[
    Math.floor(random(seed + columnIndex * 8.17 + frameIndex) * GLITCH_COLORS.length)
  ];
}

function makeGlitchedFrame(
  frame: PreparedAsciiImageFrame,
  frameIndex: number,
  totalFrames: number,
  seed: number,
) {
  const preset = IMAGE_ASCII_PRESETS[frame.presetId];
  const isBraille = preset.mode === "blocks-braille";
  const progress = frameIndex / Math.max(1, totalFrames - 1);
  const pulse = 0.5 + 0.5 * Math.sin(progress * Math.PI * 10);
  const corruptionRate = isBraille ? 0.014 + pulse * 0.028 : 0.012 + pulse * 0.045;
  const maxColumns = Math.max(...frame.lines.map((line) => line.length), 1);
  const dropoutActive = random(seed + frameIndex * 5.91) > 0.78;
  const dropoutRow = Math.floor(random(seed + frameIndex * 6.37) * frame.lines.length);
  const dropoutWidth = Math.max(4, Math.floor(maxColumns * (0.08 + pulse * 0.16)));
  const dropoutStart = Math.floor(
    random(seed + frameIndex * 7.23) * Math.max(1, maxColumns - dropoutWidth),
  );
  const lines: string[] = [];
  const colors: Array<Array<Rgb | undefined>> | undefined = frame.colors
    ? []
    : undefined;

  for (let rowIndex = 0; rowIndex < frame.lines.length; rowIndex += 1) {
    const line = frame.lines[rowIndex] || " ";
    const rowBurst = random(seed + frameIndex * 17.1 + rowIndex * 2.3) > 0.88;
    const shift = rowBurst
      ? Math.round((random(seed + frameIndex * 3.9 + rowIndex) - 0.5) * 7)
      : 0;
    const shiftedLine = shiftTextLine(line, shift);
    const shiftedColors = shiftColorLine(frame.colors?.[rowIndex], shift, line.length);
    const nextChars = Array.from(shiftedLine);
    const nextColors = shiftedColors ? shiftedColors.slice() : undefined;

    for (let columnIndex = 0; columnIndex < nextChars.length; columnIndex += 1) {
      const character = nextChars[columnIndex] ?? " ";
      const inDropoutBand =
        dropoutActive &&
        Math.abs(rowIndex - dropoutRow) <= 1 &&
        columnIndex >= dropoutStart &&
        columnIndex <= dropoutStart + dropoutWidth;
      const cellNoise = random(
        seed + frameIndex * 101.7 + rowIndex * 19.19 + columnIndex * 3.71,
      );

      if (character !== " " && (cellNoise < corruptionRate || inDropoutBand)) {
        if (isBraille) {
          nextChars[columnIndex] =
            inDropoutBand && cellNoise > 0.35
              ? brailleBitsToChar(0)
              : mutateBrailleCharacter(
                  character,
                  seed + frameIndex * 13.7 + rowIndex + columnIndex,
                );
        } else {
          const glyphIndex = Math.floor(
            random(seed + frameIndex * 23.3 + columnIndex * 5.7) *
              GLITCH_GLYPHS.length,
          );

          nextChars[columnIndex] = inDropoutBand
            ? " "
            : GLITCH_GLYPHS[glyphIndex] ?? "#";
        }
      }

      if (nextColors) {
        nextColors[columnIndex] = mutateColor(
          nextColors[columnIndex],
          frameIndex,
          rowIndex,
          columnIndex,
          seed,
        );
      }
    }

    lines.push(nextChars.join(""));

    if (colors && nextColors) {
      colors.push(nextColors);
    }
  }

  return {
    ...frame,
    colors,
    lines,
  };
}

function renderGlitchOverlay(
  width: number,
  height: number,
  frameIndex: number,
  totalFrames: number,
  seed: number,
) {
  const progress = frameIndex / Math.max(1, totalFrames - 1);
  const opacity = 0.08 + 0.1 * Math.sin(progress * Math.PI * 12) ** 2;
  const bandCount = random(seed + frameIndex * 2.71) > 0.72 ? 3 : 1;
  const parts: string[] = [];

  for (let index = 0; index < bandCount; index += 1) {
    const y = random(seed + frameIndex * 8.13 + index * 19.2) * height;
    const bandHeight = 1 + random(seed + frameIndex + index * 31.1) * 8;
    const x = (random(seed + frameIndex * 4.4 + index) - 0.5) * 18;
    const fill = index % 2 === 0 ? "#00ff66" : "#f2f2f2";

    parts.push(
      `<rect x="${svgNumber(x)}" y="${svgNumber(y)}" width="${svgNumber(
        width + 36,
      )}" height="${svgNumber(bandHeight)}" fill="${fill}" opacity="${svgNumber(
        opacity,
      )}"/>`,
    );
  }

  return `<g style="mix-blend-mode:screen">${parts.join("\n")}</g>`;
}

async function writePngFrame(
  svg: string,
  outputPath: string,
  dimensions: { height: number; width: number },
) {
  const png = await sharp(Buffer.from(svg))
    .resize({
      fit: "inside",
      height: MAX_VIDEO_DIMENSION,
      width: MAX_VIDEO_DIMENSION,
      withoutEnlargement: true,
    })
    .png()
    .toBuffer({ resolveWithObject: true });

  dimensions.width = png.info.width;
  dimensions.height = png.info.height;

  await writeFile(outputPath, png.data);
}

export async function renderImageToAsciiGlitchVideo(
  input: Buffer,
  options: RenderImageAsciiOptions = {},
): Promise<RenderedAsciiImageVideo> {
  if (input.byteLength > IMAGE_LIMITS.maxFileBytes) {
    throw new Error("Image file is too large. Maximum size is 12 MB.");
  }

  const frame = await prepareImageAsciiFrame(input, options);
  const totalFrames = IMAGE_VIDEO_DURATION_SECONDS * IMAGE_VIDEO_FPS;
  const seed = Math.random() * 10000;
  const workDir = await mkdtemp(path.join(tmpdir(), "ascii-image-video-"));
  const outputDimensions = {
    height: 0,
    width: 0,
  };

  try {
    const framePattern = path.join(workDir, "frame-%04d.png");
    const outputPath = path.join(workDir, "ascii-image-glitch.mp4");

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
      const glitchedFrame = makeGlitchedFrame(
        frame,
        frameIndex,
        totalFrames,
        seed,
      );
      const baseSvg = renderAsciiFrameToSvg(glitchedFrame);
      const overlay = renderGlitchOverlay(
        baseSvg.width,
        baseSvg.height,
        frameIndex,
        totalFrames,
        seed,
      );
      const svg = renderAsciiFrameToSvg(glitchedFrame, { overlay });

      await writePngFrame(
        svg.svg,
        framePattern.replace("%04d", String(frameIndex + 1).padStart(4, "0")),
        outputDimensions,
      );
    }

    await runFfmpeg([
      "-y",
      "-framerate",
      String(IMAGE_VIDEO_FPS),
      "-i",
      framePattern,
      "-t",
      String(IMAGE_VIDEO_DURATION_SECONDS),
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
      throw new Error("Rendered MP4 is over 50 MB. Try a smaller image preset.");
    }

    const mp4 = await readFile(outputPath);

    return {
      asciiText: frame.asciiText,
      durationSeconds: IMAGE_VIDEO_DURATION_SECONDS,
      fileName: "ascii-image-glitch.mp4",
      fps: IMAGE_VIDEO_FPS,
      height: outputDimensions.height,
      mimeType: "video/mp4",
      mp4,
      presetId: frame.presetId,
      renderedFrames: totalFrames,
      width: outputDimensions.width,
    };
  } finally {
    await rm(workDir, {
      force: true,
      recursive: true,
    });
  }
}
