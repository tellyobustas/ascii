export const MURMURATION_LIMITS = {
  maxFileBytes: 12 * 1024 * 1024,
  durationSeconds: 4,
  fps: 12,
  outputWidth: 720,
  outputHeight: 1200,
  columns: 72,
  cellAspect: 0.56,
} as const;

export const MURMURATION_GLYPHS = " .,:;irsXA253hMHGS#9B&@";

export type MurmurationStyleId = "signal" | "ghost" | "shatter";

export const MURMURATION_STYLES: Record<
  MurmurationStyleId,
  { label: string; shortLabel: string; color: string; intensity: number; glow: number }
> = {
  signal: {
    label: "Signal portrait",
    shortLabel: "SIGNAL",
    color: "#00ff66",
    intensity: 0.34,
    glow: 1.35,
  },
  ghost: {
    label: "Pale ghost",
    shortLabel: "GHOST",
    color: "#d6ffe5",
    intensity: 0.2,
    glow: 0.7,
  },
  shatter: {
    label: "Broken signal",
    shortLabel: "SHATTER",
    color: "#71ffb2",
    intensity: 0.55,
    glow: 1.6,
  },
};

export type MurmurationGridSize = {
  cellHeight: number;
  cellWidth: number;
  columns: number;
  fontSize: number;
  height: number;
  paddingX: number;
  paddingY: number;
  rows: number;
  width: number;
};

export type MurmurationCell = {
  column: number;
  glyph: string;
  phase: number;
  row: number;
  tone: number;
};

export function getMurmurationGridSize(sourceWidth: number, sourceHeight: number): MurmurationGridSize {
  const aspect = Math.max(0.12, sourceWidth / Math.max(1, sourceHeight));
  const width = Math.floor(
    Math.min(MURMURATION_LIMITS.outputWidth, MURMURATION_LIMITS.outputHeight * aspect) / 2,
  ) * 2;
  const height = Math.floor((width / aspect) / 2) * 2;
  const paddingX = Math.max(18, Math.round(width * 0.035));
  const paddingY = Math.max(18, Math.round(height * 0.035));
  const columns = MURMURATION_LIMITS.columns;
  const cellWidth = (width - paddingX * 2) / columns;
  const fontSize = cellWidth / 0.61;
  const cellHeight = fontSize * 1.09;
  const rows = Math.max(12, Math.floor((height - paddingY * 2) / cellHeight));

  return {
    cellHeight,
    cellWidth,
    columns,
    fontSize,
    height,
    paddingX,
    paddingY: Math.max(paddingY, (height - rows * cellHeight) / 2),
    rows,
    width,
  };
}

function sampleBackground(data: ArrayLike<number>, width: number, height: number) {
  const samples: number[] = [];
  const patch = Math.max(1, Math.floor(Math.min(width, height) * 0.035));
  const corners = [
    [0, 0],
    [width - patch, 0],
    [0, height - patch],
    [width - patch, height - patch],
  ];

  for (const [left, top] of corners) {
    for (let y = top; y < top + patch; y += 1) {
      for (let x = left; x < left + patch; x += 1) {
        samples.push((data[y * width + x] ?? 0) / 255);
      }
    }
  }

  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)] ?? 0;
}

export function buildMurmurationCells(
  grayscale: ArrayLike<number>,
  width: number,
  height: number,
): MurmurationCell[] {
  const background = sampleBackground(grayscale, width, height);
  const differences = new Float32Array(width * height);

  for (let index = 0; index < differences.length; index += 1) {
    differences[index] = Math.abs((grayscale[index] ?? 0) / 255 - background);
  }

  const sorted = Array.from(differences).sort((a, b) => a - b);
  const highPoint = sorted[Math.floor(sorted.length * 0.965)] ?? 0.5;
  const contrastRange = Math.max(0.075, highPoint * 0.92);
  const cells: MurmurationCell[] = [];

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const index = row * width + column;
      const difference = differences[index] ?? 0;
      if (difference < Math.max(0.045, highPoint * 0.055)) continue;

      const localContrast = Math.min(1, difference / contrastRange);
      const left = differences[row * width + Math.max(0, column - 1)] ?? difference;
      const above = differences[Math.max(0, row - 1) * width + column] ?? difference;
      const edge = Math.min(1, (Math.abs(difference - left) + Math.abs(difference - above)) * 2.2);
      const tone = Math.max(0, Math.min(1, localContrast * 0.84 + edge * 0.16));
      const glyphIndex = Math.min(
        MURMURATION_GLYPHS.length - 1,
        Math.max(1, Math.round(tone * (MURMURATION_GLYPHS.length - 1))),
      );

      cells.push({
        column,
        glyph: MURMURATION_GLYPHS[glyphIndex] ?? "@",
        phase: ((column * 127.1 + row * 311.7) % 628) / 100,
        row,
        tone,
      });
    }
  }

  return cells;
}

export function getMurmurationMotion(
  cell: MurmurationCell,
  progress: number,
  styleId: MurmurationStyleId,
) {
  const style = MURMURATION_STYLES[styleId];
  const cycle = progress * Math.PI * 2;
  const phase = cell.phase;
  const flowX = Math.sin(cycle + cell.row * 0.085 + phase * 0.12);
  const flowY = Math.cos(cycle + cell.column * 0.072 + phase * 0.1);
  const edgeMobility = 0.35 + (1 - cell.tone) * 0.65;
  let dx = flowX * style.intensity * edgeMobility;
  const dy = flowY * style.intensity * edgeMobility * 0.52;
  let glyph = cell.glyph;

  if (styleId === "shatter") {
    const burst = Math.max(0, Math.sin(cycle * 3 - 0.9));
    const hash = Math.abs(Math.sin(cell.column * 41.7 + cell.row * 17.3));
    if (burst > 0.92 && hash > 0.91) {
      dx += Math.sign(flowX || 1) * burst * 1.8;
      glyph = "#$%*@+"[Math.floor(hash * 6)] ?? glyph;
    }
  }

  const shimmer = 0.9 + Math.sin(cycle * 2 + phase) * 0.08;
  return { dx, dy, glyph, opacity: shimmer * (0.5 + cell.tone * 0.5) };
}

export function isMurmurationStyleId(value: string): value is MurmurationStyleId {
  return Object.hasOwn(MURMURATION_STYLES, value);
}
