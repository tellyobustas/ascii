export type FitAsciiTextOptions = {
  padding: number;
  fontSize: number;
  lineHeight: number;
};

export type FitAsciiTextResult = {
  fontSize: number;
  lineHeight: number;
  x: number;
  y: number;
  renderedWidth: number;
  renderedHeight: number;
  fittedLines: string[];
};

export function fitAsciiTextToCanvas(
  asciiText: string,
  canvasWidth: number,
  canvasHeight: number,
  options: FitAsciiTextOptions,
): FitAsciiTextResult {
  const fittedLines = asciiText.split("\n");

  return {
    fontSize: options.fontSize,
    lineHeight: options.lineHeight,
    x: options.padding,
    y: options.padding,
    renderedWidth: Math.max(0, canvasWidth - options.padding * 2),
    renderedHeight: Math.max(0, canvasHeight - options.padding * 2),
    fittedLines,
  };
}
