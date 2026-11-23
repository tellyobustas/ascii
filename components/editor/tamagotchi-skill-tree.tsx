"use client";

import { useState } from "react";
import { buySkillTreeNode } from "@/lib/tamagotchi/engine";
import {
  getSkillNodeCost,
  SKILL_TREE_NODES,
  type SkillNodeDef,
} from "@/lib/tamagotchi/skill-tree";
import { playSound, triggerHaptic } from "@/lib/tamagotchi/sound";
import { THEME_CONFIG, type TamagotchiState } from "@/lib/tamagotchi/types";

interface TamagotchiSkillTreeProps {
  state: TamagotchiState;
  onUpdateState: (newState: TamagotchiState) => void;
  onClose: () => void;
}

export function TamagotchiSkillTree({
  state,
  onUpdateState,
  onClose,
}: TamagotchiSkillTreeProps) {
  const [activeCategory, setActiveCategory] = useState<
    "OFFENSE" | "DEFENSE" | "UTILITY"
  >("OFFENSE");
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const themeColors = THEME_CONFIG[state.theme] ?? THEME_CONFIG.green;

  const handleUpgrade = (node: SkillNodeDef) => {
    const currentLevel = state.skillTree?.[node.id] ?? 0;
    if (currentLevel >= node.maxLevel) return;

    const cost = getSkillNodeCost(node.id, currentLevel);
    if (state.bytes < cost) {
      playSound("error", state.soundEnabled);
      setFeedbackMsg(`Недостаточно байтов! Нужно ${cost} B.`);
      return;
    }

    playSound("levelUp", state.soundEnabled);
    triggerHaptic("success");

    const res = buySkillTreeNode(state, node.id);
    onUpdateState(res.state);
    setFeedbackMsg(res.message);
  };

  const currentNodes = Object.values(SKILL_TREE_NODES).filter(
    (n) => n.category === activeCategory,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm select-none">
      <div
        className="terminal-scanlines relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-y-auto border-2 bg-black/95 p-4 shadow-2xl font-mono"
        style={{
          borderColor: themeColors.primary,
          boxShadow: `0 0 25px ${themeColors.glow}`,
        }}
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between border-b pb-2 border-white/20">
          <div>
            <h3
              className="text-xs font-black uppercase tracking-wider"
              style={{ color: themeColors.primary }}
            >
              ДРЕВО КИБЕР-ПРОКАЧКИ
            </h3>
            <p className="text-[0.55rem] text-white/50 mt-0.5">
              Постоянные улучшения для главного кибер-рейда
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-yellow-400">
              {state.bytes} B
            </span>
            <button
              onClick={onClose}
              type="button"
              className="px-2 py-0.5 text-xs font-bold text-white/70 hover:text-white"
            >
              [✕]
            </button>
          </div>
        </div>

        {/* Категории веток */}
        <div className="grid grid-cols-3 gap-1.5 my-3">
          <button
            onClick={() => setActiveCategory("OFFENSE")}
            type="button"
            className="border py-1.5 text-center text-[0.60rem] font-black uppercase transition"
            style={{
              borderColor:
                activeCategory === "OFFENSE"
                  ? themeColors.primary
                  : "rgba(255,255,255,0.15)",
              backgroundColor:
                activeCategory === "OFFENSE" ? themeColors.primary : "transparent",
              color: activeCategory === "OFFENSE" ? "#000" : themeColors.primary,
            }}
          >
            ⚔️ АТАКА
          </button>
          <button
            onClick={() => setActiveCategory("DEFENSE")}
            type="button"
            className="border py-1.5 text-center text-[0.60rem] font-black uppercase transition"
            style={{
              borderColor:
                activeCategory === "DEFENSE"
                  ? themeColors.primary
                  : "rgba(255,255,255,0.15)",
              backgroundColor:
                activeCategory === "DEFENSE" ? themeColors.primary : "transparent",
              color: activeCategory === "DEFENSE" ? "#000" : themeColors.primary,
            }}
          >
            🛡️ ЗАЩИТА
          </button>
          <button
            onClick={() => setActiveCategory("UTILITY")}
            type="button"
            className="border py-1.5 text-center text-[0.60rem] font-black uppercase transition"
            style={{
              borderColor:
                activeCategory === "UTILITY"
                  ? themeColors.primary
                  : "rgba(255,255,255,0.15)",
              backgroundColor:
                activeCategory === "UTILITY" ? themeColors.primary : "transparent",
              color: activeCategory === "UTILITY" ? "#000" : themeColors.primary,
            }}
          >
            🧲 УТИЛИТЫ
          </button>
        </div>

        {/* Сообщение обратной связи */}
        {feedbackMsg && (
          <div
            className="mb-2 text-center text-[0.62rem] font-bold p-1 bg-black/60 border truncate"
            style={{
              borderColor: themeColors.border,
              color: themeColors.primary,
            }}
          >
            {feedbackMsg}
          </div>
        )}

        {/* Список узлов выбранной ветки */}
        <div className="flex flex-col gap-2.5 overflow-y-auto pr-0.5">
          {currentNodes.map((node) => {
            const currentLvl = state.skillTree?.[node.id] ?? 0;
            const isMax = currentLvl >= node.maxLevel;
            const cost = getSkillNodeCost(node.id, currentLvl);
            const canAfford = state.bytes >= cost && !isMax;

            return (
              <div
                key={node.id}
                className="border p-2.5 flex items-center justify-between gap-3 bg-black/50"
                style={{ borderColor: "rgba(255,255,255,0.15)" }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{node.glyph}</span>
                    <span className="font-black text-xs text-white">
                      {node.nameRu}
                    </span>
                    <span
                      className="text-[0.60rem] font-bold px-1.5 py-0.2 border"
                      style={{
                        borderColor: isMax
                          ? themeColors.primary
                          : "rgba(255,255,255,0.2)",
                        color: isMax
                          ? themeColors.primary
                          : "rgba(255,255,255,0.7)",
                      }}
                    >
                      {currentLvl}/{node.maxLevel}
                    </span>
                  </div>

                  <p className="text-[0.56rem] text-white/50 mt-1">
                    {node.descRu}
                  </p>
                  <p
                    className="text-[0.56rem] font-bold mt-0.5"
                    style={{ color: themeColors.primary }}
                  >
                    Бонус: {node.effectPerLevel}
                  </p>
                </div>

                <div className="flex flex-col items-end">
                  {isMax ? (
                    <span
                      className="px-2 py-1 text-[0.60rem] font-black border"
                      style={{
                        borderColor: themeColors.primary,
                        color: themeColors.primary,
                      }}
                    >
                      МАКСИМУМ
                    </span>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(node)}
                      disabled={!canAfford}
                      type="button"
                      className="border px-3 py-1.5 text-xs font-black uppercase transition hover:opacity-90 disabled:opacity-40"
                      style={{
                        borderColor: canAfford
                          ? themeColors.primary
                          : "rgba(255,255,255,0.2)",
                        backgroundColor: canAfford
                          ? themeColors.primary
                          : "transparent",
                        color: canAfford ? "#000" : "rgba(255,255,255,0.4)",
                      }}
                    >
                      {cost} B
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Нижняя подсказка */}
        <div className="mt-4 pt-2 border-t border-white/10 text-center text-[0.52rem] uppercase tracking-wider text-white/40">
          Зарабатывай байты в рейде Survivors и улучшай древо
        </div>
      </div>
    </div>
  );
}
