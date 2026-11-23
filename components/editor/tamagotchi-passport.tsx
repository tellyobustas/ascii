"use client";

import { useState } from "react";
import { getPetSprite } from "@/lib/tamagotchi/sprites";
import {
  STAGE_NAMES_RU,
  THEME_CONFIG,
  type TamagotchiState,
} from "@/lib/tamagotchi/types";

interface TamagotchiPassportProps {
  state: TamagotchiState;
  onClose: () => void;
}

export function TamagotchiPassport({
  state,
  onClose,
}: TamagotchiPassportProps) {
  const [copied, setCopied] = useState(false);
  const [currentDate] = useState(() => Date.now());
  const themeColors = THEME_CONFIG[state.theme] ?? THEME_CONFIG.green;

  const daysAlive = Math.max(
    1,
    Math.floor((currentDate - (state.birthDate || currentDate)) / (1000 * 60 * 60 * 24)),
  );
  const sprite = getPetSprite(state.stage, "HAPPY", state.eggWarmCycles);
  const stageRu = STAGE_NAMES_RU[state.stage] ?? state.stage;

  const passportText = [
    "╔═══════════════════════════════════════════╗",
    "║        КИБЕР-ПАСПОРТ ASCIILOGRAPH         ║",
    "╠═══════════════════════════════════════════╣",
    `║  ИМЯ:         ${state.name.padEnd(27, " ")} ║`,
    `║  ФОРМА:       ${stageRu.padEnd(27, " ")} ║`,
    `║  ПОКОЛЕНИЕ:   ${("GEN " + state.generation).padEnd(27, " ")} ║`,
    `║  УРОВЕНЬ:     ${("LV " + state.level).padEnd(27, " ")} ║`,
    `║  ВОЗРАСТ:     ${(daysAlive + " ЦИКЛОВ").padEnd(27, " ")} ║`,
    `║  БАЛАНС:      ${(state.bytes + " БАЙТОВ").padEnd(27, " ")} ║`,
    `║  СИНХРОН:     ${(state.happiness + "%").padEnd(27, " ")} ║`,
    `║  ПРОКАЧКА:    CPU +${state.attributes?.cpu ?? 0} | RAM +${state.attributes?.ram ?? 0} | FW +${state.attributes?.firewall ?? 0}   ║`,
    "╠═══════════════════════════════════════════╣",
    "║             ОБЛИК ПИТОМЦА                 ║",
    ...sprite.map((line) => `║ ${line.padEnd(41, " ")} ║`),
    "╠═══════════════════════════════════════════╣",
    "║  ВЫДАНО: ASCIILOGRAPH / GESSWRLDWIDE      ║",
    "╚═══════════════════════════════════════════╝",
  ].join("\n");

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(passportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  const shareToTelegram = () => {
    const text = encodeURIComponent(
      `Мой кибер-питомец в ASCIILOGRAPH:\n\n${passportText}\n\nСгенерировано в ASCIILOGRAPH Mini App!`,
    );
    const url = `https://t.me/share/url?url=${encodeURIComponent("https://t.me/asciilograph_bot")}&text=${text}`;
    if (typeof window !== "undefined") {
      window.Telegram?.WebApp?.openTelegramLink?.(url);
      if (!window.Telegram?.WebApp?.openTelegramLink) {
        window.open(url, "_blank");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm select-none">
      <div
        className="terminal-scanlines relative flex max-h-[90dvh] w-full max-w-md flex-col overflow-y-auto border-2 bg-black/95 p-4 shadow-2xl font-mono"
        style={{
          borderColor: themeColors.primary,
          boxShadow: `0 0 25px ${themeColors.glow}`,
        }}
      >
        <div className="flex items-center justify-between border-b pb-2 border-white/20">
          <h3
            className="text-xs font-black uppercase tracking-wider"
            style={{ color: themeColors.primary }}
          >
            КИБЕР-ПАСПОРТ ПИТОМЦА
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="px-2 py-0.5 text-xs font-bold text-white/70 hover:text-white"
          >
            [✕]
          </button>
        </div>

        <pre
          className="my-3 overflow-x-auto font-mono text-[0.55rem] sm:text-[0.66rem] leading-tight select-all p-2 bg-black/80 border border-white/10"
          style={{ color: themeColors.primary }}
        >
          {passportText}
        </pre>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
          <button
            onClick={copyToClipboard}
            type="button"
            className="border py-2 text-xs font-black uppercase tracking-wider transition hover:opacity-80"
            style={{
              borderColor: themeColors.primary,
              backgroundColor: copied ? themeColors.primary : "transparent",
              color: copied ? "#000" : themeColors.primary,
            }}
          >
            {copied ? "СКОПИРОВАНО!" : "СКОПИРОВАТЬ ASCII"}
          </button>
          <button
            onClick={shareToTelegram}
            type="button"
            className="border py-2 text-xs font-black uppercase tracking-wider text-black transition hover:opacity-90 font-bold"
            style={{
              borderColor: themeColors.primary,
              backgroundColor: themeColors.primary,
            }}
          >
            В TELEGRAM
          </button>
        </div>
      </div>
    </div>
  );
}
