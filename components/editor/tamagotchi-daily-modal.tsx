"use client";

import { useEffect, useState } from "react";
import {
  DAILY_CONTRACT_BONUS,
  DAILY_LOGIN_REWARDS,
  type DailyLoginReward,
} from "@/lib/tamagotchi/daily";
import { claimDailyContract, claimDailyLoginReward } from "@/lib/tamagotchi/engine";
import { playSound, triggerHaptic } from "@/lib/tamagotchi/sound";
import { THEME_CONFIG, type TamagotchiState } from "@/lib/tamagotchi/types";

interface TamagotchiDailyModalProps {
  state: TamagotchiState;
  onUpdateState: (newState: TamagotchiState) => void;
  onClose: () => void;
}

export function TamagotchiDailyModal({
  state,
  onUpdateState,
  onClose,
}: TamagotchiDailyModalProps) {
  const [activeTab, setActiveTab] = useState<"LOGIN" | "QUESTS">("LOGIN");
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [timeLeftToMidnight, setTimeLeftToMidnight] = useState("");

  const themeColors = THEME_CONFIG[state.theme] ?? THEME_CONFIG.green;
  const currentStreak = Math.max(1, Math.min(7, state.dailyStreak || 1));

  // Countdown to midnight
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diffMs = Math.max(0, midnight.getTime() - now.getTime());
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      setTimeLeftToMidnight(
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
      );
    };
    updateTime();
    const interval = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const handleClaimLoginReward = () => {
    if (state.claimedDailyRewardToday) return;

    playSound("claim", state.soundEnabled);
    triggerHaptic("success");

    const res = claimDailyLoginReward(state);
    if (res.success) {
      onUpdateState(res.state);
      setFeedbackMsg(res.message);
    }
  };

  const handleClaimContract = () => {
    if (state.dailyContractClaimed) return;

    playSound("claim", state.soundEnabled);
    triggerHaptic("success");

    const res = claimDailyContract(state);
    if (res.success) {
      onUpdateState(res.state);
      setFeedbackMsg(res.message);
    }
  };

  const completedQuestsCount = state.dailyQuests.filter((q) => q.completed).length;
  const isContractReady = completedQuestsCount >= 4 && !state.dailyContractClaimed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm font-mono select-none">
      <div
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col border-2 bg-black/95 p-3.5 shadow-2xl overflow-y-auto"
        style={{
          borderColor: themeColors.primary,
          boxShadow: `0 0 30px ${themeColors.glow}`,
        }}
      >
        {/* Шапка модалки */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base">📅</span>
            <div>
              <span
                className="text-xs font-black tracking-widest uppercase"
                style={{ color: themeColors.primary }}
              >
                КИБЕР-ЦЕНТР НАГРАД
              </span>
              <p className="text-[0.52rem] text-white/50 tracking-wide">
                Ежедневные протоколы входа и оперативные директивы
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[0.52rem] text-yellow-400 font-mono">
              СБРОС: {timeLeftToMidnight}
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

        {/* Вкладки переключения */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              playSound("click", state.soundEnabled);
              setActiveTab("LOGIN");
            }}
            type="button"
            className="py-1.5 border text-center text-xs font-black uppercase tracking-wider transition relative"
            style={{
              borderColor: activeTab === "LOGIN" ? themeColors.primary : "rgba(255,255,255,0.15)",
              backgroundColor: activeTab === "LOGIN" ? themeColors.dim : "transparent",
              color: activeTab === "LOGIN" ? themeColors.primary : "rgba(255,255,255,0.6)",
            }}
          >
            <span>ВХОД 7 ДНЕЙ</span>
            {!state.claimedDailyRewardToday && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
            )}
          </button>

          <button
            onClick={() => {
              playSound("click", state.soundEnabled);
              setActiveTab("QUESTS");
            }}
            type="button"
            className="py-1.5 border text-center text-xs font-black uppercase tracking-wider transition relative"
            style={{
              borderColor: activeTab === "QUESTS" ? themeColors.primary : "rgba(255,255,255,0.15)",
              backgroundColor: activeTab === "QUESTS" ? themeColors.dim : "transparent",
              color: activeTab === "QUESTS" ? themeColors.primary : "rgba(255,255,255,0.6)",
            }}
          >
            <span>ДИРЕКТИВЫ ({completedQuestsCount}/4)</span>
            {isContractReady && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
              </span>
            )}
          </button>
        </div>

        {/* Системное уведомление */}
        {feedbackMsg && (
          <div
            className="mt-2.5 p-2 border bg-black/80 text-[0.62rem] font-bold text-center tracking-wider animate-fadeIn"
            style={{
              borderColor: themeColors.primary,
              color: themeColors.primary,
            }}
          >
            {feedbackMsg}
          </div>
        )}

        {/* Вкладка 1: Ежедневный вход (7-дневный календарь) */}
        {activeTab === "LOGIN" && (
          <div className="mt-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between bg-white/5 border border-white/10 p-2 text-[0.58rem]">
              <span className="text-white/60">
                СЕРИЯ ВХОДА:{" "}
                <span className="font-black text-amber-400 font-mono">
                  {currentStreak} ИЗ 7 ДНЕЙ 🔥
                </span>
              </span>
              <span className="text-white/40">
                {state.claimedDailyRewardToday ? "✓ СЕГОДНЯ ПОЛУЧЕНО" : "⚡ НАГРАДА ЖДЕТ!"}
              </span>
            </div>

            {/* Сетка карточек на 7 дней */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DAILY_LOGIN_REWARDS.map((r: DailyLoginReward) => {
                const isPast = r.day < currentStreak;
                const isCurrent = r.day === currentStreak;
                const isClaimedToday = isCurrent && state.claimedDailyRewardToday;
                const isReady = isCurrent && !state.claimedDailyRewardToday;

                return (
                  <div
                    key={r.day}
                    className={`relative flex flex-col justify-between p-2.5 border transition ${
                      r.day === 7 ? "col-span-2 sm:col-span-2 border-yellow-500/60 bg-yellow-950/20" : "bg-black/40"
                    }`}
                    style={{
                      borderColor: isCurrent
                        ? themeColors.primary
                        : isPast
                          ? "rgba(255,255,255,0.2)"
                          : "rgba(255,255,255,0.08)",
                      opacity: isPast ? 0.7 : 1,
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[0.55rem] font-black uppercase text-white/50">
                          ДЕНЬ {r.day}
                        </span>
                        <span
                          className="text-[0.48rem] font-bold px-1 py-0.2 border"
                          style={{
                            borderColor: isCurrent ? themeColors.primary : "rgba(255,255,255,0.2)",
                            color: isCurrent ? themeColors.primary : "rgba(255,255,255,0.5)",
                          }}
                        >
                          {r.badge}
                        </span>
                      </div>

                      <p
                        className="text-[0.62rem] font-black uppercase mt-1 truncate"
                        style={{ color: isCurrent ? themeColors.primary : "#fff" }}
                      >
                        {r.title}
                      </p>
                      <p className="text-[0.50rem] text-white/60 mt-1 line-clamp-2">
                        {r.description}
                      </p>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[0.52rem] font-mono">
                      <span className="text-amber-400 font-bold">+{r.bytes} B</span>
                      {isClaimedToday ? (
                        <span className="text-green-400 font-bold">✓ ЗАБРАНО</span>
                      ) : isReady ? (
                        <span className="text-yellow-400 font-bold animate-pulse">
                          ДОСТУПНО
                        </span>
                      ) : isPast ? (
                        <span className="text-white/30">ПРОЙДЕНО</span>
                      ) : (
                        <span className="text-white/30">ЗАКРЫТО</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Главная кнопка забора награды */}
            <button
              onClick={handleClaimLoginReward}
              disabled={state.claimedDailyRewardToday}
              type="button"
              className="mt-1 w-full py-2.5 border-2 text-xs font-black uppercase tracking-widest transition disabled:opacity-40"
              style={{
                borderColor: themeColors.primary,
                backgroundColor: state.claimedDailyRewardToday ? "transparent" : themeColors.primary,
                color: state.claimedDailyRewardToday ? themeColors.primary : "#000",
                boxShadow: state.claimedDailyRewardToday ? "none" : `0 0 15px ${themeColors.glow}`,
              }}
            >
              {state.claimedDailyRewardToday
                ? "✓ НАГРАДА ЗА СЕГОДНЯ УЖЕ ПОЛУЧЕНА"
                : `⚡ ЗАБРАТЬ НАГРАДУ [ДЕНЬ ${currentStreak}]`}
            </button>
          </div>
        )}

        {/* Вкладка 2: Директивы дня + Контракт дня */}
        {activeTab === "QUESTS" && (
          <div className="mt-3 flex flex-col gap-2.5">
            {/* Карточка Контракта Дня */}
            <div className="border border-yellow-500/50 bg-yellow-950/20 p-2.5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">🏆</span>
                  <span className="text-xs font-black uppercase text-yellow-400">
                    {DAILY_CONTRACT_BONUS.title}
                  </span>
                </div>
                <p className="text-[0.52rem] text-white/60 mt-0.5">
                  Закрой все 4 директивы: +{DAILY_CONTRACT_BONUS.bytes} B, +{DAILY_CONTRACT_BONUS.exp} EXP, +{DAILY_CONTRACT_BONUS.skillPoints} SP
                </p>
              </div>

              <div>
                {state.dailyContractClaimed ? (
                  <span className="text-[0.55rem] font-black text-green-400 border border-green-500/40 px-2 py-1">
                    ✓ ПОЛУЧЕНО
                  </span>
                ) : (
                  <button
                    onClick={handleClaimContract}
                    disabled={completedQuestsCount < 4}
                    type="button"
                    className="border border-yellow-400 bg-yellow-400 text-black px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-wider disabled:opacity-30 disabled:bg-transparent disabled:text-yellow-400"
                  >
                    ОТКРЫТЬ ({completedQuestsCount}/4)
                  </button>
                )}
              </div>
            </div>

            {/* Список 4 директив */}
            <div className="flex flex-col gap-2">
              {state.dailyQuests.map((quest) => {
                const percent = Math.min(100, (quest.current / quest.target) * 100);

                return (
                  <div
                    key={quest.id}
                    className="border border-white/10 bg-black/60 p-2.5 flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-black text-white">
                          {quest.title}
                        </span>
                        <p className="text-[0.55rem] text-white/50 mt-0.5">
                          {quest.desc}
                        </p>
                      </div>

                      <div className="text-right pl-2 shrink-0">
                        <span
                          className="text-xs font-black font-mono"
                          style={{
                            color: quest.completed ? themeColors.primary : "rgba(255,255,255,0.7)",
                          }}
                        >
                          {quest.completed
                            ? "✓ ГОТОВО"
                            : `${quest.current} / ${quest.target}`}
                        </span>
                        <span className="block text-[0.50rem] text-amber-400 font-mono mt-0.5">
                          +{quest.rewardBytes} B | +{quest.rewardExp} EXP
                        </span>
                      </div>
                    </div>

                    {/* Прогресс-бар */}
                    <div className="mt-2 h-1.5 w-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: quest.completed ? "#00ff66" : themeColors.primary,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
