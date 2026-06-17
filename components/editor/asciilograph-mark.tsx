"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

const MARK_LINES = [
  "",
  "                                                                                     ░░░░░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░░",
  "                                                                                      ░░▒░░░░░▓██▒░████████▓▒▒░░░░",
  "                                                                                 ░░     ░▒░░░░▒▓▒▒░▒▓▓▓▓▓▓█████▓▒░░░",
  "                                                                                 ░   ░░  ░▒░░░░░░░░░░░░░░░░░▒▓████▒░░░",
  "                                                                                 ░  ░░    ▒░░░░▒░░▒░  ░░▒▒░░░░░▒▓███▒░▒░",
  "                                                                                 ░  ░░    ░▒░░░░░░▒░    ░░░░░▒░░░░▒██▓░▒░",
  "                                                                                 ░  ░░  ░ ░▒░░░░░░░▒░     ░░░░░░▒░░░▒██▒░░",
  "                                                                                    ░░  ░ ░▒░░░░░░░░░▒    ░▒░░░░░░▒▒░▒██▒░▒",
  "                          ░░░░░░░░░░░░░░                                            ░░  ░  ▒░░░░░░░░░▒░   ░▒░░░░░░░░▒░░▓█▒░▒",
  "                      ░░░▒▒▓▓███████████▓░░░                                      ░ ░░  ░  ▒░░░░░░░░░░░   ░▒░░░░░░░░░▒░░▓█▒░░",
  "                    ░▒▓█▒░███▓▓▒▒▒▒▒▓▓▓▓▒░▒░                                      ░  ░  ░  ▒░░░░░░░░░░▒    ░▒▒░░░░░░░░░▒░▓█▒▒░",
  "                 ░░▒░▒██▒░░░░░░░░░░░░░░░░▒░  ░                                       ░░    ▒░░░░░░░░░░▒░     ░▒░░░░░░░░░░▒█▒░▒",
  "              ░░░▒▒░░░░░░░░▒▒▒▒▒░░░░░▒░░▒░                                         ░  ░    ░░░░░░░░░░░░▒░     ░▒░░▒▒▒▒▒▒░░░░░▒░",
  "           ░░░▒▒░░░░░░░▒░   ░▒░░░░░▒▒░▒░▒     ░                                    ░  ░░   ░▒░░░░░░░░░░░▒░     ░░▒░   ░░▒░░░░▒░",
  "        ░░▒▒▒░░░░░░░░░░░    ░▒░░░░▒░  ░▒░                                           ░    ░ ░▒░▒▒▒▒▒░░░░░░▒░░░░░░░▒░░░░   ░░░░▒░",
  "      ░▒▒░░░░░░░░░░░░░▒░    ░▒░░░▒░       ░                                            ░▒▓▒ ░░░   ░▒░░░░░░░▒▒▒▒░░░▒▒▒ ░░░░░░░▒░",
  "     ░▒░░░░░░░░░░░░░▒░░    ░▒░░░▒░                                                   ░▒▒▒▒▒▒     ░░ ▒░░░░░░░░░░░░░░▒░ ▒▒▒░░░░▒░",
  "    ▒░░░░░░░░░░░░░░▒░    ░▒▒░░░░▒░ ▒▒░░                                             ▒▓▒▒▒▒▒░    ░██░ ▒░░░░░░░░░░▒▒░░ ░▒░░░░░░▒",
  "   ░░░░░░░░░░░░░░░▒░    ░▒░░░░░░▒  ░░▒▒▒▒░                                         ▒▒▒▒▒▒▒▒    ▒███▓ ░░░░░░░░░▒░░  ░░▒░░░░░░▒░",
  "  ░▒░░░░░░░░░░░░░░▒     ▒░░░░░░░▒      ░▒▓▒   ░                                   ░▒▒▒▒▒▒▒    ▒█████ ░▒░░░░░░▒░  ░░▒░░░░░░░░▒",
  "  ▒░░░░░▒▒░░░░░░░░▒    ░▒░░░░░░░▒         ▒▓░                                     ▒▒▒▒▒▒▒░   ▒██████ ░▒░░░░▒▒  ░▒▒░░░░░░░░░▒░",
  " ░▒░░░░▒░░░▒▒░░░░░▒░   ░░░░░░░░░▒░          ▒▒                                   ░▒▒▒▒▒▒░   ░███████ ░▒░▒▒▒░   ▒░░░░░░░░░░▒░",
  " ░▒░░░░      ░░░░░░▒▒░▒░░░░░░░░░▒░           ░▒                                  ▒▒▒▒▒▒▒    ██████▒░ ░░░░░░   ░▒░░░░░░░░░▒░",
  " ░▒░░░░░░▒ ░░░░░░░░░░░░░░░░░░░░░░▒             ▒░                               ░▒▒▒▒▒▒    ▒████▓░ ░        ░░▒░░░░░░░░░▒░",
  " ░▒░░░░▒░▒ ░▒░░░░░░░░░░░░░░▒▒░░░░▒░             ░▒░                            ░▒▒▒▒▒▒    ░████▒ ░░░ ░░░░░░▒▒░░░░░░░░░▒▒░",
  "  ▒░░░░░░▒░ ▒░░░░░░░░░░░░▒▒░░░▒░░░░               ░▒░                         ░▒▒▒▒▒▒     ▓██▓░░░░   ░▒░▒▒░░░░░░░░░░▒▒░",
  "  ░▒░░░░░░░ ░░▒░░░░░░░░░▒░ ░▒ ░▒▒▒░                 ▒▒░                      ░▒▒▒▒▒▒     ▒██▒        ░▒░░░░░░▒▒▒▒▒▒▒░",
  "   ░▒░░░░░░▒░ ░▒░░░░░░░▒░ ▓██▓░ ░░ ░░                 ░▒▒░░                ░▒▒▒▒▒▒░     ▒██░         ░▒░░▒▒▒░░░░░░░",
  "    ░▒▒░░░░░▒░  ▒▒▒▒▒░▒░ ▒█████▓▒▒▓██▒░                 ░▒▒▒▒░░        ░░▒▒▓▒▒▒▒░      ▒█▓     ░     ░▒░▒░░",
  "      ░▒░░░░░▒▒  ░░░░░░   ░████████████▓▒                   ░▒▒▒▒▒▒▒▓▓▓▓▓▒▒▒▒░        ▓█▒           ░▒▒░░",
  "       ░▒▒░░░░░▒░░░░░       ▒█████████████▓░                       ░░░░░            ░██░           ░░",
  "         ░▒░░░░░▒▒▒▒▒░ ░░░    ▒██████████████▓░                                    ▓█▓ ░",
  "           ░▒░░░░░░░▒░ ░░░░░░   ▓███████████████▓▒░                             ░▓██░ ░",
  "            ░▒░░░░░░░░  ░   ░░░   ▒█████████████████▓▒░                     ░░▓███▒  ░░",
  "              ░░░░░░░▒░░░░░░  ░░░   ░▓██████████████████▓▓▒▒░░░░░░░░░░░░▒▒▓█████▒   ░▒░",
  "               ▒░░░░░░░▒▒▒▒▒  ░░░░░    ░▓████████████████████████████████████▓░    ░▒▓",
  "               ░▒░░░░░░░░░░▒░     ░░░     ░░▒▓███████████████████████████▓▒░      ░▒▓▒",
  "               ░▒░░░░░░▒▒▒▒▒▒░      ░░         ░░▒▓▓████████████████▓▓▒░         ░▒▓▓░",
  "                ▒░░░░▒▒░░             ░░              ░░░░░░░░░░░░             ░░▒▓▓▓",
  "                ░░░░▒░                 ░░░                                   ░░▒▒▓▒▓░",
  "                ░▒░▒░                  ░░░░░                             ░░░░▒▒▓▓▓▓░",
  "                ░░░░                   ▒▒▒░░░░░░      ░░░░░░░░░░░░░░░░░░▒▒▒▒▓▓▓▓▒▒",
  "                                       ░▓▓▓▒▒▒░░░░░░░░░▒▒▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒░",
  "                                        ▓▒▓▓▓▓▓▒▒▒▒▒▒▒▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒░░░░░",
  "                                        ▒▓▒▒▒▒▓▓▓▓▓▓▓▒▒▓▓▓▒▒░░░",
  "                                        ░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒░░",
  "                                         ░▒▒▒▒▒▒▒▒▒▒▒▒░",
  "",
  "",
  "",
  "",
  "",
  "",
] as const;

