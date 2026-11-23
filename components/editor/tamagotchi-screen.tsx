"use client";

import { useEffect, useState } from "react";
import {
  JUNK_BUGS,
  getAccessoryOverlay,
  getPetSprite,
} from "@/lib/tamagotchi/sprites";
import {
  MOOD_NAMES_RU,
  STAGE_NAMES_RU,
  THEME_CONFIG,
  type DroneAccessory,
  type HeadAccessory,
  type PetMood,
  type PetStage,
  type PetTheme,
} from "@/lib/tamagotchi/types";

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
  headAccessory: HeadAccessory;
  droneAccessory: DroneAccessory;
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
  headAccessory,
  droneAccessory,
  onScreenClick,
  activeActionEffect,
}: TamagotchiScreenProps) {
  const themeColors = THEME_CONFIG[theme] ?? THEME_CONFIG.green;
  const [bounce, setBounce] = useState(0);

  // Дыхание питомца
  useEffect(() => {
    if (isSleeping) return;
    const interval = window.setInterval(() => {
      setBounce((prev) => (prev === 0 ? 1 : 0));
    }, 650);
    return () => window.clearInterval(interval);
  }, [isSleeping]);

  const spriteLines = getPetSprite(stage, mood, eggWarmCycles);
  const { headGlyph, droneGlyph } = getAccessoryOverlay(
    headAccessory,
    droneAccessory,
  );

  const isAdultOrHigher =
    stage === "DAEMON_CORE" ||
    stage === "CYBER_ARMOR" ||
    stage === "NEO_OVERLORD" ||
    stage === "OMEGA_DEITY";

  return (
    <div
      aria-label="Экран Тамагочи"
      className="relative flex min-h-[270px] w-full flex-col justify-between overflow-hidden border-2 p-3 transition-colors duration-300 select-none cursor-pointer"
      onClick={onScreenClick}
      style={{
        backgroundColor: themeColors.bg,
        borderColor: themeColors.border,
        boxShadow: `inset 0 0 20px ${themeColors.glow}, 0 0 15px ${themeColors.dim}`,
      }}
    >
      {/* CRT-сканлинии */}
      <div className="pointer-events-none absolute inset-0 terminal-scanlines opacity-40" />

      {/* Верхний статус-бар экрана */}
      <div className="relative z-10 flex items-center justify-between text-[0.62rem] font-black uppercase tracking-wider">
        <span
          className="flex items-center gap-1.5"
          style={{ color: themeColors.primary }}
        >
          <span
            className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
            style={{ backgroundColor: themeColors.primary }}
          />
          {name} [УР.{level}]
        </span>

        <span
          className="rounded border px-1 text-[0.54rem]"
          style={{
            borderColor: themeColors.border,
            color: themeColors.primary,
          }}
        >
          {STAGE_NAMES_RU[stage] ?? stage}
        </span>

        <div className="flex items-center gap-1">
          {hasVirus && (
            <span className="animate-bounce font-bold text-red-500">☠ ВИРУС</span>
          )}
          {isSleeping && (
            <span className="font-bold text-cyan-400">💤 СОН</span>
          )}
          {!hasVirus && !isSleeping && (
            <span style={{ color: themeColors.primary }}>
              {MOOD_NAMES_RU[mood] ?? mood}
            </span>
          )}
        </div>
      </div>

      {/* Центральная зона с питомцем */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center py-2">
        {/* Всплывающий эффект действия */}
        {activeActionEffect && (
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 animate-bounce rounded border bg-black/85 px-2.5 py-0.5 text-[0.70rem] font-black tracking-widest uppercase shadow-lg z-20 whitespace-nowrap"
            style={{
              borderColor: themeColors.primary,
              color: themeColors.primary,
            }}
          >
            {activeActionEffect}
          </div>
        )}

        {/* Оверлей головного аксессуара */}
        {headGlyph && (
          <div
            className="mb-1 font-mono text-[0.62rem] font-black tracking-wider animate-pulse"
            style={{ color: themeColors.primary }}
          >
            {headGlyph}
          </div>
        )}

        {/* Взрослая форма: фирменный ASCII-логотип Asciilograph */}
        {isAdultOrHigher ? (
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
            <div className="w-full max-w-[270px]">
              <AsciilographMark />
            </div>

            <div
              className="mt-1 text-center font-mono text-[0.58rem] font-black tracking-widest"
              style={{ color: themeColors.primary }}
            >
              {stage === "OMEGA_DEITY" && "⚡ СВЕРХРАЗГОН: ОМЕГА-ДЕМОН ⚡"}
              {stage === "NEO_OVERLORD" && "✦ КИБЕР-ПОВЕЛИТЕЛЬ СЕТИ ✦"}
              {stage === "CYBER_ARMOR" && "[ БРОНИРОВАННЫЙ КОРПУС Mk.II ]"}
              {stage === "DAEMON_CORE" && "<[ ASCIILOGRAPH CORE DAEMON ]>"}
            </div>
          </div>
        ) : (
          /* Младшие формы: детальный ASCII-спрайт */
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
                className="mt-2 text-[0.60rem] uppercase tracking-wider animate-pulse text-center"
                style={{ color: themeColors.primary }}
              >
                Тапай по экрану для прогрева ядра ({eggWarmCycles}/5)
              </p>
            )}
          </div>
        )}

        {/* Оверлей дрона-спутника */}
        {droneGlyph && (
          <div
            className="mt-1 font-mono text-[0.55rem] font-bold text-cyan-300 opacity-90 animate-pulse"
          >
            {droneGlyph}
          </div>
        )}
      </div>

      {/* Баги мусора на экране */}
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

      {/* Нижняя подсказка */}
      <div className="relative z-10 flex items-center justify-between text-[0.52rem] uppercase tracking-wider text-white/40 pt-1 border-t border-white/10">
        <span>ТАПАЙ ДЛЯ ВЗАИМОДЕЙСТВИЯ</span>
        <span>Y2K ТАМАГОЧИ</span>
      </div>
    </div>
  );
}
