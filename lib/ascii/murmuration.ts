export const MURMURATION_LIMITS = {
  maxFileBytes: 12 * 1024 * 1024,
  durationSeconds: 4,
  fps: 12,
  outputSize: 720,
} as const;

export const MURMURATION_GLYPHS = ".'`^~:+*xo01#%@$";

export type MurmurationStyleId = "signal" | "ghost" | "shatter";

export const MURMURATION_STYLES: Record<
  MurmurationStyleId,
  { label: string; shortLabel: string; color: string; intensity: number }
> = {
  signal: {
    label: "Signal portrait",
    shortLabel: "SIGNAL",
    color: "#00ff66",
    intensity: 1,
  },
  ghost: {
    label: "Pale ghost",
    shortLabel: "GHOST",
    color: "#d6ffe5",
    intensity: 0.72,
  },
  shatter: {
    label: "Broken signal",
    shortLabel: "SHATTER",
    color: "#71ffb2",
    intensity: 1.45,
  },
};

export function isMurmurationStyleId(value: string): value is MurmurationStyleId {
  return Object.hasOwn(MURMURATION_STYLES, value);
}
