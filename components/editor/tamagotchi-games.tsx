"use client";

import { useEffect, useState } from "react";
import {
  initBinaryGame,
  playBinaryRound,
  type BinaryGuessChoice,
  type BinaryGuessGameState,
  initBugCatchGame,
  type BugCatchGameState,
} from "@/lib/tamagotchi/games";
import { playSound, triggerHaptic } from "@/lib/tamagotchi/sound";
import { THEME_CONFIG, type MiniGameType, type PetTheme } from "@/lib/tamagotchi/types";

interface TamagotchiGamesProps {
  gameType: MiniGameType;
  theme: PetTheme;
  soundEnabled: boolean;
  onFinish: (result: { won: boolean; bytesEarned: number; syncEarned: number; expEarned: number }) => void;
  onClose: () => void;
}

export function TamagotchiGames({
  gameType,
  theme,
  soundEnabled,
  onFinish,
  onClose,
}: TamagotchiGamesProps) {
  const themeColors = THEME_CONFIG[theme] ?? THEME_CONFIG.green;

  // Binary guess state
  const [binaryState, setBinaryState] = useState<BinaryGuessGameState>(initBinaryGame);

  // Bug catch state
  const [bugState, setBugState] = useState<BugCatchGameState>(initBugCatchGame);

  // Bug catch interval timer
  useEffect(() => {
    if (gameType !== "BUG_CATCH" || !bugState.isActive || bugState.isGameOver) return;

    const timer = setInterval(() => {
      setBugState((prev) => {
        if (prev.timeLeft <= 1) {
          const won = prev.score >= 5;
          playSound(won ? "gameWin" : "gameLose", soundEnabled);
          return {
            ...prev,
            timeLeft: 0,
            isActive: false,
            isGameOver: true,
            won,
          };
        }

        // Randomly move bug
        const nextSector = Math.random() > 0.15 ? Math.floor(Math.random() * 9) : -1;
        return {
          ...prev,
          timeLeft: prev.timeLeft - 1,
          activeSector: nextSector,
        };
      });
    }, 900);

    return () => clearInterval(timer);
  }, [gameType, bugState.isActive, bugState.isGameOver, soundEnabled]);

  const handleBinaryChoice = (choice: BinaryGuessChoice) => {
    playSound("click", soundEnabled);
    const next = playBinaryRound(binaryState, choice);
    setBinaryState(next);

    if (next.isGameOver) {
      playSound(next.won ? "gameWin" : "gameLose", soundEnabled);
    }
  };

  const handleBugHit = (sectorIndex: number) => {
    if (!bugState.isActive || bugState.isGameOver) return;
    if (bugState.activeSector === sectorIndex) {
      playSound("feed", soundEnabled);
      triggerHaptic("medium");
      setBugState((prev) => ({
        ...prev,
        score: prev.score + 1,
        activeSector: -1, // instantly squash
      }));
    } else {
      playSound("error", soundEnabled);
    }
  };

  const finishBinaryGame = () => {
    if (binaryState.won) {
      onFinish({ won: true, bytesEarned: 12, syncEarned: 20, expEarned: 30 });
    } else {
      onFinish({ won: false, bytesEarned: 3, syncEarned: 8, expEarned: 10 });
    }
  };

  const finishBugGame = () => {
    if (bugState.won) {
      onFinish({
        won: true,
        bytesEarned: 15 + bugState.score * 2,
        syncEarned: 25,
        expEarned: 35,
      });
    } else {
      onFinish({
        won: false,
        bytesEarned: bugState.score,
        syncEarned: 10,
        expEarned: 12,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div
        className="terminal-scanlines relative flex w-full max-w-sm flex-col border-2 bg-black/95 p-4 shadow-2xl"
        style={{
          borderColor: themeColors.primary,
          boxShadow: `0 0 25px ${themeColors.glow}`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-2 border-white/20">
          <h3
            className="text-xs font-black uppercase tracking-wider"
            style={{ color: themeColors.primary }}
          >
            {gameType === "GUESS" ? "BINARY GUESS (0 / 1)" : "BUG ERADICATION"}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="px-2 py-0.5 text-xs font-bold text-white/70 hover:text-white"
          >
            [✕]
          </button>
        </div>

        {/* Content for Binary Guess */}
        {gameType === "GUESS" && (
          <div className="my-4 flex flex-col items-center">
            <div
              className="my-2 rounded border px-3 py-1 font-mono text-xs font-bold"
              style={{
                borderColor: themeColors.border,
                color: themeColors.primary,
              }}
            >
              ROUND {binaryState.round} / 3 | YOU: {binaryState.playerScore} - PET:{" "}
              {binaryState.botScore}
            </div>

            <p
              className="min-h-10 text-center font-mono text-xs leading-relaxed"
              style={{ color: themeColors.text }}
            >
              {binaryState.resultMessage}
            </p>

            {binaryState.isGameOver ? (
              <button
                onClick={finishBinaryGame}
                type="button"
                className="mt-4 w-full border py-2.5 text-xs font-black uppercase tracking-widest transition"
                style={{
                  borderColor: themeColors.primary,
                  backgroundColor: themeColors.primary,
                  color: "#000",
                }}
              >
                CLAIM REWARD & EXIT
              </button>
            ) : (
              <div className="mt-4 grid w-full grid-cols-2 gap-3">
                <button
                  onClick={() => handleBinaryChoice("0")}
                  type="button"
                  className="border py-3 font-mono text-lg font-black transition hover:opacity-80"
                  style={{
                    borderColor: themeColors.primary,
                    color: themeColors.primary,
                  }}
                >
                  [ 0 ]
                </button>
                <button
                  onClick={() => handleBinaryChoice("1")}
                  type="button"
                  className="border py-3 font-mono text-lg font-black transition hover:opacity-80"
                  style={{
                    borderColor: themeColors.primary,
                    color: themeColors.primary,
                  }}
                >
                  [ 1 ]
                </button>
              </div>
            )}
          </div>
        )}

        {/* Content for Bug Catch */}
        {gameType === "BUG_CATCH" && (
          <div className="my-3 flex flex-col items-center">
            <div className="flex w-full items-center justify-between font-mono text-xs font-bold pb-2">
              <span style={{ color: themeColors.primary }}>
                TIME: {bugState.timeLeft}s
              </span>
              <span style={{ color: themeColors.primary }}>
                SQUASHED: {bugState.score} (GOAL: 5)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 w-full my-2">
              {Array.from({ length: 9 }).map((_, idx) => {
                const hasBug = bugState.activeSector === idx;
                return (
                  <button
                    key={`bug-sector-${idx}`}
                    onClick={() => handleBugHit(idx)}
                    type="button"
                    className="flex h-16 items-center justify-center border font-mono font-black text-xs transition active:scale-95"
                    style={{
                      borderColor: hasBug ? "#ff0055" : themeColors.border,
                      backgroundColor: hasBug ? "rgba(255, 0, 85, 0.25)" : "transparent",
                      color: hasBug ? "#ff0055" : themeColors.primary,
                    }}
                  >
                    {hasBug ? (
                      <span className="animate-ping font-bold text-base">☠ BUG</span>
                    ) : (
                      <span className="opacity-25 font-mono text-[0.62rem]">
                        0x0{idx}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {bugState.isGameOver && (
              <div className="mt-2 w-full text-center">
                <p
                  className="font-mono text-xs font-bold mb-3"
                  style={{ color: bugState.won ? themeColors.primary : "#ff5555" }}
                >
                  {bugState.won
                    ? `MISSION SUCCESS! Caught ${bugState.score} bugs!`
                    : `OUT OF TIME! Caught ${bugState.score}/5 bugs.`}
                </p>
                <button
                  onClick={finishBugGame}
                  type="button"
                  className="w-full border py-2.5 text-xs font-black uppercase tracking-widest transition"
                  style={{
                    borderColor: themeColors.primary,
                    backgroundColor: themeColors.primary,
                    color: "#000",
                  }}
                >
                  COLLECT DATA & EXIT
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