const LOGO_COLUMNS = 127;
const LOGO_ROWS = 54;
const GLITCH_GLYPHS = "%$#@*x&+<>/\\01";
const CELL_STYLES: Record<string, CSSProperties> = {
  "░": {
    backgroundColor: "rgba(0, 255, 102, 0.18)",
  },
  "▒": {
    backgroundColor: "rgba(80, 255, 160, 0.42)",
  },
  "▓": {
    backgroundColor: "rgba(80, 255, 160, 0.74)",
    boxShadow: "0 0 4px rgba(0, 255, 102, 0.24)",
  },
  "█": {
    backgroundColor: "rgba(0, 255, 102, 0.96)",
    boxShadow: "0 0 5px rgba(0, 255, 102, 0.38)",
  },
};

type LogoGlitchState = {
  cells: Record<string, CSSProperties>;
  glyphs: Record<string, string>;
  rows: Record<number, number>;
};

const EMPTY_GLITCH: LogoGlitchState = {
  cells: {},
  glyphs: {},
  rows: {},
};

function getLogoCellStyle(
  char: string,
  rowIndex: number,
  charIndex: number,
  glitchCells: LogoGlitchState["cells"],
): CSSProperties | undefined {
  const baseStyle = CELL_STYLES[char];
  const glitchStyle = glitchCells[`${rowIndex}-${charIndex}`];

  if (!baseStyle) return glitchStyle;
  if (!glitchStyle) return baseStyle;

  return {
    ...baseStyle,
    ...glitchStyle,
  };
}

