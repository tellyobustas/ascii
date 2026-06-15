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
  rows: Record<number, number>;
};

const EMPTY_GLITCH: LogoGlitchState = {
  cells: {},
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
  const rowCount = 2 + Math.floor(Math.random() * 4);
  const cellCount = 22 + Math.floor(Math.random() * 34);

  for (let index = 0; index < rowCount; index += 1) {
    const row = 4 + Math.floor(Math.random() * (LOGO_ROWS - 10));
    rows[row] = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 5);
  }

  for (let index = 0; index < cellCount; index += 1) {
    const row = Math.floor(Math.random() * LOGO_ROWS);
    const line = MARK_LINES[row] ?? "";
    const visibleColumns = line
      .split("")
      .map((char, column) => (char === " " ? -1 : column))
      .filter((column) => column >= 0);

    if (visibleColumns.length === 0) continue;

    const column =
      visibleColumns[Math.floor(Math.random() * visibleColumns.length)] ?? 0;

    cells[`${row}-${column}`] = {
      backgroundColor:
        Math.random() > 0.72
          ? "rgba(242, 255, 246, 0.96)"
          : "rgba(0, 255, 102, 1)",
      boxShadow: "0 0 8px rgba(0, 255, 102, 0.7)",
      opacity: 1,
    };
  }

  return { cells, rows };
}

export function AsciilographMark() {
  const [glitch, setGlitch] = useState<LogoGlitchState>(EMPTY_GLITCH);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let resetTimer: number | undefined;
    const glitchTimer = window.setInterval(() => {
      setGlitch(buildLogoGlitch());
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => setGlitch(EMPTY_GLITCH), 72);
    }, 420 + Math.random() * 180);

    return () => {
      window.clearInterval(glitchTimer);
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

              return (
                <span
                  aria-hidden="true"
                  className="min-h-0 min-w-0"
                  key={`${rowIndex}-${charIndex}`}
                  style={getLogoCellStyle(
                    char,
                    rowIndex,
                    charIndex,
                    glitch.cells,
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
