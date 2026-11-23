"use client";

import { useEffect, useRef, useState } from "react";
import { TamagotchiGames } from "@/components/editor/tamagotchi-games";
import { TamagotchiPassport } from "@/components/editor/tamagotchi-passport";
import { TamagotchiScreen } from "@/components/editor/tamagotchi-screen";
import { TamagotchiSkillTree } from "@/components/editor/tamagotchi-skill-tree";
import { TamagotchiSurvivors } from "@/components/editor/tamagotchi-survivors";
import type { SurvivorRunResult } from "@/lib/tamagotchi/survivors-types";
import {
  applyTimeDecay,
  archiveAndHatchNewGen,
  calculateMood,
  cleanPet,
  equipAccessory,
  feedPet,
  getMaxEnergy,
  healPet,
  loadTamagotchiState,
  petAnimal,
  rebootPet,
  saveTamagotchiState,
  spinLuckyWheel,
  toggleSleep,
  upgradeAttribute,
  warmEgg,
} from "@/lib/tamagotchi/engine";
import { playSound, triggerHaptic } from "@/lib/tamagotchi/sound";
import {
  FOOD_MENU,
  THEME_CONFIG,
  type DroneAccessory,
  type FoodItem,
  type HeadAccessory,
  type MiniGameType,
  type PetTheme,
  type TamagotchiState,
} from "@/lib/tamagotchi/types";

