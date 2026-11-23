"use client";

import { useEffect, useRef } from "react";

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
const CELL_W = 2.4;
const CELL_H = 3.2;
const CANVAS_WIDTH = Math.ceil(LOGO_COLUMNS * CELL_W);
const CANVAS_HEIGHT = Math.ceil(LOGO_ROWS * CELL_H);

export function AsciilographMark() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Pre-render static pixels to an offscreen canvas (executes ONCE!)
    const offscreen = document.createElement("canvas");
    offscreen.width = CANVAS_WIDTH;
    offscreen.height = CANVAS_HEIGHT;
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return;

    const colors: Record<string, string> = {
      "░": "rgba(0, 255, 102, 0.22)",
      "▒": "rgba(80, 255, 160, 0.50)",
      "▓": "rgba(80, 255, 160, 0.80)",
      "█": "rgba(0, 255, 102, 0.98)",
    };

    offCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    for (let r = 0; r < LOGO_ROWS; r++) {
      const line = MARK_LINES[r] ?? "";
      for (let c = 0; c < LOGO_COLUMNS; c++) {
        const char = line[c];
        const color = colors[char];
        if (color) {
          offCtx.fillStyle = color;
          offCtx.fillRect(c * CELL_W, r * CELL_H, CELL_W - 0.25, CELL_H - 0.25);
        }
      }
    }

    const draw = (glitchOffset = 0, glitchRow = -1, glitchHeight = 0) => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.drawImage(offscreen, 0, 0);

      // Lightweight horizontal glitch slice
      if (glitchHeight > 0 && glitchRow >= 0) {
        const sy = glitchRow * CELL_H;
        const sh = glitchHeight * CELL_H;
        ctx.clearRect(0, sy, CANVAS_WIDTH, sh);
        ctx.drawImage(
          offscreen,
          0,
          sy,
          CANVAS_WIDTH,
          sh,
          glitchOffset,
          sy,
          CANVAS_WIDTH,
          sh,
        );
      }
    };

    draw();

    // Occasional subtle glitch timer (runs every 3-5s, zero 120Hz churn)
    let glitchTimer: number | undefined;
    let resetTimer: number | undefined;

    const scheduleGlitch = () => {
      glitchTimer = window.setTimeout(() => {
        const offset = (Math.random() > 0.5 ? 1 : -1) * (4 + Math.random() * 8);
        const row = Math.floor(Math.random() * (LOGO_ROWS - 10));
        const height = 2 + Math.floor(Math.random() * 5);
        draw(offset, row, height);

        resetTimer = window.setTimeout(() => {
          draw();
          scheduleGlitch();
        }, 75);
      }, 3000 + Math.random() * 3000);
    };

    scheduleGlitch();

    return () => {
      window.clearTimeout(glitchTimer);
      window.clearTimeout(resetTimer);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="asciilograph-mark relative flex w-full justify-center overflow-visible px-4 py-2 select-none pointer-events-none"
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block max-w-[270px] w-full h-auto drop-shadow-[0_0_8px_rgba(0,255,102,0.35)]"
      />
    </div>
  );
}
