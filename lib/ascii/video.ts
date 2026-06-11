export const VIDEO_RENDER_LIMITS = {
  maxDurationSeconds: 15,
  maxOutputWidth: 480,
  defaultFps: 8,
} as const;

export const VIDEO_RENDER_MODES = [
  "ascii-animation",
  "bitmap-animation",
  "bayer-dither-animation",
  "matrix-green-animation",
  "white-terminal-animation",
] as const;

export type VideoRenderMode = (typeof VIDEO_RENDER_MODES)[number];