function buildLogoGlitch(): LogoGlitchState {
  const rows: Record<number, number> = {};
  const cells: Record<string, CSSProperties> = {};
  const glyphs: Record<string, string> = {};
  const rowCount = 7 + Math.floor(Math.random() * 10);
  const cellCount = 110 + Math.floor(Math.random() * 120);
  const glyphCount = 18 + Math.floor(Math.random() * 28);

  for (let index = 0; index < rowCount; index += 1) {
    const row = 4 + Math.floor(Math.random() * (LOGO_ROWS - 10));
    rows[row] = (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 20);

    if (Math.random() > 0.48 && row + 1 < LOGO_ROWS) {
      rows[row + 1] =
        (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 12);
    }
  }

  const pickVisibleCell = () => {
    const row = Math.floor(Math.random() * LOGO_ROWS);
    const line = MARK_LINES[row] ?? "";
    const visibleColumns = line
      .split("")
      .map((char, column) => (char === " " ? -1 : column))
      .filter((column) => column >= 0);

    if (visibleColumns.length === 0) return null;

    const column =
      visibleColumns[Math.floor(Math.random() * visibleColumns.length)] ?? 0;

    return { column, row };
  };

  for (let index = 0; index < cellCount; index += 1) {
    const cell = pickVisibleCell();
    if (!cell) continue;

    const { column, row } = cell;

    cells[`${row}-${column}`] = {
      backgroundColor:
        Math.random() > 0.55
          ? "rgba(242, 255, 246, 0.96)"
          : "rgba(0, 255, 102, 1)",
      boxShadow:
        Math.random() > 0.72
          ? "0 0 18px rgba(242, 255, 246, 0.95)"
          : "0 0 13px rgba(0, 255, 102, 0.9)",
      transform:
        Math.random() > 0.78
          ? `translate(${(Math.random() - 0.5) * 6}px, ${
              (Math.random() - 0.5) * 4
            }px) scale(${1.15 + Math.random() * 0.75})`
          : undefined,
      opacity: 1,
    };
  }

  for (let index = 0; index < glyphCount; index += 1) {
    const cell = pickVisibleCell();
    if (!cell) continue;

    const key = `${cell.row}-${cell.column}`;
    glyphs[key] =
      GLITCH_GLYPHS[Math.floor(Math.random() * GLITCH_GLYPHS.length)] ?? "#";
    cells[key] = {
      backgroundColor: "rgba(0, 255, 102, 0.98)",
      boxShadow: "0 0 18px rgba(0, 255, 102, 0.96)",
      opacity: 1,
      transform: `translate(${(Math.random() - 0.5) * 8}px, ${
        (Math.random() - 0.5) * 5
      }px) scale(${1.2 + Math.random() * 0.95})`,
    };
  }

  return { cells, glyphs, rows };
}