export function TamagotchiGenerator() {
  const [state, setState] = useState<TamagotchiState>(loadTamagotchiState);
  const [statusMessage, setStatusMessage] = useState<string>("СИСТЕМА В НОРМЕ");
  const [activeActionEffect, setActiveActionEffect] = useState<string | null>(
    null,
  );

  // Модалки и вкладки
  const [showFeedMenu, setShowFeedMenu] = useState(false);
  const [showGameSelect, setShowGameSelect] = useState(false);
  const [activeGame, setActiveGame] = useState<MiniGameType>("NONE");
  const [showSurvivors, setShowSurvivors] = useState(false);
  const [showSkillTree, setShowSkillTree] = useState(false);
  const [showPassport, setShowPassport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempName, setTempName] = useState("");

  const effectTimerRef = useRef<number | null>(null);

  // Автосохранение и тики каждые 5 секунд
  useEffect(() => {
    const interval = window.setInterval(() => {
      setState((prev) => {
        const now = Date.now();
        const elapsedSeconds = Math.max(0, (now - (prev.lastTick || now)) / 1000);
        const updated = applyTimeDecay(prev, elapsedSeconds);
        saveTamagotchiState(updated);
        return updated;
      });
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  const flashEffect = (text: string) => {
    setActiveActionEffect(text);
    if (effectTimerRef.current) window.clearTimeout(effectTimerRef.current);
    effectTimerRef.current = window.setTimeout(() => {
      setActiveActionEffect(null);
    }, 1800);
  };

  const themeColors = THEME_CONFIG[state.theme] ?? THEME_CONFIG.green;
  const mood = calculateMood(state);
  const maxEnergy = getMaxEnergy(state);

  // Расчет боевых характеристик тамагочи для режима Выживания
  const survivorTree = state.skillTree ?? {};
  const stageHpBonus: Record<string, number> = {
    EGG: 60,
    NIBBLE: 100,
    SPARK: 140,
    IMP: 180,
    PROTO_DAEMON: 230,
    DAEMON_CORE: 300,
    CYBER_ARMOR: 400,
    NEO_OVERLORD: 550,
    OMEGA_DEITY: 800,
  };
  const stageSpeedBonus: Record<string, number> = {
    EGG: 0,
    NIBBLE: 0,
    SPARK: 10,
    IMP: 15,
    PROTO_DAEMON: 20,
    DAEMON_CORE: 28,
    CYBER_ARMOR: 22,
    NEO_OVERLORD: 35,
    OMEGA_DEITY: 50,
  };

  const combatHp =
    (stageHpBonus[state.stage] ?? 100) +
    state.level * 10 +
    (state.attributes?.ram ?? 0) * 15 +
    (survivorTree.MAX_HP ?? 0) * 30;

  const combatSpeed =
    190 +
    (stageSpeedBonus[state.stage] ?? 0) +
    state.level * 2 +
    (survivorTree.MOVE_SPEED ?? 0) * 12;

  const combatMedkitHeal = Math.floor(
    (35 +
      (state.attributes?.firewall ?? 0) * 6 +
      Math.floor(state.level * 1.5)) *
      (1 + (survivorTree.HEAL_AMP ?? 0) * 0.2),
  );

  // Обработчик тапа по экрану (погладить / инкубация)
  const handleScreenPet = () => {
    if (state.stage === "EGG") {
      playSound("click", state.soundEnabled);
      const res = warmEgg(state);
      setState(res.state);
      saveTamagotchiState(res.state);
      setStatusMessage(res.message);
      flashEffect(res.hatched ? "✦ ВЫЛУПЛЕНИЕ! ✦" : "⚡ ПРОГРЕВ");
      if (res.hatched) {
        playSound("hatch", state.soundEnabled);
      }
      return;
    }

    if (state.energy < 2) {
      playSound("error", state.soundEnabled);
      setStatusMessage("Питомец истощен! Покорми его или уложи спать.");
      flashEffect("⚠ НЕТ ЭНЕРГИИ");
      return;
    }

    playSound("pet", state.soundEnabled);
    const res = petAnimal(state);
    setState(res.state);
    saveTamagotchiState(res.state);
    setStatusMessage(res.message);
    flashEffect("♥ СИНХРОНИЗАЦИЯ");
  };

  // Питание
  const handleFeedItem = (food: FoodItem) => {
    const res = feedPet(state, food.id);
    if (res.success) {
      playSound("feed", state.soundEnabled);
      flashEffect(`+${food.energyBoost}% ЗАРЯД`);
      setShowFeedMenu(false);
    } else {
      playSound("error", state.soundEnabled);
    }
    setState(res.state);
    saveTamagotchiState(res.state);
    setStatusMessage(res.message);
  };

  // Очистка буфера
  const handleClean = () => {
    if (state.energy < 4) {
      playSound("error", state.soundEnabled);
      setStatusMessage("Недостаточно энергии для очистки (-4% Энергии).");
      flashEffect("⚠ НЕТ ЭНЕРГИИ");
      return;
    }

    playSound("clean", state.soundEnabled);
    const res = cleanPet(state);
    setState(res.state);
    saveTamagotchiState(res.state);
    setStatusMessage(res.message);
    flashEffect("✦ КЭШ ОЧИЩЕН ✦");
  };

  // Лечение
  const handleHeal = () => {
    playSound("heal", state.soundEnabled);
    const res = healPet(state);
    setState(res.state);
    saveTamagotchiState(res.state);
    setStatusMessage(res.message);
    flashEffect("✚ ПАТЧ ПРИМЕНЕН ✚");
  };

  // Сон / Бодрствование
  const handleToggleSleep = () => {
    playSound("sleep", state.soundEnabled);
    const res = toggleSleep(state);
    setState(res.state);
    saveTamagotchiState(res.state);
    setStatusMessage(res.message);
    flashEffect(res.isSleeping ? "💤 ГИБЕРНАЦИЯ" : "⚡ ОНЛАЙН");
  };

  // Запуск мини-игры с расходом энергии
  const handleLaunchGame = (game: MiniGameType) => {
    const energyCost = game === "HACK" ? 15 : 20;

    if (state.energy < energyCost) {
      playSound("error", state.soundEnabled);
      setStatusMessage(
        `Слишком мало энергии! Нужно ${energyCost}% заряда. Покорми питомца!`,
      );
      flashEffect(`⚠ НУЖНО ${energyCost}% ЗАРЯДА`);
      return;
    }

    playSound("click", state.soundEnabled);
    triggerHaptic("medium");

    setState((prev) => {
      const updated = {
        ...prev,
        energy: Math.max(0, prev.energy - energyCost),
        lastTick: Date.now(),
      };
      saveTamagotchiState(updated);
      return updated;
    });

    setShowGameSelect(false);
    setActiveGame(game);
  };

  // Завершение мини-игры
  const handleGameFinish = (result: {
    won: boolean;
    bytesEarned: number;
    syncEarned: number;
    expEarned: number;
  }) => {
    setActiveGame("NONE");
    setState((prev) => {
      let updated: TamagotchiState = {
        ...prev,
        bytes: prev.bytes + result.bytesEarned,
        happiness: Math.min(100, prev.happiness + result.syncEarned),
        gamesWon: prev.gamesWon + (result.won ? 1 : 0),
        lastTick: Date.now(),
      };

      // Добавляем опыт
      let exp = updated.exp + result.expEarned;
      let level = updated.level;
      let expToNextLevel = updated.expToNextLevel;
      let skillPoints = updated.skillPoints;

      while (exp >= expToNextLevel) {
        exp -= expToNextLevel;
        level += 1;
        skillPoints += 1;
        expToNextLevel = Math.floor(expToNextLevel * 1.3) + 20;
        updated.bytes += level * 6;
      }

      updated = {
        ...updated,
        exp,
        level,
        expToNextLevel,
        skillPoints,
      };

      // Прогресс квеста на игры
      const nextQuests = updated.dailyQuests.map((q) => {
        if (q.id === "play_2" && !q.completed) {
          const nextVal = q.current + 1;
          if (nextVal >= q.target) {
            updated.bytes += q.rewardBytes;
            return { ...q, current: q.target, completed: true };
          }
          return { ...q, current: nextVal };
        }
        return q;
      });

      updated.dailyQuests = nextQuests;
      saveTamagotchiState(updated);
      return updated;
    });

    setStatusMessage(
      `Игра окончена! +${result.bytesEarned} Байтов, +${result.syncEarned}% Синхронизации, +${result.expEarned} EXP.`,
    );
    flashEffect(result.won ? "★ ПОБЕДА В АРКАДЕ ★" : "+EXP ЗАПИСАН");
  };

  // Запуск главной игры: Выжившие (Rogue-Lite)
  const handleLaunchSurvivors = () => {
    if (state.stage === "EGG") {
      playSound("error", state.soundEnabled);
      setStatusMessage("Яйцо не может участвовать в рейде! Сначала прогрей его.");
      flashEffect("⚠ ТРЕБУЕТСЯ ВЫЛУПЛЕНИЕ");
      return;
    }

    if (state.hp <= 0) {
      playSound("error", state.soundEnabled);
      setStatusMessage("Питомец отключен! Сделай аварийный ребут.");
      flashEffect("⚠ АВАРИЙНЫЙ СБОЙ");
      return;
    }

    if (state.isSleeping) {
      playSound("error", state.soundEnabled);
      setStatusMessage("Питомец спит! Разбуди его перед отправкой в рейд.");
      flashEffect("💤 В ГИБЕРНАЦИИ");
      return;
    }

    const energyCost = 20;
    if (state.energy < energyCost) {
      playSound("error", state.soundEnabled);
      setStatusMessage(
        `Слишком мало энергии! Нужно ${energyCost}% заряда. Покорми питомца!`,
      );
      flashEffect(`⚠ НУЖНО ${energyCost}% ЗАРЯДА`);
      return;
    }

    playSound("click", state.soundEnabled);
    triggerHaptic("heavy");

    setState((prev) => {
      const updated = {
        ...prev,
        energy: Math.max(0, prev.energy - energyCost),
        lastTick: Date.now(),
      };
      saveTamagotchiState(updated);
      return updated;
    });

    setShowSurvivors(true);
  };

  // Завершение рейда Выживших
  const handleFinishSurvivors = (result: SurvivorRunResult) => {
    setShowSurvivors(false);

    setState((prev) => {
      let updated: TamagotchiState = {
        ...prev,
        bytes: prev.bytes + result.bytesGathered,
        bestSurvivorTime: Math.max(
          prev.bestSurvivorTime ?? 0,
          Math.floor(result.survivedTime),
        ),
        bestSurvivorKills: Math.max(
          prev.bestSurvivorKills ?? 0,
          result.enemiesKilled,
        ),
        lastTick: Date.now(),
      };

      // Опыт и уровни
      let exp = updated.exp + result.expGathered;
      let level = updated.level;
      let expToNextLevel = updated.expToNextLevel;
      let skillPoints = updated.skillPoints;

      while (exp >= expToNextLevel) {
        exp -= expToNextLevel;
        level += 1;
        skillPoints += 1;
        expToNextLevel = Math.floor(expToNextLevel * 1.3) + 20;
        updated.bytes += level * 6;
      }

      updated = {
        ...updated,
        exp,
        level,
        expToNextLevel,
        skillPoints,
      };

      // Прогресс квеста
      const nextQuests = updated.dailyQuests.map((q) => {
        if (q.id === "play_2" && !q.completed) {
          const nextVal = q.current + 1;
          if (nextVal >= q.target) {
            updated.bytes += q.rewardBytes;
            return { ...q, current: q.target, completed: true };
          }
          return { ...q, current: nextVal };
        }
        return q;
      });

      updated.dailyQuests = nextQuests;
      saveTamagotchiState(updated);
      return updated;
    });

    setStatusMessage(
      `Рейд завершен! Выжито ${Math.floor(result.survivedTime)}с, устранено ${result.enemiesKilled} вирусов. +${result.bytesGathered} B, +${result.expGathered} EXP.`,
    );
    flashEffect(result.won ? "★ ОВЕРЛОРД ПОВЕРЖЕН ★" : "☠ РЕЙД ЗАВЕРШЕН");
  };

  // Колесо фортуны
  const handleSpinWheel = () => {
    playSound("spin", state.soundEnabled);
    triggerHaptic("heavy");
    const res = spinLuckyWheel(state);
    setState(res.state);
    saveTamagotchiState(res.state);
    setStatusMessage(res.rewardText);
    flashEffect("🎰 РУЛЕТКА ВЗЛОМА");
  };

  // Прокачка характеристик
  const handleUpgradeStat = (attr: "cpu" | "ram" | "firewall") => {
    const res = upgradeAttribute(state, attr);
    if (res.success) {
      playSound("levelUp", state.soundEnabled);
      flashEffect("⚡ УЛУЧШЕНО");
    } else {
      playSound("error", state.soundEnabled);
    }
    setState(res.state);
    saveTamagotchiState(res.state);
    setStatusMessage(res.message);
  };

  // Смена темы фосфора
  const handleThemeChange = (newTheme: PetTheme) => {
    playSound("click", state.soundEnabled);
    setState((prev) => {
      const updated = { ...prev, theme: newTheme };
      saveTamagotchiState(updated);
      return updated;
    });
  };

  // Звук
  const handleSoundToggle = () => {
    const nextVal = !state.soundEnabled;
    playSound("click", nextVal);
    setState((prev) => {
      const updated = { ...prev, soundEnabled: nextVal };
      saveTamagotchiState(updated);
      return updated;
    });
  };

  // Переименование
  const handleSaveRename = () => {
    if (!tempName.trim()) return;
    playSound("click", state.soundEnabled);
    setState((prev) => {
      const updated = { ...prev, name: tempName.trim().toUpperCase() };
      saveTamagotchiState(updated);
      return updated;
    });
    setIsRenaming(false);
    setStatusMessage(`Питомец переименован в ${tempName.trim().toUpperCase()}!`);
  };

  // Смена аксессуара
  const handleEquip = (head: HeadAccessory, drone: DroneAccessory) => {
    playSound("click", state.soundEnabled);
    const updated = equipAccessory(state, head, drone);
    setState(updated);
    saveTamagotchiState(updated);
    setStatusMessage("Модули обновлены!");
    flashEffect("👑 МОДУЛЬ НАДЕТ");
  };

  // Аварийный ребут
  const handleReboot = () => {
    playSound("hatch", state.soundEnabled);
    const res = rebootPet(state);
    setState(res.state);
    saveTamagotchiState(res.state);
    setStatusMessage(res.message);
    flashEffect("⚡ РЕБУТ УСПЕШЕН ⚡");
  };

  // Новое поколение
  const handleNewGeneration = () => {
    playSound("hatch", state.soundEnabled);
    const res = archiveAndHatchNewGen(state, `CORE-0${state.generation + 1}`);
    setState(res.state);
    saveTamagotchiState(res.state);
    setStatusMessage(res.message);
    setShowSettings(false);
    flashEffect(`✦ GEN ${res.state.generation} ИНИЦИИРОВАН ✦`);
  };

  return (
    <div className="flex flex-col gap-3 font-mono">
      {/* Верхний кибер-дэк HUD */}
      <div className="grid grid-cols-3 gap-2 border border-white/10 bg-black/60 p-2.5 text-[0.62rem] uppercase tracking-wider">
        <div className="flex flex-col">
          <span className="text-white/40">УРОВЕНЬ И ОПЫТ</span>
          <span className="font-bold text-ascii-white">
            УР.{state.level} [{state.exp}/{state.expToNextLevel}]
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
          <span className="text-white/40">БАЛАНС</span>
          <span className="font-bold text-yellow-400">
            {state.bytes} <span className="text-[0.52rem]">БАЙТОВ</span>
          </span>
          <span className="text-[0.52rem] text-white/50">
            GEN {state.generation}
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-white/40">ОЧКИ НАВЫКОВ</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="font-bold px-1.5 py-0.2 border text-[0.62rem]"
              style={{
                borderColor:
                  state.skillPoints > 0
                    ? "#ff007f"
                    : "rgba(255,255,255,0.2)",
                color:
                  state.skillPoints > 0 ? "#ff007f" : "rgba(255,255,255,0.6)",
              }}
            >
              {state.skillPoints} SP
            </span>
            <button
              onClick={handleSoundToggle}
              type="button"
              className="px-1 py-0.2 border text-[0.52rem] font-bold uppercase transition"
              style={{
                borderColor: state.soundEnabled
                  ? themeColors.primary
                  : "rgba(255,255,255,0.2)",
                color: state.soundEnabled
                  ? themeColors.primary
                  : "rgba(255,255,255,0.4)",
              }}
            >
              {state.soundEnabled ? "SFX: ВКЛ" : "SFX: ВЫКЛ"}
            </button>
          </div>
        </div>
      </div>

      {/* Главный виртуальный CRT-экран */}
      <TamagotchiScreen
        activeActionEffect={activeActionEffect}
        droneAccessory={state.droneAccessory}
        eggWarmCycles={state.eggWarmCycles}
        hasVirus={state.hasVirus}
        headAccessory={state.headAccessory}
        isSleeping={state.isSleeping}
        level={state.level}
        mood={mood}
        name={state.name}
        onScreenClick={handleScreenPet}
        poopCount={state.poopCount}
        stage={state.stage}
        theme={state.theme}
      />

      {/* Шкалы параметров состояния */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-black/60 p-2.5 border border-white/10">
        {/* Целостность / HP */}
        <div className="flex flex-col">
          <div className="flex justify-between text-[0.58rem] uppercase font-bold text-white/70">
            <span>ЦЕЛОСТНОСТЬ</span>
            <span
              style={{
                color: state.hp < 30 ? "#ff5555" : themeColors.primary,
              }}
            >
              {state.hp}%
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full bg-white/10">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${state.hp}%`,
                backgroundColor:
                  state.hp < 30 ? "#ff5555" : themeColors.primary,
              }}
            />
          </div>
        </div>

        {/* Заряд / Энергия */}
        <div className="flex flex-col">
          <div className="flex justify-between text-[0.58rem] uppercase font-bold text-white/70">
            <span>ЗАРЯД ЭНЕРГИИ</span>
            <span
              style={{
                color: state.energy < 25 ? "#ffaa00" : themeColors.primary,
              }}
            >
              {state.energy} / {maxEnergy}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full bg-white/10">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (state.energy / maxEnergy) * 100)}%`,
                backgroundColor:
                  state.energy < 25 ? "#ffaa00" : themeColors.primary,
              }}
            />
          </div>
        </div>

        {/* Синхронизация / Настроение */}
        <div className="flex flex-col">
          <div className="flex justify-between text-[0.58rem] uppercase font-bold text-white/70">
            <span>СИНХРОНИЗАЦИЯ</span>
            <span
              style={{
                color:
                  state.happiness < 30 ? "#ff5555" : themeColors.primary,
              }}
            >
              {state.happiness}%
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full bg-white/10">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${state.happiness}%`,
                backgroundColor:
                  state.happiness < 30 ? "#ff5555" : themeColors.primary,
              }}
            />
          </div>
        </div>

        {/* Чистота буфера */}
        <div className="flex flex-col">
          <div className="flex justify-between text-[0.58rem] uppercase font-bold text-white/70">
            <span>БУФЕР КЭША</span>
            <span
              style={{
                color:
                  state.cleanliness < 35 ? "#ffaa00" : themeColors.primary,
              }}
            >
              {state.cleanliness}%
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full bg-white/10">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${state.cleanliness}%`,
                backgroundColor:
                  state.cleanliness < 35 ? "#ffaa00" : themeColors.primary,
              }}
            />
          </div>
        </div>
      </div>

      {/* Строка системного лога */}
      <div className="flex items-center justify-between bg-black/80 px-3 py-1.5 border border-white/10 text-[0.60rem] tracking-wider">
        <span className="text-white/40">СИСТЕМА:</span>
        <span
          className="truncate pl-2 font-bold"
          style={{ color: themeColors.primary }}
        >
          {statusMessage}
        </span>
      </div>

      {/* ============================================================== */}
      {/* ГЛАВНАЯ ИГРА: КИБЕР-РЕЙД // VAMPIRE SURVIVORS ROGUE-LITE       */}
      {/* ============================================================== */}
      <div
        className="relative overflow-hidden border-2 bg-gradient-to-b from-black/95 via-black/85 to-black/95 p-3.5 shadow-2xl transition"
        style={{
          borderColor: themeColors.primary,
          boxShadow: `0 0 25px ${themeColors.glow}`,
        }}
      >
        {/* Фоновые декоративные элементы */}
        <div className="absolute -right-4 -top-4 select-none text-[3.5rem] font-black opacity-5 pointer-events-none text-white">
          SURVIVOR
        </div>

        {/* Заголовок с бейджем ГЛАВНАЯ ИГРА */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base">⚔️</span>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-black tracking-widest uppercase"
                  style={{ color: themeColors.primary }}
                >
                  КИБЕР-РЕЙД // SURVIVORS
                </span>
                <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[0.48rem] font-black px-1.5 py-0.5 tracking-wider animate-pulse uppercase">
                  ★ ОСНОВНАЯ ИГРА ★
                </span>
              </div>
              <p className="text-[0.52rem] text-white/50 tracking-wide mt-0.5">
                Rogue-lite арена: 360° джойстик, ближний и дальний бой, орды багов и боссы
              </p>
            </div>
          </div>

          {/* Рекорд */}
          <div className="text-right">
            <span className="text-[0.48rem] uppercase text-white/40 block">РЕКОРД ВЫЖИВАНИЯ</span>
            <span className="text-[0.62rem] font-black text-amber-400 font-mono">
              ⏱ {state.bestSurvivorTime ?? 0}с / 👾 {state.bestSurvivorKills ?? 0} КИЛЛОВ
            </span>
          </div>
        </div>

        {/* Сводка боевых характеристик тамагочи */}
        <div className="mt-2.5 grid grid-cols-3 gap-2 bg-white/5 border border-white/10 p-2 text-center text-[0.55rem]">
          <div className="flex flex-col">
            <span className="text-white/40 uppercase">БОЕВОЕ HP</span>
            <span className="font-black text-xs text-green-400 font-mono mt-0.5">
              {combatHp}
            </span>
            <span className="text-[0.46rem] text-white/40 mt-0.5">
              СТАДИЯ + RAM + ДРЕВО
            </span>
          </div>

          <div className="flex flex-col border-x border-white/10">
            <span className="text-white/40 uppercase">СКОРОСТЬ БЕГА</span>
            <span className="font-black text-xs text-cyan-400 font-mono mt-0.5">
              {combatSpeed}
            </span>
            <span className="text-[0.46rem] text-white/40 mt-0.5">
              УРОВЕНЬ + ДРЕВО
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-white/40 uppercase">ХИЛ АПТЕЧКИ</span>
            <span className="font-black text-xs text-yellow-400 font-mono mt-0.5">
              +{combatMedkitHeal} HP
            </span>
            <span className="text-[0.46rem] text-white/40 mt-0.5">
              ФАЕРВОЛ + ДРЕВО
            </span>
          </div>
        </div>

        {/* Кнопки запуска и прокачки */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Кнопка запуска боя */}
          <button
            onClick={handleLaunchSurvivors}
            disabled={state.stage === "EGG" || state.hp <= 0 || state.isSleeping}
            type="button"
            className="sm:col-span-2 group relative overflow-hidden py-2.5 px-3 border-2 font-black text-xs uppercase tracking-widest transition-all duration-200 disabled:opacity-40 flex items-center justify-center gap-2"
            style={{
              borderColor: themeColors.primary,
              backgroundColor: themeColors.primary,
              color: "#000",
              boxShadow: `0 0 15px ${themeColors.glow}`,
            }}
          >
            <span className="text-sm">⚔️</span>
            <span>НАЧАТЬ КИБЕР-РЕЙД (-20⚡)</span>
          </button>

          {/* Кнопка открытия древа навыков */}
          <button
            onClick={() => {
              playSound("click", state.soundEnabled);
              setShowSkillTree(true);
            }}
            type="button"
            className="border border-purple-500/60 bg-purple-950/20 hover:bg-purple-900/30 text-purple-300 py-2 px-3 font-black text-[0.62rem] uppercase tracking-wider transition flex items-center justify-center gap-1.5"
          >
            <span>🌲</span>
            <span>ДРЕВО ПРОКАЧКИ</span>
          </button>
        </div>

        <p className="mt-2 text-[0.48rem] text-white/40 text-center uppercase tracking-wider">
          💡 Мини-игры внизу пополняют запасы байтов и опыта для прокачки характеристик!
        </p>
      </div>

      {/* Панель основных кнопок действий */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {/* КОРМИТЬ */}
        <button
          onClick={() => {
            playSound("click", state.soundEnabled);
            triggerHaptic("light");
            setShowFeedMenu((prev) => !prev);
            setShowGameSelect(false);
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
          <span>⚡ КОРМИТЬ</span>
          <span className="text-[0.48rem] font-normal opacity-80">+ЗАРЯД</span>
        </button>

        {/* ИГРЫ */}
        <button
          onClick={() => {
            playSound("click", state.soundEnabled);
            triggerHaptic("light");
            setShowGameSelect((prev) => !prev);
            setShowFeedMenu(false);
          }}
          type="button"
          disabled={state.stage === "EGG" || state.hp <= 0 || state.isSleeping}
          className="border min-h-11 flex flex-col items-center justify-center text-[0.62rem] font-black uppercase tracking-wider transition hover:opacity-80 disabled:opacity-35"
          style={{
            borderColor: themeColors.border,
            backgroundColor: showGameSelect ? themeColors.primary : "transparent",
            color: showGameSelect ? "#000" : themeColors.primary,
          }}
        >
          <span>🎮 ИГРЫ</span>
          <span className="text-[0.48rem] font-normal opacity-80">АРКАДЫ</span>
        </button>

        {/* ОЧИСТКА */}
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
          <span>🧹 ОЧИСТКА</span>
          <span className="text-[0.48rem] font-normal opacity-80">КЭШ (-4⚡)</span>
        </button>

        {/* ДЕБАГ / ЛЕЧЕНИЕ */}
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
          <span>💊 ЛЕЧЕНИЕ</span>
          <span className="text-[0.48rem] font-normal opacity-80">АНТИВИРУС</span>
        </button>

        {/* СОН / БОДРСТВОВАНИЕ */}
        <button
          onClick={handleToggleSleep}
          type="button"
          disabled={state.stage === "EGG" || state.hp <= 0}
          className="border min-h-11 flex flex-col items-center justify-center text-[0.62rem] font-black uppercase tracking-wider transition hover:opacity-80 disabled:opacity-35"
          style={{
            borderColor: themeColors.border,
            backgroundColor: state.isSleeping
              ? "rgba(0, 240, 255, 0.2)"
              : "transparent",
            color: state.isSleeping ? "#00f0ff" : themeColors.primary,
          }}
        >
          <span>{state.isSleeping ? "☀️ РАЗБУДИТЬ" : "💤 УСНУТЬ"}</span>
          <span className="text-[0.48rem] font-normal opacity-80">ЗАРЯДКА</span>
        </button>

        {/* ПАСПОРТ */}
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
          <span>📜 ПАСПОРТ</span>
          <span className="text-[0.48rem] font-normal opacity-80">ID КАРТА</span>
        </button>
      </div>

      {/* Аварийный режим при сбое ядра */}
      {state.hp <= 0 && (
        <div className="border-2 border-red-500 bg-red-950/40 p-3 text-center">
          <p className="text-xs font-black text-red-400 uppercase tracking-widest animate-pulse">
            ⚠ АВАРИЙНЫЙ СБОЙ СИСТЕМЫ (KERNEL PANIC) ⚠
          </p>
          <div className="mt-3 flex justify-center gap-3">
            <button
              onClick={handleReboot}
              type="button"
              className="bg-red-500 text-black px-4 py-2 font-black text-xs uppercase tracking-wider hover:bg-red-400"
            >
              ⚡ ДЕФИБРИЛЛЯТОР / РЕБУТ
            </button>
            <button
              onClick={handleNewGeneration}
              type="button"
              className="border border-red-500 text-red-300 px-4 py-2 font-black text-xs uppercase tracking-wider hover:bg-red-900/40"
            >
              ✦ НОВОЕ ПОКОЛЕНИЕ (GEN +1)
            </button>
          </div>
        </div>
      )}

      {/* Меню выбора мини-игр */}
      {showGameSelect && (
        <div className="border border-white/20 bg-black/90 p-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span
              className="text-xs font-black uppercase"
              style={{ color: themeColors.primary }}
            >
              ВЫБЕРИ КИБЕР-АРКАДУ
            </span>
            <span className="text-[0.58rem] text-white/50">
              ЗАРЯД: {state.energy}%
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => handleLaunchGame("HACK")}
              type="button"
              className="p-2.5 border text-left transition hover:bg-white/5 flex flex-col justify-between"
              style={{ borderColor: themeColors.border }}
            >
              <div>
                <p
                  className="font-black text-xs"
                  style={{ color: themeColors.primary }}
                >
                  1. МАТРИЧНЫЙ ВЗЛОМ
                </p>
                <p className="text-[0.55rem] text-white/60 mt-1">
                  Запоминай цепочки импульсов мейнфрейма. Прокачка памяти!
                </p>
              </div>
              <span className="text-[0.52rem] text-amber-400 font-bold mt-2">
                -15% ЗАРЯДА | +25 БАЙТОВ
              </span>
            </button>

            <button
              onClick={() => handleLaunchGame("BUG_SMASH")}
              type="button"
              className="p-2.5 border text-left transition hover:bg-white/5 flex flex-col justify-between"
              style={{ borderColor: themeColors.border }}
            >
              <div>
                <p
                  className="font-black text-xs"
                  style={{ color: themeColors.primary }}
                >
                  2. ОХОТА НА ВИРУСЫ 2.0
                </p>
                <p className="text-[0.55rem] text-white/60 mt-1">
                  Лови вирусы на скорость! Золотые баги и комбо x5 Овердрайв!
                </p>
              </div>
              <span className="text-[0.52rem] text-amber-400 font-bold mt-2">
                -20% ЗАРЯДА | ЗОЛОТЫЕ БАГИ
              </span>
            </button>

            <button
              onClick={() => handleLaunchGame("RUNNER")}
              type="button"
              className="p-2.5 border text-left transition hover:bg-white/5 flex flex-col justify-between"
              style={{ borderColor: themeColors.border }}
            >
              <div>
                <p
                  className="font-black text-xs"
                  style={{ color: themeColors.primary }}
                >
                  3. БИТ-РАННЕР
                </p>
                <p className="text-[0.55rem] text-white/60 mt-1">
                  Уклоняйся от фаерволов и собирай кристаллы данных!
                </p>
              </div>
              <span className="text-[0.52rem] text-amber-400 font-bold mt-2">
                -20% ЗАРЯДА | СБОР ДАННЫХ
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Меню питания */}
      {showFeedMenu && (
        <div className="border border-white/20 bg-black/90 p-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span
              className="text-xs font-black uppercase"
              style={{ color: themeColors.primary }}
            >
              ВЫБЕРИ ПАКЕТ ДАННЫХ
            </span>
            <span className="text-[0.62rem] text-yellow-400 font-bold">
              БАЛАНС: {state.bytes} БАЙТОВ
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
                      <span
                        className="font-mono text-xs font-bold"
                        style={{ color: themeColors.primary }}
                      >
                        {item.glyph}
                      </span>
                      <span className="text-xs font-black text-white">
                        {item.name}
                      </span>
                    </div>
                    <p className="text-[0.55rem] text-white/50 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                  <div className="text-right pl-2">
                    <span className="text-xs font-black text-yellow-400">
                      {item.cost === 0 ? "БЕСПЛАТНО" : `${item.cost} B`}
                    </span>
                    <span className="block text-[0.52rem] text-green-400">
                      +{item.energyBoost}% ЗАРЯД
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Вторичная строка кнопок: Рулетка, Прокачка, Древо, Квесты, Гардероб, Настройки */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1 text-[0.58rem] font-black uppercase">
        <button
          onClick={handleSpinWheel}
          type="button"
          className="border py-2 px-1 text-center transition hover:opacity-80 text-yellow-400 border-yellow-500/40 bg-yellow-950/20"
        >
          🎰 РУЛЕТКА
        </button>

        <button
          onClick={() => {
            playSound("click", state.soundEnabled);
            setShowUpgrades((prev) => !prev);
          }}
          type="button"
          className="border py-2 px-1 text-center transition hover:opacity-80"
          style={{
            borderColor: state.skillPoints > 0 ? "#ff007f" : themeColors.border,
            color: state.skillPoints > 0 ? "#ff007f" : themeColors.primary,
          }}
        >
          ⚡ СТАТЫ ({state.skillPoints})
        </button>

        <button
          onClick={() => {
            playSound("click", state.soundEnabled);
            setShowSkillTree(true);
          }}
          type="button"
          className="border py-2 px-1 text-center transition hover:opacity-80 text-purple-400 border-purple-500/40 bg-purple-950/20"
        >
          🌲 ДРЕВО
        </button>

        <button
          onClick={() => {
            playSound("click", state.soundEnabled);
            setShowQuests((prev) => !prev);
          }}
          type="button"
          className="border py-2 px-1 text-center transition hover:opacity-80"
          style={{
            borderColor: themeColors.border,
            color: themeColors.primary,
          }}
        >
          🏆 КВЕСТЫ
        </button>

        <button
          onClick={() => {
            playSound("click", state.soundEnabled);
            setShowWardrobe((prev) => !prev);
          }}
          type="button"
          className="border py-2 px-1 text-center transition hover:opacity-80"
          style={{
            borderColor: themeColors.border,
            color: themeColors.primary,
          }}
        >
          👑 МОДУЛИ
        </button>

        <button
          onClick={() => {
            playSound("click", state.soundEnabled);
            setShowSettings((prev) => !prev);
          }}
          type="button"
          className="border py-2 px-1 text-center transition hover:opacity-80 text-white/70 border-white/20"
        >
          ⚙ ТЕМЫ
        </button>
      </div>

      {/* Дровер прокачки характеристик */}
      {showUpgrades && (
        <div className="border border-white/20 bg-black/90 p-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="text-xs font-black uppercase text-pink-400">
              ПРОКАЧКА ХАРАКТЕРИСТИК
            </span>
            <span className="text-[0.62rem] font-bold text-pink-300">
              СВОБОДНО: {state.skillPoints} SP
            </span>
          </div>

          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="p-2 border border-white/10 flex flex-col justify-between">
              <div>
                <span className="font-black text-xs text-white">
                  МОЩНОСТЬ CPU (+{state.attributes?.cpu ?? 0})
                </span>
                <p className="text-[0.55rem] text-white/50 mt-1">
                  Увеличивает доход байтов во всех мини-играх на +10%.
                </p>
              </div>
              <button
                onClick={() => handleUpgradeStat("cpu")}
                disabled={state.skillPoints <= 0}
                type="button"
                className="mt-2 border border-pink-500 py-1 text-xs font-black uppercase text-pink-400 disabled:opacity-30"
              >
                +1 CPU (1 SP)
              </button>
            </div>

            <div className="p-2 border border-white/10 flex flex-col justify-between">
              <div>
                <span className="font-black text-xs text-white">
                  ОБЪЕМ ОЗУ (+{state.attributes?.ram ?? 0})
                </span>
                <p className="text-[0.55rem] text-white/50 mt-1">
                  Увеличивает максимальный запас энергии на +10.
                </p>
              </div>
              <button
                onClick={() => handleUpgradeStat("ram")}
                disabled={state.skillPoints <= 0}
                type="button"
                className="mt-2 border border-pink-500 py-1 text-xs font-black uppercase text-pink-400 disabled:opacity-30"
              >
                +1 ОЗУ (1 SP)
              </button>
            </div>

            <div className="p-2 border border-white/10 flex flex-col justify-between">
              <div>
                <span className="font-black text-xs text-white">
                  ФАЕРВОЛ (+{state.attributes?.firewall ?? 0})
                </span>
                <p className="text-[0.55rem] text-white/50 mt-1">
                  Замедляет засорение кэша и защищает от вирусов.
                </p>
              </div>
              <button
                onClick={() => handleUpgradeStat("firewall")}
                disabled={state.skillPoints <= 0}
                type="button"
                className="mt-2 border border-pink-500 py-1 text-xs font-black uppercase text-pink-400 disabled:opacity-30"
              >
                +1 ФАЕРВОЛ (1 SP)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Дровер ежедневных квестов */}
      {showQuests && (
        <div className="border border-white/20 bg-black/90 p-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span
              className="text-xs font-black uppercase"
              style={{ color: themeColors.primary }}
            >
              ДИРЕКТИВЫ ДНЯ
            </span>
            <span className="text-[0.58rem] text-white/60">ОБНОВЛЕНИЕ 24Ч</span>
          </div>

          <div className="mt-2 flex flex-col gap-2">
            {state.dailyQuests.map((quest) => (
              <div
                key={quest.id}
                className="flex items-center justify-between p-2 border border-white/10 text-xs"
              >
                <div>
                  <span className="font-bold text-white">{quest.title}</span>
                  <p className="text-[0.55rem] text-white/50">{quest.desc}</p>
                </div>
                <div className="text-right">
                  <span
                    className="font-black"
                    style={{
                      color: quest.completed
                        ? themeColors.primary
                        : "rgba(255,255,255,0.7)",
                    }}
                  >
                    {quest.completed
                      ? "✓ ВЫПОЛНЕНО"
                      : `${quest.current} / ${quest.target}`}
                  </span>
                  <span className="block text-[0.52rem] text-yellow-400">
                    +{quest.rewardBytes} B | +{quest.rewardExp} EXP
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Дровер гардероба / модулей */}
      {showWardrobe && (
        <div className="border border-white/20 bg-black/90 p-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span
              className="text-xs font-black uppercase"
              style={{ color: themeColors.primary }}
            >
              МОДУЛИ И КИБЕР-ОБВЕСЫ
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <p className="text-[0.55rem] text-white/50 uppercase mb-1">
                ГОЛОВНОЙ МОДУЛЬ:
              </p>
              <div className="flex flex-col gap-1">
                {(["NONE", "VISOR", "HALO", "HORNS"] as HeadAccessory[]).map(
                  (h) => (
                    <button
                      key={h}
                      onClick={() => handleEquip(h, state.droneAccessory)}
                      type="button"
                      className="border p-1.5 text-left text-[0.58rem] font-bold uppercase transition"
                      style={{
                        borderColor:
                          state.headAccessory === h
                            ? themeColors.primary
                            : "rgba(255,255,255,0.1)",
                        color:
                          state.headAccessory === h
                            ? themeColors.primary
                            : "rgba(255,255,255,0.6)",
                      }}
                    >
                      {h === "NONE" && "БЕЗ МОДУЛЯ"}
                      {h === "VISOR" && "КИБЕР-ВИЗОР [==]"}
                      {h === "HALO" && "НЕОН-НИМБ <✦>"}
                      {h === "HORNS" && "РОГА РАЗГОНА //\\\\"}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div>
              <p className="text-[0.55rem] text-white/50 uppercase mb-1">
                СПУТНИК-ДРОН:
              </p>
              <div className="flex flex-col gap-1">
                {(["NONE", "BIT", "ORB", "MINI_DEMON"] as DroneAccessory[]).map(
                  (d) => (
                    <button
                      key={d}
                      onClick={() => handleEquip(state.headAccessory, d)}
                      type="button"
                      className="border p-1.5 text-left text-[0.58rem] font-bold uppercase transition"
                      style={{
                        borderColor:
                          state.droneAccessory === d
                            ? themeColors.primary
                            : "rgba(255,255,255,0.1)",
                        color:
                          state.droneAccessory === d
                            ? themeColors.primary
                            : "rgba(255,255,255,0.6)",
                      }}
                    >
                      {d === "NONE" && "БЕЗ ДРОНА"}
                      {d === "BIT" && "БИТ-СПУТНИК [01]"}
                      {d === "ORB" && "ОРБИТАЛЬНЫЙ ШАР (*)"}
                      {d === "MINI_DEMON" && "МИНИ-ДЕМОН <^>"}
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Панель настроек тем и переименования */}
      {showSettings && (
        <div className="border border-white/10 bg-black/80 p-3">
          <p className="text-[0.62rem] font-bold uppercase tracking-wider text-white/60 mb-2">
            ЦВЕТ ЛЮМИНОФОРА CRT-ЭКРАНА:
          </p>
          <div className="grid grid-cols-5 gap-2">
            {(
              ["green", "amber", "cyan", "magenta", "white"] as PetTheme[]
            ).map((t) => {
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
                  placeholder="НОВОЕ ИМЯ"
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
                  СОХРАНИТЬ
                </button>
                <button
                  onClick={() => setIsRenaming(false)}
                  type="button"
                  className="px-2 py-1 text-xs text-white/50"
                >
                  ОТМЕНА
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
                ПЕРЕИМЕНОВАТЬ ДЕМОНА [{state.name}]
              </button>
            )}

            <button
              onClick={handleNewGeneration}
              type="button"
              className="text-[0.58rem] uppercase font-bold text-yellow-400 hover:text-yellow-300 ml-auto"
            >
              НОВОЕ ПОКОЛЕНИЕ (GEN {state.generation + 1})
            </button>
          </div>
        </div>
      )}

      {/* Модалка активной мини-игры */}
      {activeGame !== "NONE" && (
        <TamagotchiGames
          cpuLevel={state.attributes?.cpu ?? 0}
          gameType={activeGame}
          onClose={() => setActiveGame("NONE")}
          onFinish={handleGameFinish}
          soundEnabled={state.soundEnabled}
          theme={state.theme}
        />
      )}

      {/* Модалка паспорта */}
      {showPassport && (
        <TamagotchiPassport
          onClose={() => setShowPassport(false)}
          state={state}
        />
      )}

      {/* Главный боевой режим Rogue-Lite: Vampire Survivors */}
      {showSurvivors && (
        <TamagotchiSurvivors
          onClose={() => setShowSurvivors(false)}
          onFinishRun={handleFinishSurvivors}
          tamagotchi={state}
        />
      )}

      {/* Мета-прогрессия: Древо навыков за байты */}
      {showSkillTree && (
        <TamagotchiSkillTree
          onClose={() => setShowSkillTree(false)}
          onUpdateState={(nextState) => {
            setState(nextState);
            saveTamagotchiState(nextState);
          }}
          state={state}
        />
      )}
    </div>
  );
}
