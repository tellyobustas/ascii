"use client";

import { useEffect, useState } from "react";

const MARK_LINES = [
  "      .-''''''-.             .-''''''-.",
  "   .-'   o  |  '-.       .-'  |  o   '-.",
  " .'      .---.    '.   .'    .---.      '.",
  "/      .'     '.    \\_/    .'     '.      \\",
  "|   o  |  _    |    / \\    |    _  |  o   |",
  "|      | ( \\   |   /   \\   |   / ) |      |",
  "\\   .-. '._\\__.' .'     '. '.__/_.' .-.   /",
  " '._\\  '-.____.-'  .---.  '-.____.-'  /_.'",
  "    '.__        .-'  _  '-.        __.'",
  "        '--.___/   .' '.   \\___.--'",
  "             /____/     \\____\\",
  "              \\__   /\\   __/",
  "                 '--  --'",
] as const;

const GLITCH_GLYPHS = "#$%*+/\\<>[]{}01";
const FACE_GLYPHS = new Set(["o", "O"]);

function getGlyphClass(char: string) {
  if (char === "o" || char === "O") {
    return "text-[#d7ffe7]";
  }

  if (char === "|" || char === "(" || char === ")") {
    return "text-ascii-green";
  }

  if (char === "/" || char === "\\" || char === "_" || char === "-") {
    return "text-[#8dffc0]";
  }

  if (char === "." || char === "'") {
    return "text-ascii-green/55";
  }

  return "text-ascii-green/72";
}

function resetRows() {
  return MARK_LINES.map((line) => line.split(""));
}

export function AsciilographMark() {
  const [rows, setRows] = useState(resetRows);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const timer = window.setInterval(() => {
      setRows(() => {
        const nextRows = resetRows();
        const swaps = 4 + Math.floor(Math.random() * 8);

        for (let index = 0; index < swaps; index += 1) {
          const row = Math.floor(Math.random() * nextRows.length);
          const visibleIndexes = MARK_LINES[row]
            .split("")
            .map((char, charIndex) =>
              char === " " || FACE_GLYPHS.has(char) ? -1 : charIndex,
            )
            .filter((charIndex) => charIndex >= 0);
          const column =
            visibleIndexes[Math.floor(Math.random() * visibleIndexes.length)];

          if (typeof column === "number") {
            nextRows[row][column] =
              GLITCH_GLYPHS[Math.floor(Math.random() * GLITCH_GLYPHS.length)];
          }
        }

        return nextRows;
      });

      window.setTimeout(() => setRows(resetRows()), 80 + Math.random() * 140);
    }, 180 + Math.random() * 180);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="asciilograph-mark shrink-0 border border-ascii-green/30 bg-black px-1.5 py-2 shadow-[0_0_14px_rgba(0,255,102,0.1)] min-[390px]:px-2"
    >
      <pre className="m-0 text-[0.44rem] font-black leading-[0.84] tracking-[-0.06em] min-[370px]:text-[0.49rem] min-[420px]:text-[0.54rem] sm:text-[0.62rem]">
        {rows.map((row, rowIndex) => (
          <span key={MARK_LINES[rowIndex]}>
            {row.map((char, charIndex) => (
              <span
                className={getGlyphClass(char)}
                key={`${rowIndex}-${charIndex}`}
              >
                {char}
              </span>
            ))}
            {rowIndex < rows.length - 1 ? "\n" : null}
          </span>
        ))}
      </pre>
    </div>
  );
}
