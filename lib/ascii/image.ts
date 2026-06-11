export const IMAGE_RENDER_MODES = [
  "ascii-png",
  "1-bit-bitmap",
  "bayer-dither",
  "floyd-steinberg-dither",
  "blocks-braille",
  "matrix-green",
  "white-terminal",
] as const;

export type ImageRenderMode = (typeof IMAGE_RENDER_MODES)[number];