export function AsciilographMark() {
  const [glitch, setGlitch] = useState<LogoGlitchState>(EMPTY_GLITCH);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let resetTimer: number | undefined;
    let glitchTimer: number | undefined;
    let burstLeft = 0;
    const scheduleGlitch = (delay: number) => {
      glitchTimer = window.setTimeout(() => {
        setGlitch(buildLogoGlitch());
        window.clearTimeout(resetTimer);
        resetTimer = window.setTimeout(
          () => setGlitch(EMPTY_GLITCH),
          42 + Math.random() * 54,
        );

        if (burstLeft > 0) {
          burstLeft -= 1;
          scheduleGlitch(34 + Math.random() * 86);
          return;
        }

        const shouldBurst = Math.random() > 0.56;
        if (shouldBurst) {
          burstLeft = 2 + Math.floor(Math.random() * 5);
          scheduleGlitch(45 + Math.random() * 95);
          return;
        }

        scheduleGlitch(280 + Math.random() * 720);
      }, delay);
    };

    scheduleGlitch(90 + Math.random() * 220);

    return () => {
      window.clearTimeout(glitchTimer);
      window.clearTimeout(resetTimer);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="asciilograph-mark flex w-full justify-center overflow-hidden bg-black/20 py-2 shadow-[0_0_14px_rgba(0,255,102,0.08)]"
    >
      <div
        className="grid w-full max-w-[22rem] overflow-hidden"
        style={{
          aspectRatio: `${LOGO_COLUMNS * 0.62} / ${LOGO_ROWS * 1.12}`,
          gridTemplateRows: `repeat(${LOGO_ROWS}, minmax(0, 1fr))`,
        }}
      >
        {MARK_LINES.map((row, rowIndex) => (
          <div
            className="grid min-h-0"
            key={`logo-row-${rowIndex}`}
            style={{
              gridTemplateColumns: `repeat(${LOGO_COLUMNS}, minmax(0, 1fr))`,
              transform: glitch.rows[rowIndex]
                ? `translateX(${glitch.rows[rowIndex]}px)`
                : undefined,
            }}
          >
            {Array.from({ length: LOGO_COLUMNS }, (_, charIndex) => {
              const char = row[charIndex] ?? " ";
              const glyph = glitch.glyphs[`${rowIndex}-${charIndex}`];

              return (
                <span
                  aria-hidden="true"
                  className="relative min-h-0 min-w-0"
                  key={`${rowIndex}-${charIndex}`}
                  style={getLogoCellStyle(
                    char,
                    rowIndex,
                    charIndex,
                    glitch.cells,
                  )}
                >
                  {glyph ? (
                    <span className="absolute left-1/2 top-1/2 font-mono text-[0.58rem] font-black leading-none text-ascii-white [text-shadow:0_0_10px_rgba(242,255,246,0.9),0_0_18px_rgba(0,255,102,0.9)] [transform:translate(-50%,-50%)_scale(1.8)]">
                      {glyph}
                    </span>
                  ) : null}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
