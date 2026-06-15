export const VIDEO_RENDER_LIMITS = {
  maxInputFileBytes: 40 * 1024 * 1024,
  maxDurationSeconds: 15,
  maxOutputWidth: 480,
  maxOutputBytes: 50 * 1024 * 1024,
  defaultFps: 10,
  defaultWidth: 240,
  fpsOptions: [6, 8, 10, 12],
  widthOptions: [240, 360, 480],
  stripAudio: true,
} as const;

export const VIDEO_RENDER_MODES = [
  "ascii-animation",
  "bitmap-animation",
  "bayer-dither-animation",
  "matrix-green-animation",
  "white-terminal-animation",
] as const;

export type VideoRenderMode = (typeof VIDEO_RENDER_MODES)[number];

export const VIDEO_JOB_STAGES = [
  "queued",
  "probing",
  "extracting-frames",
  "rendering-ascii",
  "encoding-mp4",
  "sending",
  "done",
  "error",
] as const;

export type VideoJobStage = (typeof VIDEO_JOB_STAGES)[number];

export const VIDEO_ASCII_CONTAINER = {
  audioPolicy: "strip-for-telegram",
  extension: ".ascii.json",
  frameSeparator: "=",
  stores: ["metadata", "frames", "renderSettings"],
  version: 1,
} as const;

export const VIDEO_ASCII_PRESETS = {
  matrixPulse: {
    label: "Matrix pulse",
    shortLabel: "MATRIX",
    mode: "matrix-green-animation",
    width: 240,
    fps: 10,
    characterSet: "terminal",
    contrast: 1.22,
    density: 1.04,
    glow: false,
    dither: "none",
    notes: [
      "green terminal output",
      "fast preview preset",
      "keeps Telegram file size low",
    ],
  },
  telegramLoop: {
    label: "Telegram loop",
    shortLabel: "LOOP",
    mode: "ascii-animation",
    width: 360,
    fps: 8,
    characterSet: "standard",
    contrast: 1.14,
    density: 1,
    glow: false,
    dither: "none",
    notes: [
      "silent H.264 MP4",
      "small frame budget",
      "sendAnimation first",
    ],
  },
  bayerMotion: {
    label: "Bayer motion",
    shortLabel: "BAYER",
    mode: "bayer-dither-animation",
    width: 480,
    fps: 8,
    characterSet: "shadedBlocks",
    contrast: 1.12,
    density: 1,
    glow: false,
    dither: "bayer",
    notes: [
      "ordered dither for temporal stability",
      "safe for short high-contrast clips",
      "best candidate for MVP video",
    ],
  },
  brailleMotion: {
    label: "Braille motion",
    shortLabel: "BRAILLE",
    mode: "bitmap-animation",
    width: 360,
    fps: 8,
    characterSet: "fine",
    contrast: 1.1,
    density: 0.88,
    glow: false,
    dither: "threshold",
    notes: [
      "2x4 cell look for detail",
      "lower shimmer than dense ASCII",
      "good for faces and objects",
    ],
  },
} as const satisfies Record<
  string,
  {
    characterSet: string;
    contrast: number;
    density: number;
    dither: "bayer" | "none" | "threshold";
    fps: (typeof VIDEO_RENDER_LIMITS.fpsOptions)[number];
    glow: boolean;
    label: string;
    mode: VideoRenderMode;
    notes: readonly string[];
    shortLabel: string;
    width: (typeof VIDEO_RENDER_LIMITS.widthOptions)[number];
  }
>;

export type VideoAsciiPresetId = keyof typeof VIDEO_ASCII_PRESETS;

export function isVideoAsciiPresetId(
  preset: string,
): preset is VideoAsciiPresetId {
  return Object.hasOwn(VIDEO_ASCII_PRESETS, preset);
}

export function buildVideoJobPlan(options: {
  durationSeconds: number;
  fps?: number;
  presetId?: string;
  width?: number;
}) {
  const presetId = options.presetId ?? "";
  const preset = isVideoAsciiPresetId(presetId)
    ? VIDEO_ASCII_PRESETS[presetId]
    : VIDEO_ASCII_PRESETS.matrixPulse;
  const fps = VIDEO_RENDER_LIMITS.fpsOptions.includes(
    options.fps as (typeof VIDEO_RENDER_LIMITS.fpsOptions)[number],
  )
    ? (options.fps as (typeof VIDEO_RENDER_LIMITS.fpsOptions)[number])
    : preset.fps;
  const width = VIDEO_RENDER_LIMITS.widthOptions.includes(
    options.width as (typeof VIDEO_RENDER_LIMITS.widthOptions)[number],
  )
    ? (options.width as (typeof VIDEO_RENDER_LIMITS.widthOptions)[number])
    : preset.width;
  const durationSeconds = Math.max(0, options.durationSeconds);
  const estimatedFrames = Math.ceil(durationSeconds * fps);

  return {
    durationSeconds,
    estimatedFrames,
    fps,
    isAllowed: durationSeconds <= VIDEO_RENDER_LIMITS.maxDurationSeconds,
    output: {
      audio: "none",
      codec: "libx264",
      container: "mp4",
      movflags: "+faststart",
      pixFmt: "yuv420p",
    },
    preset,
    stages: VIDEO_JOB_STAGES,
    width,
  };
}
