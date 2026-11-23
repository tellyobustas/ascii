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
  type BodyAccessory,
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
  bodyAccessory?: BodyAccessory;
  droneAccessory: DroneAccessory;
  morningBoostUntil?: number;
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
  bodyAccessory,
  droneAccessory,
  morningBoostUntil,
  onScreenClick,
  activeActionEffect,
}: TamagotchiScreenProps) {
  const themeColors = THEME_CONFIG[theme] ?? THEME_CONFIG.green;
  const [bounce, setBounce] = useState(0);
  const [timeInfo, setTimeInfo] = useState(() => {
    if (typeof window === "undefined") {
      return { isNight: false, now: 0 };
    }
    const h = new Date().getHours();
    return { isNight: h >= 23 || h < 7, now: Date.now() };
  });

  useEffect(() => {
    const update = () => {
      const h = new Date().getHours();
      setTimeInfo({ isNight: h >= 23 || h < 7, now: Date.now() });
    };
    const timer = window.setInterval(update, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const isNight = timeInfo.isNight;
  const boostActive = Boolean(morningBoostUntil && morningBoostUntil > timeInfo.now);

  // Дыхание питомца
  useEffect(() => {
    if (isSleeping) return;
    const interval = window.setInterval(() => {
      setBounce((prev) => (prev === 0 ? 1 : 0));
    }, 650);
    return () => window.clearInterval(interval);
  }, [isSleeping]);

  const spriteLines = getPetSprite(stage, mood, eggWarmCycles);
  const { headGlyph, droneGlyph, bodyLeft, bodyRight } = getAccessoryOverlay(
    headAccessory,
    droneAccessory,
    bodyAccessory,
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

        {/* Центральный блок персонажа с интегрированными модулями и обвесами (БЕЗ НАДПИСЕЙ) */}
        <div className="relative inline-flex items-center justify-center">
          {/* Левый кибер-обвес / крыло */}
          {bodyLeft && stage !== "EGG" && (
            <div
              className="absolute -left-6 sm:-left-8 top-1/2 -translate-y-1/2 font-mono text-xs sm:text-sm font-black tracking-tight select-none pointer-events-none transition-all duration-300"
              style={{
                color:
                  bodyAccessory === "TESLA_COILS"
                    ? "#38bdf8"
                    : bodyAccessory === "FORCE_FIELD"
                      ? "#06b6d4"
                      : "#ec4899",
                textShadow: "0 0 6px currentColor",
              }}
            >
              {bodyLeft}
            </div>
          )}

          {/* Головной модуль: сидит прямо на макушке питомца БЕЗ НАДПИСЕЙ */}
          {headGlyph && stage !== "EGG" && (
            <div
              className="absolute -top-3.5 sm:-top-4 left-1/2 -translate-x-1/2 font-mono text-[0.68rem] sm:text-xs font-black tracking-widest select-none pointer-events-none whitespace-nowrap z-20"
              style={{
                color:
                  headAccessory === "VISOR"
                    ? "#00f0ff"
                    : headAccessory === "HALO"
                      ? "#fbbf24"
                      : "#f43f5e",
                textShadow: "0 0 8px currentColor",
              }}
            >
              {headGlyph}
            </div>
          )}

          {/* Взрослая форма: фирменный ASCII-логотип Asciilograph (без лишних текстовых плашек) */}
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

          {/* Правый кибер-обвес / крыло */}
          {bodyRight && stage !== "EGG" && (
            <div
              className="absolute -right-6 sm:-right-8 top-1/2 -translate-y-1/2 font-mono text-xs sm:text-sm font-black tracking-tight select-none pointer-events-none transition-all duration-300"
              style={{
                color:
                  bodyAccessory === "TESLA_COILS"
                    ? "#38bdf8"
                    : bodyAccessory === "FORCE_FIELD"
                      ? "#06b6d4"
                      : "#ec4899",
                textShadow: "0 0 6px currentColor",
              }}
            >
              {bodyRight}
            </div>
          )}

          {/* Спутник-дрон: динамически парит справа-сверху от персонажа (БЕЗ НАДПИСЕЙ) */}
          {droneGlyph && stage !== "EGG" && (
            <div
              className="absolute -top-3 -right-8 sm:-right-10 font-mono text-[0.65rem] sm:text-xs font-black select-none pointer-events-none animate-bounce"
              style={{
                color:
                  droneAccessory === "BIT"
                    ? "#facc15"
                    : droneAccessory === "ORB"
                      ? "#38bdf8"
                      : "#f43f5e",
                textShadow: "0 0 8px currentColor",
                animationDuration: "2.4s",
              }}
            >
              <span className="opacity-40 text-[0.5rem] mr-0.5">··</span>
              {droneGlyph}
            </div>
          )}
        </div>
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

      {/* Нижняя строка: цикл дня/ночи и утренний буст */}
      <div className="relative z-10 flex items-center justify-between text-[0.52rem] uppercase tracking-wider text-white/50 pt-1 border-t border-white/10">
        <span className="flex items-center gap-1.5">
          {isNight ? (
            <span className="text-cyan-400 font-bold">🌙 НОЧНОЙ ЦИКЛ // ДЕФРАГ</span>
          ) : (
            <span className="text-amber-400 font-bold">☀️ ДНЕВНОЙ ЦИКЛ // ОНЛАЙН</span>
          )}
          {boostActive && (
            <span className="text-green-400 font-black animate-pulse border border-green-500/40 px-1 bg-green-950/40">
              ⚡ COLD BOOT (+25% EXP)
            </span>
          )}
        </span>
        <span>ТАПАЙ ДЛЯ СИНХРОНИЗАЦИИ</span>
      </div>
    </div>
  );
}
