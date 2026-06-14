import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { renderImageToAsciiPng } from "@/lib/ascii/image-renderer";
import {
  VIDEO_ASCII_PRESETS,
  VIDEO_RENDER_LIMITS,
  buildVideoJobPlan,
  isVideoAsciiPresetId,
  type VideoAsciiPresetId,
} from "@/lib/ascii/video";

export type RenderVideoAsciiOptions = {
  fps?: number;
  presetId?: string;
  width?: number;
};

export type RenderedAsciiVideo = {
  durationSeconds: number;
  estimatedFrames: number;
  fileName: string;
  mimeType: "video/mp4";
  mp4: Buffer;
  presetId: VideoAsciiPresetId;
  renderedFrames: number;
  sourceDurationSeconds: number;
  wasTrimmed: boolean;
};

const VIDEO_TO_IMAGE_PRESET: Record<VideoAsciiPresetId, string> = {
  bayerMotion: "bayerDither",
  brailleMotion: "brailleMono",
  matrixPulse: "matrixAscii",
  telegramLoop: "matrixAscii",
};

function getFfmpegPath() {
  return process.platform === "win32"
    ? "node_modules/ffmpeg-static/ffmpeg.exe"
    : "node_modules/ffmpeg-static/ffmpeg";
}

type FfmpegResult = {
  stderr: string;
  stdout: string;
};

function errorOutputToString(error: unknown, field: "stderr" | "stdout") {
  if (!error || typeof error !== "object" || !(field in error)) return "";

  const output = (error as Record<string, unknown>)[field];

  if (typeof output === "string") return output;
  if (Buffer.isBuffer(output)) return output.toString("utf8");

  return "";
}

function errorMessageToString(error: unknown) {
  return error instanceof Error ? error.message : "";
}

function execFfmpeg(args: string[], cwd?: string): Promise<FfmpegResult> {
  return new Promise((resolve, reject) => {
    execFile(
      getFfmpegPath(),
      args,
      {
        cwd,
        maxBuffer: 1024 * 1024 * 16,
        timeout: 1000 * 60 * 3,
      },
      (error, stdout, stderr) => {
        const result = {
          stderr: String(stderr ?? ""),
          stdout: String(stdout ?? ""),
        };

        if (error) {
          const wrappedError = Object.assign(new Error(error.message), result);
          reject(wrappedError);
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

async function readFfmpegProbe(inputPath: string) {
  try {
    return await execFfmpeg(["-hide_banner", "-i", inputPath]);
  } catch (error) {
    return {
      stderr: errorOutputToString(error, "stderr") || errorMessageToString(error),
      stdout: errorOutputToString(error, "stdout"),
    };
  }
}

async function readVideoInfo(inputPath: string) {
  const probe = await readFfmpegProbe(inputPath);
  const output = probe.stderr || probe.stdout;
  const durationMatch = output.match(
    /Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/,
  );

  if (!durationMatch) {
    throw new Error(
      "Could not read video duration. " +
        output.split("\n").filter(Boolean).slice(0, 4).join(" "),
    );
  }

  const hours = Number(durationMatch[1]);
  const minutes = Number(durationMatch[2]);
  const seconds = Number(durationMatch[3]);

  return {
    durationSeconds: hours * 3600 + minutes * 60 + seconds,
  };
}

function normalizePresetId(presetId?: string): VideoAsciiPresetId {
  const requestedPresetId = presetId ?? "";

  return isVideoAsciiPresetId(requestedPresetId)
    ? requestedPresetId
    : "telegramLoop";
}

async function listPngFrames(directory: string, prefix: string) {
  const entries = await readdir(directory);

  return entries
    .filter((entry) => entry.startsWith(prefix) && entry.endsWith(".png"))
    .sort()
    .map((entry) => path.join(directory, entry));
}

export async function renderVideoToAsciiMp4(
  input: Buffer,
  options: RenderVideoAsciiOptions = {},
): Promise<RenderedAsciiVideo> {
  if (input.byteLength > VIDEO_RENDER_LIMITS.maxInputFileBytes) {
    throw new Error("Video file is too large. Maximum size is 40 MB.");
  }

  const presetId = normalizePresetId(options.presetId);
  const preset = VIDEO_ASCII_PRESETS[presetId];
  const workDir = await mkdtemp(path.join(tmpdir(), "ascii-video-"));

  try {
    const inputPath = path.join(workDir, "input-video.mp4");
    const framePattern = path.join(workDir, "source-%04d.png");
    const renderedPattern = path.join(workDir, "rendered-%04d.png");
    const outputPath = path.join(workDir, "ascii-output.mp4");
    await writeFile(inputPath, input);

    const info = await readVideoInfo(inputPath);
    const renderDurationSeconds = Math.min(
      info.durationSeconds,
      VIDEO_RENDER_LIMITS.maxDurationSeconds,
    );
    const plan = buildVideoJobPlan({
      durationSeconds: renderDurationSeconds,
      fps: options.fps,
      presetId,
      width: options.width,
    });

    if (!plan.isAllowed) {
      throw new Error("Video is too long. Please trim it to 15 seconds or less.");
    }

    await runFfmpeg([
      "-y",
      "-i",
      inputPath,
      "-t",
      String(renderDurationSeconds),
      "-vf",
      `fps=${plan.fps},scale=${plan.width}:-2:force_original_aspect_ratio=decrease`,
      "-an",
      framePattern,
    ]);

    const frames = await listPngFrames(workDir, "source-");

    if (frames.length === 0) {
      throw new Error("Could not extract video frames.");
    }

    for (let index = 0; index < frames.length; index += 1) {
      const frame = await readFile(frames[index]);
      const rendered = await renderImageToAsciiPng(frame, {
        presetId: VIDEO_TO_IMAGE_PRESET[presetId],
        width: preset.width === 480 ? 100 : 82,
      });
      await writeFile(
        renderedPattern.replace("%04d", String(index + 1).padStart(4, "0")),
        rendered.png,
      );
    }

    await runFfmpeg([
      "-y",
      "-framerate",
      String(plan.fps),
      "-i",
      renderedPattern,
      "-vf",
      `scale=${plan.width}:-2:flags=lanczos,format=yuv420p`,
      "-an",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-preset",
      "veryfast",
      "-crf",
      "28",
      "-movflags",
      "+faststart",
      outputPath,
    ]);

    const outputStat = await stat(outputPath);

    if (outputStat.size > VIDEO_RENDER_LIMITS.maxOutputBytes) {
      throw new Error("Rendered MP4 is over 50 MB. Try lower width or FPS.");
    }

    const mp4 = await readFile(outputPath);

    return {
      durationSeconds: renderDurationSeconds,
      estimatedFrames: plan.estimatedFrames,
      fileName: "ascii-animation.mp4",
      mimeType: "video/mp4",
      mp4,
      presetId,
      renderedFrames: frames.length,
      sourceDurationSeconds: info.durationSeconds,
      wasTrimmed: info.durationSeconds > VIDEO_RENDER_LIMITS.maxDurationSeconds,
    };
  } finally {
    await rm(workDir, {
      force: true,
      recursive: true,
    });
  }
}
