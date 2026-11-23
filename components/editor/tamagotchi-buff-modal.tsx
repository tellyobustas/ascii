"use client";

import {
  COMBAT_BUFFS,
  type CombatBuffDef,
  type CombatBuffType,
} from "@/lib/tamagotchi/combat-buffs";
import { buyCombatBuff, setActiveCombatBuff } from "@/lib/tamagotchi/engine";
import { playSound, triggerHaptic } from "@/lib/tamagotchi/sound";
import { THEME_CONFIG, type TamagotchiState } from "@/lib/tamagotchi/types";

interface TamagotchiBuffModalProps {
  state: TamagotchiState;
  onUpdateState: (newState: TamagotchiState) => void;
  onClose: () => void;
}

export function TamagotchiBuffModal({
  state,
  onUpdateState,
  onClose,
}: TamagotchiBuffModalProps) {
  const themeColors = THEME_CONFIG[state.theme] ?? THEME_CONFIG.green;
  const activeBuff = state.activeCombatBuff ?? "NONE";

  const handleSelectBuff = (buffType: CombatBuffType) => {
    if (buffType === activeBuff) {
      // Toggle off
      playSound("click", state.soundEnabled);
      const updated = setActiveCombatBuff(state, null);
      onUpdateState(updated);
      return;
    }

    if (buffType === "NONE") {
      playSound("click", state.soundEnabled);
      const updated = setActiveCombatBuff(state, null);
      onUpdateState(updated);
      return;
    }

    const res = buyCombatBuff(state, buffType);
    if (res.success) {
      playSound("levelUp", state.soundEnabled);
      triggerHaptic("success");
      onUpdateState(res.state);
    } else {
      playSound("error", state.soundEnabled);
    }
  };

  const buffList = Object.values(COMBAT_BUFFS).filter((b) => b.id !== "NONE");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm font-mono select-none">
      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col border-2 bg-black/95 p-3.5 shadow-2xl overflow-y-auto"
        style={{
          borderColor: themeColors.primary,
          boxShadow: `0 0 30px ${themeColors.glow}`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-base">⚡</span>
            <div>
              <span
                className="text-xs font-black tracking-widest uppercase"
                style={{ color: themeColors.primary }}
              >
                БОЕВЫЕ ЧИПЫ
              </span>
              <p className="text-[0.52rem] text-white/50 tracking-wide">
                Чип действует 1 рейд
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-yellow-400 font-mono">
              {state.bytes} B
            </span>
            <button
              onClick={() => {
                playSound("click", state.soundEnabled);
                onClose();
              }}
              type="button"
              className="text-white/40 hover:text-white text-sm px-1.5"
            >
              [✕]
            </button>
          </div>
        </div>

        {/* Текущий статус */}
        <div className="mt-2.5 flex items-center justify-between bg-white/5 border border-white/10 p-2 text-[0.58rem]">
          <span className="text-white/60">
            ЧИП:{" "}
            <span
              className="font-black"
              style={{
                color: activeBuff !== "NONE" ? COMBAT_BUFFS[activeBuff].color : "#fff",
              }}
            >
              {activeBuff !== "NONE"
                ? `${COMBAT_BUFFS[activeBuff].glyph} ${COMBAT_BUFFS[activeBuff].nameRu}`
                : "НЕТ"}
            </span>
          </span>
          {activeBuff !== "NONE" && (
            <button
              onClick={() => handleSelectBuff("NONE")}
              type="button"
              className="text-[0.52rem] text-red-400 uppercase font-bold hover:underline"
            >
              [СБРОСИТЬ]
            </button>
          )}
        </div>

        {/* Список баффов */}
        <div className="mt-2.5 flex flex-col gap-2">
          {buffList.map((buff: CombatBuffDef) => {
            const isSelected = activeBuff === buff.id;
            const freeCount = state.inventoryBuffs?.[buff.id] ?? 0;
            const canAfford = state.bytes >= buff.cost || freeCount > 0;

            return (
              <div
                key={buff.id}
                className="border p-2.5 transition flex flex-col justify-between"
                style={{
                  borderColor: isSelected ? buff.color : "rgba(255,255,255,0.12)",
                  backgroundColor: isSelected ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.02)",
                  boxShadow: isSelected ? `0 0 15px ${buff.glow}` : "none",
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{buff.glyph}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-black tracking-wide uppercase"
                          style={{ color: buff.color }}
                        >
                          {buff.nameRu}
                        </span>
                        <span
                          className="text-[0.48rem] font-bold px-1 py-0.2 border"
                          style={{ borderColor: buff.color, color: buff.color }}
                        >
                          {buff.tag}
                        </span>
                      </div>
                      <p className="text-[0.55rem] text-white/80 mt-1">
                        {buff.description}
                      </p>
                      <p className="text-[0.48rem] text-white/40 mt-0.5">
                        💡 {buff.details}
                      </p>
                    </div>
                  </div>

                  <div className="text-right pl-2 shrink-0">
                    {freeCount > 0 ? (
                      <span className="text-[0.55rem] font-black text-green-400">
                        {freeCount} БЕСПЛАТНО
                      </span>
                    ) : (
                      <span className="text-xs font-black text-yellow-400 font-mono">
                        {buff.cost} B
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[0.48rem] text-white/40">
                    ДЕЙСТВУЕТ 1 РЕЙД
                  </span>

                  <button
                    onClick={() => handleSelectBuff(buff.id)}
                    disabled={!isSelected && !canAfford}
                    type="button"
                    className="px-3 py-1 border text-[0.58rem] font-black uppercase tracking-wider transition disabled:opacity-30"
                    style={{
                      borderColor: isSelected ? buff.color : themeColors.primary,
                      backgroundColor: isSelected ? buff.color : "transparent",
                      color: isSelected ? "#000" : buff.color,
                    }}
                  >
                    {isSelected
                      ? "АКТИВЕН ✓"
                      : freeCount > 0
                        ? `АКТИВИРОВАТЬ ЧИП (${freeCount})`
                        : `КУПИТЬ (${buff.cost} B)`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => {
            playSound("click", state.soundEnabled);
            onClose();
          }}
          type="button"
          className="mt-3 w-full py-2 border border-white/20 text-white/70 hover:text-white text-xs font-bold uppercase tracking-wider"
        >
          ГОТОВО К БОЮ
        </button>
      </div>
    </div>
  );
}
