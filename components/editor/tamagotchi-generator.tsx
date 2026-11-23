"use client";

import { useEffect, useState, useRef } from "react";
import { TamagotchiGames } from "@/components/editor/tamagotchi-games";
import { TamagotchiPassport } from "@/components/editor/tamagotchi-passport";
import { TamagotchiScreen } from "@/components/editor/tamagotchi-screen";
import {
  applyTimeDecay,
  archiveAndHatchNewGen,
  calculateMood,
  cleanPet,
  feedPet,
  healPet,
  loadTamagotchiState,
  petAnimal,
  rebootPet,
  saveTamagotchiState,
  toggleSleep,
  warmEgg,
} from "@/lib/tamagotchi/engine";
import { playSound, triggerHaptic } from "@/lib/tamagotchi/sound";
import {
  FOOD_MENU,
  THEME_CONFIG,
  type FoodItem,
  type MiniGameType,
  type PetTheme,
  type TamagotchiState,
} from "@/lib/tamagotchi/types";

export function TamagotchiGenerator() {
  const [state, setState] = useState<TamagotchiState>(loadTamagotchiState);
  const [statusMessage, setStatusMessage] = useState<string>("SYSTEM BOOT OK");
  const [activeActionEffect, setActiveActionEffect] = useState<string | null>(null);

  // Modals & Drawers
  const [showFeedMenu, setShowFeedMenu] = useState(false);
  const [activeGame, setActiveGame] = useState<MiniGameType>("NONE");
  const [showPassport, setShowPassport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempName, setTempName] = useState("");

  const effectTimerRef = useRef<number | null>(null);

  // Real-time tick & auto-save every 5 seconds
  useEffect(() => {
    const interval = window.setInterval(() => {
      setState((prev) => {
        const now = Date.now();
        const elapsedSeconds = Math.max(0, (now - prev.lastTick) / 1000);
        const updated = applyTimeDecay(prev, elapsedSeconds);
        saveTamagotchiState(updated);
        return updated;
      });
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  // Flash action effect text
  const flashEffect = (text: string) => {
    setActiveActionEffect(text);
    if (effectTimerRef.current) window.clearTimeout(effectTimerRef.current);
    effectTimerRef.current = window.setTimeout(() => {
      setActiveActionEffect(null);
    }, 1800);
  };

  const themeColors = THEME_CONFIG[state.theme] ?? THEME_CONFIG.green;
  const mood = calculateMood(state);

  // Action handlers
  const handleScreenPet = () => {
    if (state.stage === "EGG") {
      playSound("click", state.soundEnabled);
      const res = warmEgg(state);
      setState(res.state);
      saveTamagotchiState(res.state);
      setStatusMessage(res.message);
      flashEffect(res.hatched ? "✦ HATCHED! ✦" : "⚡ WARMED");
      if (res.hatched) {
        playSound("hatch", state.soundEnabled);
      }
      return;
    }

    playSound("pet", state.soundEnabled);
    const res = petAnimal(state);
    setState(res.state);
    saveTamagotchiState(res.state);
    setStatusMessage(res.message);
    flashEffect("♥ SYNC BOOST");
  };

  const handleFeedItem = (food: FoodItem) => {
    const res = feedPet(state, food.id);
    if (res.success) {
      playSound("feed", state.soundEnabled);
      flashEffect(`+${food.energyBoost}% ENERGY`);
      setShowFeedMenu(false);
    } else {
      playSound("error", state.soundEnabled);
    }
    setState(res.state);
    saveTamagotchiState(res.state);
    setStatusMessage(res.message);
  };

  const handleClean = () => {
    playSound("clean", state.soundEnabled);
    const res = cleanPet(state);
    setState(res.state);
    saveTamagotchiState(res.state);
    setStatusMessage(res.message);
    flashEffect("✦ CACHE PURGED ✦");
  };

  const handleHeal = () => {
    playSound("heal", state.soundEnabled);
    const res = healPet(state);
    setState(res.state);
    saveTamagotchiState(res.state);
    setStatusMessage(res.message);
    flashEffect("✚ PATCHED ✚");
  };

  const handleToggleSleep = () => {
    playSound("sleep", state.soundEnabled);
    const res = toggleSleep(state);
    setState(res.state);
    saveTamagotchiState(res.state);
    setStatusMessage(res.message);
    flashEffect(res.isSleeping ? "💤 HIBERNATE" : "⚡ ONLINE");
  };

  const handleReboot = () => {
    playSound("hatch", state.soundEnabled);
    const res = rebootPet(state);
    setState(res.state);
    saveTamagotchiState(res.state);
    setStatusMessage(res.message);
    flashEffect("⚡ REBOOT OK ⚡");
  };

  const handleGameFinish = (result: {
    won: boolean;
    bytesEarned: number;
    syncEarned: number;
    expEarned: number;
  }) => {
    setActiveGame("NONE");
    setState((prev) => {
      const updated: TamagotchiState = {
        ...prev,
        bytes: prev.bytes + result.bytesEarned,
        happiness: Math.min(100, prev.happiness + result.syncEarned),
        gamesWon: prev.gamesWon + (result.won ? 1 : 0),
        lastTick: Date.now(),
      };
      saveTamagotchiState(updated);
      return updated;
    });
    setStatusMessage(
      `Game finished! +${result.bytesEarned} Bytes, +${result.syncEarned}% Sync.`,
    );
    flashEffect(result.won ? "★ GAME VICTORY ★" : "+EXP RECORDED");
  };

  const handleThemeChange = (newTheme: PetTheme) => {
    playSound("click", state.soundEnabled);
    setState((prev) => {
      const updated = { ...prev, theme: newTheme };
      saveTamagotchiState(updated);
      return updated;
    });
  };

  const handleSoundToggle = () => {
    const nextVal = !state.soundEnabled;
    playSound("click", nextVal);
    setState((prev) => {
      const updated = { ...prev, soundEnabled: nextVal };
      saveTamagotchiState(updated);
      return updated;
    });
  };

  const handleSaveRename = () => {
    if (!tempName.trim()) return;
    playSound("click", state.soundEnabled);
    setState((prev) => {
      const updated = { ...prev, name: tempName.trim().toUpperCase() };
      saveTamagotchiState(updated);
      return updated;
    });
    setIsRenaming(false);
    setStatusMessage(`Pet renamed to ${tempName.trim().toUpperCase()}!`);
  };

  const handleNewGeneration = () => {
    playSound("hatch", state.soundEnabled);
    const res = archiveAndHatchNewGen(state, `CORE-0${state.generation + 1}`);
    setState(res.state);
    saveTamagotchiState(res.state);
    setStatusMessage(res.message);
    setShowSettings(false);
    flashEffect(`✦ GEN ${res.state.generation} HATCHED ✦`);
  };

  return (
    <div className="flex flex-col gap-3 font-mono">
      {/* Top Cyber Deck HUD */}
      <div className="grid grid-cols-3 gap-2 border border-white/10 bg-black/60 p-2.5 text-[0.62rem] uppercase tracking-wider">
        <div className="flex flex-col">
          <span className="text-white/40">LEVEL & EXP</span>
          <span className="font-bold text-ascii-white">
            LV.{state.level} [{state.exp}/{state.expToNextLevel}]
          </span>
          <div className="mt-1 h-1 w-full bg-white/10 overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (state.exp / state.expToNextLevel) * 100)}%`,
                backgroundColor: themeColors.primary,
              }}
            />
          </div>
        </div>

        <div className="flex flex-col text-center">
          <span className="text-white/40">BALANCE</span>
          <span className="font-bold text-yellow-400">
            {state.bytes} <span className="text-[0.52rem]">BYTES</span>
          </span>
          <span className="text-[0.52rem] text-white/50">
            GEN {state.generation}
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-white/40">AUDIO & MODE</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <button
              onClick={handleSoundToggle}
              type="button"
              className="px-1.5 py-0.5 border text-[0.58rem] font-bold uppercase transition"
              style={{
                borderColor: state.soundEnabled ? themeColors.primary : "rgba(255,255,255,0.2)",
                color: state.soundEnabled ? themeColors.primary : "rgba(255,255,255,0.4)",
              }}
            >
              {state.soundEnabled ? "SFX: ON" : "SFX: OFF"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Virtual Screen Viewport */}
      <TamagotchiScreen
        activeActionEffect={activeActionEffect}
        eggWarmCycles={state.eggWarmCycles}
        hasVirus={state.hasVirus}
        isSleeping={state.isSleeping}
        level={state.level}
        mood={mood}
        name={state.name}
        onScreenClick={handleScreenPet}
        poopCount={state.poopCount}
        stage={state.stage}
        theme={state.theme}
      />

      {/* Real-Time Vitals Meters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-black/60 p-2.5 border border-white/10">
        {/* Integrity / HP */}
        <div className="flex flex-col">
          <div className="flex justify-between text-[0.58rem] uppercase font-bold text-white/70">
            <span>INTEGRITY</span>
            <span style={{ color: state.hp < 30 ? "#ff5555" : themeColors.primary }}>
              {state.hp}%
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full bg-white/10">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${state.hp}%`,
                backgroundColor: state.hp < 30 ? "#ff5555" : themeColors.primary,
              }}
            />
          </div>
        </div>

        {/* Energy / Charge */}
        <div className="flex flex-col">
          <div className="flex justify-between text-[0.58rem] uppercase font-bold text-white/70">
            <span>CHARGE</span>
            <span style={{ color: state.energy < 30 ? "#ffaa00" : themeColors.primary }}>
              {state.energy}%
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full bg-white/10">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${state.energy}%`,
                backgroundColor: state.energy < 30 ? "#ffaa00" : themeColors.primary,
              }}
            />
          </div>
        </div>

        {/* Sync / Happiness */}
        <div className="flex flex-col">
          <div className="flex justify-between text-[0.58rem] uppercase font-bold text-white/70">
            <span>SYNC</span>
            <span style={{ color: state.happiness < 30 ? "#ff5555" : themeColors.primary }}>
              {state.happiness}%
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full bg-white/10">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${state.happiness}%`,
                backgroundColor: state.happiness < 30 ? "#ff5555" : themeColors.primary,
              }}
            />
          </div>
        </div>

        {/* Buffer Cleanliness */}
        <div className="flex flex-col">
          <div className="flex justify-between text-[0.58rem] uppercase font-bold text-white/70">
            <span>BUFFER</span>
            <span style={{ color: state.cleanliness < 35 ? "#ffaa00" : themeColors.primary }}>
              {state.cleanliness}%
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full bg-white/10">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${state.cleanliness}%`,
                backgroundColor: state.cleanliness < 35 ? "#ffaa00" : themeColors.primary,
              }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Status Ticker */}
      <div className="flex items-center justify-between bg-black/80 px-3 py-1.5 border border-white/10 text-[0.60rem] tracking-wider">
        <span className="text-white/40">SYS_LOG:</span>
        <span className="truncate pl-2 font-bold" style={{ color: themeColors.primary }}>
          {statusMessage}
        </span>
      </div>

      {/* Main Action Control Buttons */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <button
          onClick={() => {
            playSound("click", state.soundEnabled);
            triggerHaptic("light");
            setShowFeedMenu((prev) => !prev);
          }}
          type="button"
          disabled={state.stage === "EGG" || state.hp <= 0}
          className="border min-h-11 flex flex-col items-center justify-center text-[0.62rem] font-black uppercase tracking-wider transition hover:opacity-80 disabled:opacity-35"
          style={{
            borderColor: themeColors.border,
            backgroundColor: showFeedMenu ? themeColors.primary : "transparent",
            color: showFeedMenu ? "#000" : themeColors.primary,
          }}
        >
          <span>⚡ FEED</span>
          <span className="text-[0.48rem] font-normal opacity-80">BYTES</span>
        </button>

        <button
          onClick={() => {
            playSound("click", state.soundEnabled);
            triggerHaptic("light");
            setActiveGame("GUESS");
          }}
          type="button"
          disabled={state.stage === "EGG" || state.hp <= 0 || state.isSleeping}
          className="border min-h-11 flex flex-col items-center justify-center text-[0.62rem] font-black uppercase tracking-wider transition hover:opacity-80 disabled:opacity-35"
          style={{
            borderColor: themeColors.border,
            color: themeColors.primary,
          }}
        >
          <span>🎮 PLAY</span>
          <span className="text-[0.48rem] font-normal opacity-80">MINI-GAME</span>
        </button>

        <button
          onClick={handleClean}
          type="button"
          disabled={state.stage === "EGG" || state.hp <= 0}
          className="border min-h-11 flex flex-col items-center justify-center text-[0.62rem] font-black uppercase tracking-wider transition hover:opacity-80 disabled:opacity-35"
          style={{
            borderColor: themeColors.border,
            color: themeColors.primary,
          }}
        >
          <span>🧹 PURGE</span>
          <span className="text-[0.48rem] font-normal opacity-80">CLEAR CACHE</span>
        </button>

        <button
          onClick={handleHeal}
          type="button"
          disabled={state.stage === "EGG" || state.hp <= 0}
          className="border min-h-11 flex flex-col items-center justify-center text-[0.62rem] font-black uppercase tracking-wider transition hover:opacity-80 disabled:opacity-35"
          style={{
            borderColor: themeColors.border,
            color: themeColors.primary,
          }}
        >
          <span>💊 DEBUG</span>
          <span className="text-[0.48rem] font-normal opacity-80">ANTIVIRUS</span>
        </button>

        <button
          onClick={handleToggleSleep}
          type="button"
          disabled={state.stage === "EGG" || state.hp <= 0}
          className="border min-h-11 flex flex-col items-center justify-center text-[0.62rem] font-black uppercase tracking-wider transition hover:opacity-80 disabled:opacity-35"
          style={{
            borderColor: themeColors.border,
            backgroundColor: state.isSleeping ? "rgba(0, 240, 255, 0.2)" : "transparent",
            color: state.isSleeping ? "#00f0ff" : themeColors.primary,
          }}
        >
          <span>{state.isSleeping ? "☀️ WAKE" : "💤 SLEEP"}</span>
          <span className="text-[0.48rem] font-normal opacity-80">HIBERNATE</span>
        </button>

        <button
          onClick={() => {
            playSound("click", state.soundEnabled);
            triggerHaptic("light");
            setShowPassport(true);
          }}
          type="button"
          className="border min-h-11 flex flex-col items-center justify-center text-[0.62rem] font-black uppercase tracking-wider transition hover:opacity-80"
          style={{
            borderColor: themeColors.border,
            color: themeColors.primary,
          }}
        >
          <span>📜 PASSPORT</span>
          <span className="text-[0.48rem] font-normal opacity-80">ID CARD</span>
        </button>
      </div>

      {/* Emergency Reboot if System Crash */}
      {state.hp <= 0 && (
        <div className="border-2 border-red-500 bg-red-950/40 p-3 text-center">
          <p className="text-xs font-black text-red-400 uppercase tracking-widest animate-pulse">
            ⚠ CRITICAL CORE COLLAPSE (KERNEL PANIC) ⚠
          </p>
          <div className="mt-3 flex justify-center gap-3">
            <button
              onClick={handleReboot}
              type="button"
              className="bg-red-500 text-black px-4 py-2 font-black text-xs uppercase tracking-wider hover:bg-red-400"
            >
              ⚡ EMERGENCY DEFIB / REBOOT
            </button>
            <button
              onClick={handleNewGeneration}
              type="button"
              className="border border-red-500 text-red-300 px-4 py-2 font-black text-xs uppercase tracking-wider hover:bg-red-900/40"
            >
              ✦ ARCHIVE & HATCH NEW GEN
            </button>
          </div>
        </div>
      )}

      {/* Expandable Food Menu Drawer */}
      {showFeedMenu && (
        <div className="border border-white/20 bg-black/90 p-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="text-xs font-black uppercase" style={{ color: themeColors.primary }}>
              SELECT DATA PACKET
            </span>
            <span className="text-[0.62rem] text-yellow-400 font-bold">
              AVAILABLE: {state.bytes} B
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FOOD_MENU.map((item) => {
              const canAfford = state.bytes >= item.cost;
              return (
                <button
                  key={item.id}
                  onClick={() => handleFeedItem(item)}
                  disabled={!canAfford}
                  type="button"
                  className="flex items-center justify-between p-2 border text-left transition hover:bg-white/5 disabled:opacity-40"
                  style={{ borderColor: themeColors.border }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold" style={{ color: themeColors.primary }}>
                        {item.glyph}
                      </span>
                      <span className="text-xs font-black text-white">{item.name}</span>
                    </div>
                    <p className="text-[0.55rem] text-white/50 mt-0.5">{item.description}</p>
                  </div>
                  <div className="text-right pl-2">
                    <span className="text-xs font-black text-yellow-400">
                      {item.cost === 0 ? "FREE" : `${item.cost} B`}
                    </span>
                    <span className="block text-[0.52rem] text-green-400">
                      +{item.energyBoost}% PWR
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Customization & Settings toggle */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => setShowSettings((prev) => !prev)}
          type="button"
          className="text-[0.58rem] uppercase tracking-wider text-white/50 hover:text-white flex items-center gap-1"
        >
          <span>[⚙ SETTINGS & THEMES]</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Whack-a-bug arcade launcher shortcut */}
          <button
            onClick={() => {
              playSound("click", state.soundEnabled);
              setActiveGame("BUG_CATCH");
            }}
            type="button"
            className="text-[0.58rem] uppercase tracking-wider text-amber-400 hover:text-amber-300 font-bold"
          >
            [ARCADE: BUG CATCH]
          </button>
        </div>
      </div>

      {/* Settings & Theme Selector Panel */}
      {showSettings && (
        <div className="border border-white/10 bg-black/80 p-3">
          <p className="text-[0.62rem] font-bold uppercase tracking-wider text-white/60 mb-2">
            PHOSPHOR CRT THEMES:
          </p>
          <div className="grid grid-cols-5 gap-2">
            {(["green", "amber", "cyan", "magenta", "white"] as PetTheme[]).map((t) => {
              const cfg = THEME_CONFIG[t];
              const isSelected = state.theme === t;
              return (
                <button
                  key={t}
                  onClick={() => handleThemeChange(t)}
                  type="button"
                  className="py-1.5 text-center text-[0.58rem] font-black uppercase border transition"
                  style={{
                    borderColor: cfg.primary,
                    backgroundColor: isSelected ? cfg.primary : "transparent",
                    color: isSelected ? "#000" : cfg.primary,
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
            {isRenaming ? (
              <div className="flex items-center gap-2 w-full">
                <input
                  type="text"
                  maxLength={12}
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="NEW NAME"
                  className="bg-black border border-white/30 px-2 py-1 text-xs text-white uppercase font-mono flex-1"
                />
                <button
                  onClick={handleSaveRename}
                  type="button"
                  className="border px-3 py-1 text-xs font-black uppercase"
                  style={{
                    borderColor: themeColors.primary,
                    color: themeColors.primary,
                  }}
                >
                  SAVE
                </button>
                <button
                  onClick={() => setIsRenaming(false)}
                  type="button"
                  className="px-2 py-1 text-xs text-white/50"
                >
                  CANCEL
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setTempName(state.name);
                  setIsRenaming(true);
                }}
                type="button"
                className="text-[0.58rem] uppercase font-bold text-white/70 hover:text-white"
              >
                RENAME DAEMON [{state.name}]
              </button>
            )}

            <button
              onClick={handleNewGeneration}
              type="button"
              className="text-[0.58rem] uppercase font-bold text-yellow-400 hover:text-yellow-300 ml-auto"
            >
              HATCH NEXT GENERATION (GEN {state.generation + 1})
            </button>
          </div>
        </div>
      )}

      {/* Mini-Games Modal */}
      {activeGame !== "NONE" && (
        <TamagotchiGames
          gameType={activeGame}
          onClose={() => setActiveGame("NONE")}
          onFinish={handleGameFinish}
          soundEnabled={state.soundEnabled}
          theme={state.theme}
        />
      )}

      {/* Passport Modal */}
      {showPassport && (
        <TamagotchiPassport
          onClose={() => setShowPassport(false)}
          state={state}
        />
      )}
    </div>
  );
}
