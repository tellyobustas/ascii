export type FitAsciiTextOptions = {
  align?: "left" | "center" | "right";
  charAspectRatio?: number;
  letterSpacing?: number;
  lineHeightRatio?: number;
  maxFontSize?: number;
  minFontSize?: number;
  padding: number;
  verticalAlign?: "top" | "middle" | "bottom";
};

export type FitAsciiTextResult = {
  align: "left" | "center" | "right";
  fontSize: number;
  lineHeight: number;
  x: number;
  y: number;
  renderedWidth: number;
  renderedHeight: number;
  fittedLines: string[];
};

function measureLines(
  lines: string[],
  fontSize: number,
  lineHeightRatio: number,
  letterSpacing: number,
  charAspectRatio: number,
) {
  const maxCharacters = Math.max(1, ...lines.map((line) => line.length));
  const charWidth = fontSize * charAspectRatio + letterSpacing;
  const renderedWidth = Math.max(0, maxCharacters * charWidth - letterSpacing);
  const lineHeight = fontSize * lineHeightRatio;
  const renderedHeight = lines.length * lineHeight;

  return {
    lineHeight,
    renderedHeight,
    renderedWidth,
  };
}

function wrapLines(lines: string[], maxCharacters: number) {
  return lines.flatMap((line) => {
    if (line.length <= maxCharacters) return [line];

    const chunks: string[] = [];
    for (let index = 0; index < line.length; index += maxCharacters) {
      chunks.push(line.slice(index, index + maxCharacters));
    }

    return chunks;
  });
}

export function fitAsciiTextToCanvas(
  asciiText: string,
  canvasWidth: number,
  canvasHeight: number,
  options: FitAsciiTextOptions,
): FitAsciiTextResult {
  const align = options.align ?? "center";
  const verticalAlign = options.verticalAlign ?? "middle";
  const minFontSize = options.minFontSize ?? 10;
  const maxFontSize = options.maxFontSize ?? 56;
  const lineHeightRatio = options.lineHeightRatio ?? 1.12;
  const letterSpacing = options.letterSpacing ?? 0;
  const charAspectRatio = options.charAspectRatio ?? 0.62;
  const availableWidth = Math.max(1, canvasWidth - options.padding * 2);
  const availableHeight = Math.max(1, canvasHeight - options.padding * 2);
  let fittedLines = asciiText.replace(/\s+$/g, "").split("\n");
  let fontSize = minFontSize;
  let renderedWidth = 0;
  let renderedHeight = 0;
  let lineHeight = minFontSize * lineHeightRatio;

  for (let size = maxFontSize; size >= minFontSize; size -= 1) {
    const measured = measureLines(
      fittedLines,
      size,
      lineHeightRatio,
      letterSpacing,
      charAspectRatio,
    );

    if (
      measured.renderedWidth <= availableWidth &&
      measured.renderedHeight <= availableHeight
    ) {
      fontSize = size;
      lineHeight = measured.lineHeight;
      renderedWidth = measured.renderedWidth;
      renderedHeight = measured.renderedHeight;
      break;
    }
  }

  if (renderedWidth === 0 || renderedHeight === 0) {
    const minCharWidth = minFontSize * charAspectRatio + letterSpacing;
    const maxCharacters = Math.max(
      8,
      Math.floor((availableWidth + letterSpacing) / minCharWidth),
    );
    fittedLines = wrapLines(fittedLines, maxCharacters);
    const measured = measureLines(
      fittedLines,
      minFontSize,
      lineHeightRatio,
      letterSpacing,
      charAspectRatio,
    );
    fontSize = minFontSize;
    lineHeight = measured.lineHeight;
    renderedWidth = measured.renderedWidth;
    renderedHeight = measured.renderedHeight;
  }

  const x =
    align === "left"
      ? options.padding
      : align === "right"
        ? canvasWidth - options.padding - renderedWidth
        : (canvasWidth - renderedWidth) / 2;

  const y =
    verticalAlign === "top"
      ? options.padding
      : verticalAlign === "bottom"
        ? canvasHeight - options.padding - renderedHeight
        : (canvasHeight - renderedHeight) / 2;

  return {
    align,
    fontSize,
    lineHeight,
    x,
    y,
    renderedWidth,
    renderedHeight,
    fittedLines,
  };
}
