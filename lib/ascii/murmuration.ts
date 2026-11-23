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

export type MurmurationStyleId =
  | "starling"
  | "cyber"
  | "solar"
  | "signal"
  | "ghost"
  | "shatter";

export const MURMURATION_STYLES: Record<
  MurmurationStyleId,
  {
    backgroundColor: string;
    borderColor: string;
    color: string;
    glow: number;
    intensity: number;
    label: string;
    secondaryColor: string;
    shortLabel: string;
  }
> = {
  starling: {
    label: "Starling flock",
    shortLabel: "STARLING",
    color: "#00f0ff",
    secondaryColor: "#b388ff",
    backgroundColor: "#050814",
    borderColor: "rgba(0, 240, 255, 0.4)",
    intensity: 0.62,
    glow: 1.5,
  },
  cyber: {
    label: "Cyber swarm",
    shortLabel: "CYBER",
    color: "#ccff00",
    secondaryColor: "#ff007f",
    backgroundColor: "#0c0317",
    borderColor: "rgba(204, 255, 0, 0.45)",
    intensity: 0.72,
    glow: 1.7,
  },
  solar: {
    label: "Golden dawn",
    shortLabel: "SOLAR",
    color: "#ffb700",
    secondaryColor: "#ff5500",
    backgroundColor: "#0f0701",
    borderColor: "rgba(255, 183, 0, 0.45)",
    intensity: 0.58,
    glow: 1.45,
  },
  signal: {
    label: "Matrix signal",
    shortLabel: "SIGNAL",
    color: "#00ff66",
    secondaryColor: "#86ffb2",
    backgroundColor: "#020704",
    borderColor: "rgba(0, 255, 102, 0.35)",
    intensity: 0.45,
    glow: 1.35,
  },
  ghost: {
    label: "Pale ghost",
    shortLabel: "GHOST",
    color: "#e0f7fa",
    secondaryColor: "#80deea",
    backgroundColor: "#05090c",
    borderColor: "rgba(224, 247, 250, 0.35)",
    intensity: 0.36,
    glow: 1.1,
  },
  shatter: {
    label: "Broken signal",
    shortLabel: "SHATTER",
    color: "#71ffb2",
    secondaryColor: "#ff0055",
    backgroundColor: "#050805",
    borderColor: "rgba(113, 255, 178, 0.4)",
    intensity: 0.68,
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
  const style = MURMURATION_STYLES[styleId] ?? MURMURATION_STYLES.signal;
  const cycle = progress * Math.PI * 2;
  const phase = cell.phase;

  // 1. Sweeping macro-vortex of the flock (large banking maneuvers)
  const macroX = Math.sin(cycle) * 1.5 + Math.cos(cycle * 2) * 0.5;
  const macroY = Math.cos(cycle) * 1.0 + Math.sin(cycle * 2) * 0.35;

  // 2. Transverse flock waves (density ripple through bird neighbors)
  const waveAngle = cycle + (cell.column * 0.09 - cell.row * 0.07);
  const rippleX = Math.sin(waveAngle * 2 + phase * 0.2) * 0.85;
  const rippleY = Math.cos(waveAngle * 2 + phase * 0.2) * 0.55;

  // 3. Turbulent boids vortex around contours
  const eddyAngle = cycle * 2 + phase + cell.row * 0.12;
  const eddyRadius = (0.25 + Math.pow(1 - cell.tone, 1.2) * 0.75) * style.intensity;
  const eddyX = Math.cos(eddyAngle) * eddyRadius;
  const eddyY = Math.sin(eddyAngle) * eddyRadius * 0.7;

  // 4. Flock breathing (natural expansion & compression of swarm)
  const pulse = 1.0 + Math.sin(cycle * 2) * 0.18;
  const edgeMobility = 0.3 + Math.pow(1 - cell.tone, 1.3) * 1.4;

  const dx = (macroX * 0.4 + rippleX * 0.5 + eddyX) * style.intensity * edgeMobility * pulse;
  const dy = (macroY * 0.35 + rippleY * 0.45 + eddyY) * style.intensity * edgeMobility * pulse * 0.75;

  // 5. Flight velocity direction for banking
  const dCycle = 0.06;
  const nextMacroX = Math.sin(cycle + dCycle) * 1.5 + Math.cos((cycle + dCycle) * 2) * 0.5;
  const nextWaveX = Math.sin((waveAngle + dCycle) * 2 + phase * 0.2) * 0.85;
  const vx = (nextMacroX - macroX) * 0.4 + (nextWaveX - rippleX) * 0.5;

  // 6. Wing-beat stroke cycle (flapping bird wings)
  const wingBeat = Math.sin(cycle * 6 + phase * 2.5 + cell.column * 0.15);

  let glyph = cell.glyph;
  const isDenseCore = cell.tone > 0.62;
  const isOuterWhisp = cell.tone < 0.32;

  if (styleId === "shatter") {
    const burst = Math.max(0, Math.sin(cycle * 3 - 0.9));
    const hash = Math.abs(Math.sin(cell.column * 41.7 + cell.row * 17.3));
    if (burst > 0.88 && hash > 0.88) {
      const glitchChars = "#$%*@+^v<>";
      glyph = glitchChars[Math.floor(hash * glitchChars.length)] ?? glyph;
    }
  } else if (isOuterWhisp) {
    // Lone starlings banking and gliding in outer ribbons
    if (wingBeat > 0.45) {
      glyph = "^"; // Wings up
    } else if (wingBeat > 0.15) {
      glyph = vx < -0.05 ? "/" : vx > 0.05 ? "\\" : "~"; // Banking turn
    } else if (wingBeat > -0.25) {
      glyph = "-"; // Glide
    } else if (wingBeat > -0.6) {
      glyph = "v"; // Wings down
    } else {
      glyph = "."; // Speck
    }
  } else if (!isDenseCore) {
    // Mid-density flock: bird silhouettes
    if (wingBeat > 0.4) {
      glyph = "^";
    } else if (wingBeat > 0.0) {
      glyph = vx < -0.04 ? "<" : vx > 0.04 ? ">" : "x";
    } else if (wingBeat > -0.4) {
      glyph = "v";
    } else {
      glyph = "+";
    }
  } else {
    // Dense flock core: tight cluster
    const coreFlock = "*#@%&8BM";
    const coreIndex = Math.min(
      coreFlock.length - 1,
      Math.floor(cell.tone * coreFlock.length),
    );
    glyph = coreFlock[coreIndex] ?? "#";
  }

  let color = style.color;
  if (style.secondaryColor && (cell.tone < 0.42 || Math.abs(wingBeat) > 0.72)) {
    const sheenBlend = Math.sin(cycle * 2 + cell.column * 0.2 + phase);
    if (sheenBlend > 0.32) {
      color = style.secondaryColor;
    }
  }

  const shimmer = 0.88 + Math.sin(cycle * 4 + phase) * 0.12;
  const opacity = shimmer * (0.42 + cell.tone * 0.58);

  return {
    color,
    dx,
    dy,
    glyph,
    opacity,
  };
}

export function isMurmurationStyleId(value: string): value is MurmurationStyleId {
  return Object.hasOwn(MURMURATION_STYLES, value);
}
