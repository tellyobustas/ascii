"use client";

import { useEffect, useState } from "react";
import {
  initBitRunnerGame,
  initBugSmashGame,
  initHackGame,
  type BitRunnerGameState,
  type BugSmashGameState,
  type HackGameState,
  type HackNode,
} from "@/lib/tamagotchi/games";
import { playSound, triggerHaptic } from "@/lib/tamagotchi/sound";
import {
  THEME_CONFIG,
  type MiniGameType,
  type PetTheme,
} from "@/lib/tamagotchi/types";

interface TamagotchiGamesProps {
  gameType: MiniGameType;
  theme: PetTheme;
  soundEnabled: boolean;
  cpuLevel: number;
  onFinish: (result: {
    won: boolean;
    bytesEarned: number;
    syncEarned: number;
    expEarned: number;
  }) => void;
  onClose: () => void;
}

const HACK_NODE_NAMES = ["АЛЬФА", "БЕТА", "ГАММА", "ДЕЛЬТА"];

function getRandomHackNode(): HackNode {
  return Math.floor(Math.random() * 4) as HackNode;
}

function calcNextCombo(current: number): number {
  return Math.min(5, current + 1);
}

export function TamagotchiGames({
  gameType,
  theme,
  soundEnabled,
  cpuLevel,
  onFinish,
  onClose,
}: TamagotchiGamesProps) {
  const themeColors = THEME_CONFIG[theme] ?? THEME_CONFIG.green;
  const cpuMultiplier = 1 + cpuLevel * 0.1;

  // 1. Состояние Матричного взлома
  const [hackState, setHackState] = useState<HackGameState>(initHackGame);

  // Воспроизведение последовательности узлов
  useEffect(() => {
    if (gameType !== "HACK" || hackState.status !== "SHOWING") return;

    let idx = 0;
    const interval = window.setInterval(() => {
      if (idx < hackState.sequence.length) {
        const node = hackState.sequence[idx];
        setHackState((prev) => ({ ...prev, activeHighlight: node }));
        playSound("click", soundEnabled);
        triggerHaptic("light");

        setTimeout(() => {
          setHackState((prev) => ({ ...prev, activeHighlight: null }));
        }, 320);

        idx += 1;
      } else {
        window.clearInterval(interval);
        setHackState((prev) => ({
          ...prev,
          status: "PLAYING",
          activeHighlight: null,
          message: "Твой ход! Повтори последовательность узлов:",
        }));
      }
    }, 600);

    return () => window.clearInterval(interval);
  }, [gameType, hackState.status, hackState.sequence, soundEnabled]);

  const handleHackInput = (node: HackNode) => {
    if (hackState.status !== "PLAYING") return;

    playSound("click", soundEnabled);
    triggerHaptic("light");

    const nextInput = [...hackState.playerInput, node];
    const currentIndex = nextInput.length - 1;

    if (hackState.sequence[currentIndex] !== node) {
      playSound("error", soundEnabled);
      setHackState((prev) => ({
        ...prev,
        status: "FAILED",
        message: "ОШИБКА ВХОДА! Доступ заблокирован.",
      }));
      return;
    }

    if (nextInput.length === hackState.sequence.length) {
      if (hackState.round >= 4) {
        playSound("gameWin", soundEnabled);
        setHackState((prev) => ({
          ...prev,
          status: "VICTORY",
          message: "МЕЙНФРЕЙМ ВЗЛОМАН! Полная синхронизация ядра!",
        }));
      } else {
        playSound("combo", soundEnabled);
        const nextRound = hackState.round + 1;
        const nextSeq = [
          ...hackState.sequence,
          getRandomHackNode(),
        ];
        setHackState({
          round: nextRound,
          sequence: nextSeq,
          playerInput: [],
          status: "SHOWING",
          activeHighlight: null,
          message: `Узел пройден! Раунд ${nextRound}: запоминай...`,
        });
      }
      return;
    }

    setHackState((prev) => ({ ...prev, playerInput: nextInput }));
  };

  // 2. Состояние Охоты на вирусы
  const [bugState, setBugState] = useState<BugSmashGameState>(initBugSmashGame);

  useEffect(() => {
    if (gameType !== "BUG_SMASH" || !bugState.isActive || bugState.isGameOver) return;

    const timer = window.setInterval(() => {
      setBugState((prev) => {
        if (prev.timeLeft <= 1) {
          const won = prev.score >= 8;
          playSound(won ? "gameWin" : "gameLose", soundEnabled);
          return {
            ...prev,
            timeLeft: 0,
            isActive: false,
            isGameOver: true,
            message: won
              ? `ПОБЕДА! Очищено ${prev.score} вирусов!`
              : `ВРЕМЯ ВЫШЛО! Собрано ${prev.score}/8 вирусов.`,
          };
        }

        // Спавним случайные баги и бомбы
        const newGrid = Array.from({ length: 9 }, (_, i) => {
          const roll = Math.random();
          if (roll < 0.22) return { type: "NORMAL" as const, id: i };
          if (roll < 0.29) return { type: "GOLD" as const, id: i };
          if (roll < 0.35) return { type: "BOMB" as const, id: i };
          return { type: "EMPTY" as const, id: i };
        });

        return {
          ...prev,
          timeLeft: prev.timeLeft - 1,
          grid: newGrid,
        };
      });
    }, 850);

    return () => window.clearInterval(timer);
  }, [gameType, bugState.isActive, bugState.isGameOver, soundEnabled]);

  const handleBugClick = (index: number) => {
    if (!bugState.isActive || bugState.isGameOver) return;
    const cell = bugState.grid[index];
    if (!cell || cell.type === "EMPTY") return;

    if (cell.type === "BOMB") {
      playSound("bomb", soundEnabled);
      setBugState((prev) => ({
        ...prev,
        combo: 1,
        timeLeft: Math.max(1, prev.timeLeft - 3),
        grid: prev.grid.map((c, i) => (i === index ? { type: "EMPTY", id: i } : c)),
        message: "БОМБА! -3 секунды и комбо сброшено!",
      }));
      return;
    }

    if (cell.type === "GOLD") {
      playSound("coin", soundEnabled);
      const nextCombo = calcNextCombo(bugState.combo);
      setBugState((prev) => ({
        ...prev,
        score: prev.score + 3 * nextCombo,
        combo: nextCombo,
        maxCombo: Math.max(prev.maxCombo, nextCombo),
        bonusBytes: prev.bonusBytes + 5,
        grid: prev.grid.map((c, i) => (i === index ? { type: "EMPTY", id: i } : c)),
        message: `ЗОЛОТОЙ БАГ! +5 Байтов! Комбо x${nextCombo}!`,
      }));
      return;
    }

    playSound("pet", soundEnabled);
    const nextCombo = calcNextCombo(bugState.combo);
    setBugState((prev) => ({
      ...prev,
      score: prev.score + 1 * nextCombo,
      combo: nextCombo,
      maxCombo: Math.max(prev.maxCombo, nextCombo),
      grid: prev.grid.map((c, i) => (i === index ? { type: "EMPTY", id: i } : c)),
      message: nextCombo >= 4 ? `⚡ ОВЕРДРАЙВ x${nextCombo}! ⚡` : `Вирус пойман! Комбо x${nextCombo}`,
    }));
  };

  // 3. Состояние Бит-раннера
  const [runnerState, setRunnerState] = useState<BitRunnerGameState>(initBitRunnerGame);

  useEffect(() => {
    if (gameType !== "RUNNER" || runnerState.isGameOver) return;

    const interval = window.setInterval(() => {
      setRunnerState((prev) => {
        if (prev.isGameOver) return prev;

        const nextDistance = prev.distance + 1;
        const frontRow = prev.rows[0];

        // Проверка столкновения
        if (frontRow && frontRow.firewallLane === prev.playerLane) {
          playSound("bomb", soundEnabled);
          return {
            ...prev,
            isGameOver: true,
            won: false,
          };
        }

        // Проверка сбора монеты
        let collected = prev.bytesCollected;
        if (frontRow && frontRow.coinLane === prev.playerLane) {
          collected += 2;
          playSound("coin", soundEnabled);
        }

        // Генерация новой строки
        const newFirewallLane = Math.floor(Math.random() * 3);
        let newCoinLane = Math.floor(Math.random() * 3);
        if (newCoinLane === newFirewallLane) newCoinLane = -1;

        const nextRows = [
          ...prev.rows.slice(1),
          { firewallLane: newFirewallLane, coinLane: newCoinLane },
        ];

        // Победа при дистанции 35
        if (nextDistance >= 35) {
          playSound("gameWin", soundEnabled);
          return {
            ...prev,
            distance: nextDistance,
            bytesCollected: collected,
            isGameOver: true,
            won: true,
          };
        }

        return {
          ...prev,
          distance: nextDistance,
          bytesCollected: collected,
          obstaclesDodged: prev.obstaclesDodged + 1,
          rows: nextRows,
        };
      });
    }, runnerState.speedMs);

    return () => window.clearInterval(interval);
  }, [gameType, runnerState.isGameOver, runnerState.speedMs, soundEnabled]);

  const movePlayerLeft = () => {
    if (runnerState.isGameOver) return;
    playSound("click", soundEnabled);
    setRunnerState((prev) => ({
      ...prev,
      playerLane: Math.max(0, prev.playerLane - 1),
    }));
  };

  const movePlayerRight = () => {
    if (runnerState.isGameOver) return;
    playSound("click", soundEnabled);
    setRunnerState((prev) => ({
      ...prev,
      playerLane: Math.min(2, prev.playerLane + 1),
    }));
  };

  // Завершение игр
  const finishHack = () => {
    const won = hackState.status === "VICTORY";
    const earnedBytes = Math.floor(
      (won ? 25 : hackState.round * 4) * cpuMultiplier,
    );
    onFinish({
      won,
      bytesEarned: earnedBytes,
      syncEarned: won ? 25 : 10,
      expEarned: won ? 50 : hackState.round * 10,
    });
  };

  const finishBugSmash = () => {
    const earnedBytes = Math.floor(
      (bugState.bonusBytes + Math.floor(bugState.score / 2)) * cpuMultiplier,
    );
    onFinish({
      won: bugState.score >= 8,
      bytesEarned: earnedBytes,
      syncEarned: 20,
      expEarned: 25 + bugState.score * 3,
    });
  };

  const finishRunner = () => {
    const earnedBytes = Math.floor(
      (runnerState.bytesCollected + Math.floor(runnerState.distance / 3)) *
        cpuMultiplier,
    );
    onFinish({
      won: runnerState.won,
      bytesEarned: earnedBytes,
      syncEarned: 20,
      expEarned: 20 + runnerState.distance * 2,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm select-none">
      <div
        className="terminal-scanlines relative flex w-full max-w-sm flex-col border-2 bg-black/95 p-4 shadow-2xl font-mono"
        style={{
          borderColor: themeColors.primary,
          boxShadow: `0 0 25px ${themeColors.glow}`,
        }}
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between border-b pb-2 border-white/20">
          <h3
            className="text-xs font-black uppercase tracking-wider"
            style={{ color: themeColors.primary }}
          >
            {gameType === "HACK" && "🎮 МАТРИЧНЫЙ ВЗЛОМ"}
            {gameType === "BUG_SMASH" && "🎮 ОХОТА НА ВИРУСЫ 2.0"}
            {gameType === "RUNNER" && "🎮 БИТ-РАННЕР"}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="px-2 py-0.5 text-xs font-bold text-white/70 hover:text-white"
          >
            [✕]
          </button>
        </div>

        {/* 1. ИГРА: МАТРИЧНЫЙ ВЗЛОМ */}
        {gameType === "HACK" && (
          <div className="my-3 flex flex-col items-center">
            <div
              className="my-1 rounded border px-3 py-1 text-xs font-bold"
              style={{
                borderColor: themeColors.border,
                color: themeColors.primary,
              }}
            >
              РАУНД {hackState.round} / 4 | ДЛИНА ЦЕПИ: {hackState.sequence.length}
            </div>

            <p
              className="min-h-9 text-center text-xs leading-relaxed my-2"
              style={{ color: themeColors.text }}
            >
              {hackState.message}
            </p>

            <div className="grid grid-cols-2 gap-2.5 w-full my-2">
              {[0, 1, 2, 3].map((nodeIdx) => {
                const isLit = hackState.activeHighlight === nodeIdx;
                return (
                  <button
                    key={`node-${nodeIdx}`}
                    onClick={() => handleHackInput(nodeIdx as HackNode)}
                    disabled={hackState.status !== "PLAYING"}
                    type="button"
                    className="h-16 border font-mono font-black text-xs uppercase tracking-wider transition active:scale-95 disabled:opacity-60"
                    style={{
                      borderColor: isLit ? "#fff" : themeColors.primary,
                      backgroundColor: isLit
                        ? themeColors.primary
                        : "transparent",
                      color: isLit ? "#000" : themeColors.primary,
                      boxShadow: isLit
                        ? `0 0 20px ${themeColors.primary}`
                        : undefined,
                    }}
                  >
                    [ {HACK_NODE_NAMES[nodeIdx]} ]
                  </button>
                );
              })}
            </div>

            {(hackState.status === "FAILED" ||
              hackState.status === "VICTORY") && (
              <button
                onClick={finishHack}
                type="button"
                className="mt-4 w-full border py-2.5 text-xs font-black uppercase tracking-widest transition"
                style={{
                  borderColor: themeColors.primary,
                  backgroundColor: themeColors.primary,
                  color: "#000",
                }}
              >
                ЗАБРАТЬ НАГРАДУ И ВЫЙТИ
              </button>
            )}
          </div>
        )}

        {/* 2. ИГРА: ОХОТА НА ВИРУСЫ 2.0 */}
        {gameType === "BUG_SMASH" && (
          <div className="my-3 flex flex-col items-center">
            <div className="flex w-full items-center justify-between text-xs font-bold pb-1">
              <span style={{ color: themeColors.primary }}>
                ВРЕМЯ: {bugState.timeLeft}с
              </span>
              <span className="text-yellow-400">
                СЧЕТ: {bugState.score}
              </span>
              <span
                className="px-1.5 py-0.5 border text-[0.62rem] font-black"
                style={{
                  borderColor: bugState.combo >= 4 ? "#ff007f" : themeColors.border,
                  color: bugState.combo >= 4 ? "#ff007f" : themeColors.primary,
                }}
              >
                КОМБО x{bugState.combo}
              </span>
            </div>

            <p className="text-[0.62rem] text-center text-white/70 my-1 truncate w-full">
              {bugState.message}
            </p>

            <div className="grid grid-cols-3 gap-2 w-full my-2">
              {bugState.grid.map((cell, idx) => {
                const isNormal = cell.type === "NORMAL";
                const isGold = cell.type === "GOLD";
                const isBomb = cell.type === "BOMB";
                return (
                  <button
                    key={`bug-cell-${idx}`}
                    onClick={() => handleBugClick(idx)}
                    type="button"
                    className="flex h-16 items-center justify-center border font-mono font-black text-xs transition active:scale-95"
                    style={{
                      borderColor: isBomb
                        ? "#ff2222"
                        : isGold
                          ? "#ffcc00"
                          : isNormal
                            ? themeColors.primary
                            : "rgba(255,255,255,0.1)",
                      backgroundColor: isBomb
                        ? "rgba(255, 34, 34, 0.25)"
                        : isGold
                          ? "rgba(255, 204, 0, 0.25)"
                          : isNormal
                            ? themeColors.dim
                            : "transparent",
                      color: isBomb
                        ? "#ff4444"
                        : isGold
                          ? "#ffdd00"
                          : themeColors.primary,
                    }}
                  >
                    {isNormal && <span>👾 ВИРУС</span>}
                    {isGold && <span className="animate-pulse">💰 +5 БАЙТ</span>}
                    {isBomb && <span className="animate-ping font-bold">💣 БОМБА</span>}
                    {!isNormal && !isGold && !isBomb && (
                      <span className="opacity-20 text-[0.58rem]">0x0{idx}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {bugState.isGameOver && (
              <button
                onClick={finishBugSmash}
                type="button"
                className="mt-3 w-full border py-2.5 text-xs font-black uppercase tracking-widest transition"
                style={{
                  borderColor: themeColors.primary,
                  backgroundColor: themeColors.primary,
                  color: "#000",
                }}
              >
                ЗАВЕРШИТЬ (+{bugState.bonusBytes} БАЙТОВ)
              </button>
            )}
          </div>
        )}

        {/* 3. ИГРА: БИТ-РАННЕР */}
        {gameType === "RUNNER" && (
          <div className="my-2 flex flex-col items-center">
            <div className="flex w-full items-center justify-between text-xs font-bold pb-2">
              <span style={{ color: themeColors.primary }}>
                ДИСТАНЦИЯ: {runnerState.distance}m / 35m
              </span>
              <span className="text-yellow-400">
                БАЙТЫ: +{runnerState.bytesCollected} B
              </span>
            </div>

            {/* Дорожка раннера */}
            <div className="w-full border border-white/20 bg-black/90 p-2 my-1">
              {runnerState.rows.map((row, rIdx) => (
                <div
                  key={`run-row-${rIdx}`}
                  className="grid grid-cols-3 gap-1 py-1 border-b border-white/5 text-center text-xs font-mono"
                >
                  {[0, 1, 2].map((lane) => {
                    const isFirewall = row.firewallLane === lane;
                    const isCoin = row.coinLane === lane;
                    return (
                      <div
                        key={`lane-${lane}`}
                        className="h-7 flex items-center justify-center border border-white/5 font-black text-[0.62rem]"
                        style={{
                          backgroundColor: isFirewall
                            ? "rgba(255, 0, 50, 0.3)"
                            : isCoin
                              ? "rgba(255, 200, 0, 0.25)"
                              : "transparent",
                          color: isFirewall
                            ? "#ff3333"
                            : isCoin
                              ? "#ffdd00"
                              : "transparent",
                        }}
                      >
                        {isFirewall && "⛔ СТЕНА"}
                        {isCoin && "💎 БАЙТ"}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Позиция игрока внизу */}
              <div className="grid grid-cols-3 gap-1 pt-2 border-t border-white/20 text-center font-black">
                {[0, 1, 2].map((lane) => {
                  const isPlayerHere = runnerState.playerLane === lane;
                  return (
                    <div
                      key={`player-lane-${lane}`}
                      className="h-8 flex items-center justify-center border font-mono text-xs font-bold"
                      style={{
                        borderColor: isPlayerHere
                          ? themeColors.primary
                          : "transparent",
                        backgroundColor: isPlayerHere
                          ? themeColors.dim
                          : "transparent",
                        color: isPlayerHere ? themeColors.primary : "transparent",
                      }}
                    >
                      {isPlayerHere && "▲ ПИТОМЕЦ"}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Кнопки управления ВЛЕВО / ВПРАВО */}
            {!runnerState.isGameOver ? (
              <div className="grid grid-cols-2 gap-3 w-full mt-3">
                <button
                  onClick={movePlayerLeft}
                  type="button"
                  className="border py-3 text-xs font-black uppercase tracking-wider transition active:scale-95"
                  style={{
                    borderColor: themeColors.primary,
                    color: themeColors.primary,
                  }}
                >
                  ◀ ВЛЕВО
                </button>
                <button
                  onClick={movePlayerRight}
                  type="button"
                  className="border py-3 text-xs font-black uppercase tracking-wider transition active:scale-95"
                  style={{
                    borderColor: themeColors.primary,
                    color: themeColors.primary,
                  }}
                >
                  ВПРАВО ▶
                </button>
              </div>
            ) : (
              <div className="w-full mt-3 text-center">
                <p
                  className="font-bold text-xs mb-2"
                  style={{
                    color: runnerState.won ? themeColors.primary : "#ff4444",
                  }}
                >
                  {runnerState.won
                    ? "ФИНИШ! Трасса данных успешно пройдена!"
                    : "СТОЛКНОВЕНИЕ С ФАЕРВОЛОМ!"}
                </p>
                <button
                  onClick={finishRunner}
                  type="button"
                  className="w-full border py-2.5 text-xs font-black uppercase tracking-widest transition"
                  style={{
                    borderColor: themeColors.primary,
                    backgroundColor: themeColors.primary,
                    color: "#000",
                  }}
                >
                  ЗАБРАТЬ БАЙТЫ (+{runnerState.bytesCollected} B)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
