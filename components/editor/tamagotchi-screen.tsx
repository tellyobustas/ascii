"use client";

import { useEffect, useState } from "react";
import {
  JUNK_BUGS,
  getPetSprite,
} from "@/lib/tamagotchi/sprites";
import {
  THEME_CONFIG,
  type PetMood,
  type PetStage,
  type PetTheme,
} from "@/lib/tamagotchi/types";

// The Asciilograph logo mark lines for the Adult stage
import { AsciilographMark } from "@/components/editor/asciilograph-mark";

interface TamagotchiScreenProps {
  stage: PetStage;
  mood: PetMood;
  theme: PetTheme;
  name: string;
  level: number;
  isSleeping: boolean;
  poopCount: number;
  hasVirus: boolean;
  eggWarmCycles: number;
  onScreenClick: () => void;
  activeActionEffect: string | null;
}

export function TamagotchiScreen({
  stage,
  mood,
  theme,
  name,
  level,
  isSleeping,
  poopCount,
  hasVirus,
  eggWarmCycles,
  onScreenClick,
  activeActionEffect,
}: TamagotchiScreenProps) {
  const themeColors = THEME_CONFIG[theme] ?? THEME_CONFIG.green;
  const [bounce, setBounce] = useState(0);

  // Subtle breathing bounce
  useEffect(() => {
    if (isSleeping) return;
    const interval = window.setInterval(() => {
      setBounce((prev) => (prev === 0 ? 1 : 0));
    }, 700);
    return () => window.clearInterval(interval);
  }, [isSleeping]);

  const spriteLines = getPetSprite(stage, mood, eggWarmCycles);

  return (
    <div
      aria-label="Tamagotchi Display"
      className="relative flex min-h-[260px] w-full flex-col justify-between overflow-hidden border-2 p-3 transition-colors duration-300 select-none cursor-pointer"
      onClick={onScreenClick}
      style={{
        backgroundColor: themeColors.bg,
        borderColor: themeColors.border,
        boxShadow: `inset 0 0 20px ${themeColors.glow}, 0 0 15px ${themeColors.dim}`,
      }}
    >
      {/* Scanline CRT overlay */}
      <div className="pointer-events-none absolute inset-0 terminal-scanlines opacity-40" />

      {/* Top LCD HUD banner */}
      <div className="relative z-10 flex items-center justify-between text-[0.62rem] font-black uppercase tracking-wider">
        <span
          className="flex items-center gap-1.5"
          style={{ color: themeColors.primary }}
        >
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: themeColors.primary }} />
          {name} [LV.{level}]
        </span>
        <span
          className="rounded border px-1 text-[0.56rem]"
          style={{
            borderColor: themeColors.border,
            color: themeColors.primary,
          }}
        >
          {stage}
        </span>
        <div className="flex items-center gap-1">
          {hasVirus && (
            <span className="animate-bounce font-bold text-red-500">☠ VIRUS</span>
          )}
          {isSleeping && (
            <span className="font-bold text-cyan-400">💤 SLEEP</span>
          )}
          {!hasVirus && !isSleeping && (
            <span style={{ color: themeColors.primary }}>
              {mood === "ECSTATIC" && "♥ ECSTATIC"}
              {mood === "HAPPY" && "★ HAPPY"}
              {mood === "NORMAL" && "● SYNCED"}
              {mood === "HUNGRY" && "⚡ LOW PWR"}
              {mood === "DIRTY" && "⚠ DIRTY"}
              {mood === "SICK" && "☠ SICK"}
              {mood === "PANIC" && "!! CRASH !!"}
            </span>
          )}
        </div>
      </div>

      {/* Main Center Pet Viewport */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center py-2">
        {/* Floating action text bubble (e.g. +SYNC, EATING, etc) */}
        {activeActionEffect && (
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 animate-bounce rounded border bg-black/80 px-2 py-0.5 text-[0.68rem] font-black tracking-widest uppercase shadow-lg z-20"
            style={{
              borderColor: themeColors.primary,
              color: themeColors.primary,
            }}
          >
            {activeActionEffect}
          </div>
        )}

        {/* If Adult stage: Render the ASCIILOGRAPH signature Logo creature! */}
        {stage === "ADULT" ? (
          <div
            className="flex flex-col items-center justify-center transition-transform duration-300"
            style={{
              transform: isSleeping
                ? "scale(0.92) opacity(0.65)"
                : bounce === 1
                  ? "translateY(-3px)"
                  : "translateY(0px)",
              filter: hasVirus
                ? "hue-rotate(280deg) saturate(1.8)"
                : isSleeping
                  ? "brightness(0.6)"
                  : undefined,
            }}
          >
            {/* Adult Logo with emotional HUD frame */}
            <div className="w-full max-w-[280px]">
              <AsciilographMark />
            </div>

            {/* Emotional status subtitle below logo */}
            <div
              className="mt-1 text-center font-mono text-[0.62rem] font-black tracking-widest"
              style={{ color: themeColors.primary }}
            >
              {mood === "ECSTATIC" && "<[ ⚡ ASCIILOGRAPH DAEMON: OVERDRIVE ♥ ]>"}
              {mood === "HAPPY" && "<[ ✦ ASCIILOGRAPH DAEMON: HARMONIC ✦ ]>"}
              {mood === "NORMAL" && "<[ ● ASCIILOGRAPH DAEMON: ONLINE ● ]>"}
              {mood === "HUNGRY" && "<[ ⚡ ENERGY DEPLETED: FEED DATA ⚡ ]>"}
              {mood === "DIRTY" && "<[ ⚠ BUFFER OVERFLOW: PURGE CACHE ⚠ ]>"}
              {mood === "SICK" && "<[ ☠ INTEGRITY CORRUPTED: DEBUG ☠ ]>"}
              {mood === "SLEEPING" && "<[ ── HIBERNATION ACTIVE: z Z Z ── ]>"}
              {mood === "PANIC" && "<[ !!! KERNEL PANIC: REBOOT !!! ]>"}
            </div>
          </div>
        ) : (
          /* For EGG, BABY, TEEN, OVERCLOCK: Render dedicated ASCII Sprite */
          <div
            className="flex flex-col items-center justify-center transition-transform duration-300"
            style={{
              transform: isSleeping
                ? "scale(0.94)"
                : bounce === 1
                  ? "translateY(-3px)"
                  : "translateY(0px)",
              opacity: isSleeping ? 0.6 : 1,
            }}
          >
            <pre
              className="font-mono text-xs sm:text-sm font-bold leading-tight select-none text-center"
              style={{
                color: themeColors.primary,
                textShadow: `0 0 10px ${themeColors.glow}`,
              }}
            >
              {spriteLines.join("\n")}
            </pre>

            {stage === "EGG" && (
              <p
                className="mt-2 text-[0.60rem] uppercase tracking-wider animate-pulse"
                style={{ color: themeColors.primary }}
              >
                Tap screen to incubate ({eggWarmCycles}/5)
              </p>
            )}
          </div>
        )}
      </div>

      {/* Screen Bug / Poop Crawlers if dirty */}
      {poopCount > 0 && (
        <div className="relative z-10 flex flex-wrap gap-2 justify-center py-1">
          {Array.from({ length: poopCount }).map((_, i) => (
            <span
              key={`junk-bug-${i}`}
              className="font-mono text-[0.62rem] font-black text-amber-400 animate-pulse bg-black/60 px-1 border border-amber-500/40"
            >
              {JUNK_BUGS[i % JUNK_BUGS.length]}
            </span>
          ))}
        </div>
      )}

      {/* Bottom LCD hint & touch prompt */}
      <div className="relative z-10 flex items-center justify-between text-[0.52rem] uppercase tracking-wider text-white/40 pt-1 border-t border-white/10">
        <span>TAP TO PET</span>
        <span>Y2K CYBER-DAEMON</span>
      </div>
    </div>
  );
}
