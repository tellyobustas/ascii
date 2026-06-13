"use client";

import { useEffect, useState } from "react";

const MARK_LINES = [
  "                     ^^^^^^\\/^^\\",
  "                     <=#*+=^^^/\\\\",
  "     ^^^^^^^^        <#*+=#*+=#>\\\\",
  "  ^^^#*+=#*+\\>       <*+=#*+=#*+^>",
  "/^^=#*+=#*+=#>       <<=#*_=#*+=#>",
  "<+=#*+=#*+=#>/       < .*/<#*+=#*>",
  "<=#*+=#*+=#*>^      /< *>^<*+=#*//",
  "<#*+=#*_=_*+=^^^^  ^/ */^/*+=#*__",
  "\\_+=#*>^____#*+=^^^=#*_\\_______",
  "  _\\*+=#^^\\ _________//>",
  "   <+=#*__^^^^^^^^^^^=>>",
  "   <<___/<<+=#*+=#*+=#>",
  "    _/    <  * =#_____/",
  "          <#*+=/_/",
  "           ____/",
] as const;

const GLITCH_GLYPHS = "#$%*+/\\<>[]{}01";

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
        const swaps = 2 + Math.floor(Math.random() * 5);

        for (let index = 0; index < swaps; index += 1) {
          const row = Math.floor(Math.random() * nextRows.length);
          const visibleIndexes = MARK_LINES[row]
            .split("")
            .map((char, charIndex) => (char === " " ? -1 : charIndex))
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
      className="asciilograph-mark terminal-scanlines shrink-0 border border-ascii-green/30 bg-black px-1.5 py-1 shadow-[0_0_14px_rgba(0,255,102,0.1)]"
    >
      <pre className="m-0 text-[0.245rem] font-black leading-[0.78] tracking-[-0.02em] text-ascii-green">{rows.map((row) => row.join("")).join("\n")}</pre>
    </div>
  );
}
