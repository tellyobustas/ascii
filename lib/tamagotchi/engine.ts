import { COMBAT_BUFFS, type CombatBuffType } from "./combat-buffs";
import {
  DAILY_CONTRACT_BONUS,
  DAILY_LOGIN_REWARDS,
  generateDailyQuests,
  getTodayDateString,
  getYesterdayDateString,
} from "./daily";
import {
  DEFAULT_SKILL_TREE,
  getSkillNodeCost,
  SKILL_TREE_NODES,
} from "./skill-tree";
import {
  FOOD_MENU,
  STAGE_NAMES_RU,
  type BodyAccessory,
  type DroneAccessory,
  type HeadAccessory,
  type PetMood,
  type PetStage,
  type Quest,
  type TamagotchiState,
} from "./types";

const STORAGE_KEY = "asciilograph_tamagotchi_v1";

export const DEFAULT_INVENTORY_BUFFS: Record<CombatBuffType, number> = {
  NONE: 0,
  BLADEMAIL: 0,
  BERSERK: 0,
  TESLA: 0,
  VAMPIRISM: 0,
  QUANTUM_RISK: 0,
};

export const INITIAL_QUESTS: Quest[] = generateDailyQuests("2026-11-23");

export const DEFAULT_TAMAGOTCHI_STATE: TamagotchiState = {
  name: "CORE-01",
  stage: "EGG",
  level: 1,
  exp: 0,
  expToNextLevel: 40,
  skillPoints: 0,
  attributes: {
    cpu: 0,
    ram: 0,
    firewall: 0,
  },
  hp: 100,
  energy: 80,
  happiness: 80,
  cleanliness: 95,
  isSleeping: false,
  bytes: 30,
  generation: 1,
  birthDate: 0,
  lastTick: 0,
  lastPetted: 0,
  totalPetted: 0,
  totalFed: 0,
  totalCleaned: 0,
  gamesWon: 0,
  theme: "green",
  soundEnabled: true,
  poopCount: 0,
  hasVirus: false,
  eggWarmCycles: 0,
  headAccessory: "NONE",
  bodyAccessory: "NONE",
  droneAccessory: "NONE",
  dailyQuests: INITIAL_QUESTS,
  lastWheelSpin: 0,
  skillTree: DEFAULT_SKILL_TREE,
  bestSurvivorTime: 0,
  bestSurvivorKills: 0,
  dailyStreak: 1,
  lastLoginDate: "",
  claimedDailyRewardToday: false,
  lastQuestDate: "",
  dailyContractClaimed: false,
  morningBoostUntil: 0,
  inventoryBuffs: DEFAULT_INVENTORY_BUFFS,
  activeCombatBuff: null,
};

export function getMaxEnergy(state: TamagotchiState): number {
  return 100 + (state.attributes?.ram ?? 0) * 10;
}

export function calculateMood(state: TamagotchiState): PetMood {
  if (state.hp <= 0) return "PANIC";
  if (state.isSleeping) return "SLEEPING";
  if (state.hasVirus || state.hp < 30) return "SICK";
  if (state.poopCount >= 2 || state.cleanliness < 35) return "DIRTY";
  if (state.energy < 25) return "HUNGRY";
  if (state.happiness >= 80 && state.hp >= 70) return "ECSTATIC";
  if (state.happiness >= 50) return "HAPPY";
  return "NORMAL";
}

export function checkEvolution(state: TamagotchiState): {
  evolved: boolean;
  newStage: PetStage;
  message?: string;
} {
  let newStage = state.stage;

  if (state.stage === "EGG" && state.eggWarmCycles >= 5) {
    newStage = "NIBBLE";
  } else if (state.stage === "NIBBLE" && state.level >= 3) {
    newStage = "SPARK";
  } else if (state.stage === "SPARK" && state.level >= 5) {
    newStage = "IMP";
  } else if (state.stage === "IMP" && state.level >= 7) {
    newStage = "PROTO_DAEMON";
  } else if (state.stage === "PROTO_DAEMON" && state.level >= 10) {
    newStage = "DAEMON_CORE";
  } else if (state.stage === "DAEMON_CORE" && state.level >= 14) {
    newStage = "CYBER_ARMOR";
  } else if (state.stage === "CYBER_ARMOR" && state.level >= 18) {
    newStage = "NEO_OVERLORD";
  } else if (state.stage === "NEO_OVERLORD" && state.level >= 25) {
    newStage = "OMEGA_DEITY";
  }

  if (newStage !== state.stage) {
    const stageName = STAGE_NAMES_RU[newStage] ?? newStage;
    return {
      evolved: true,
      newStage,
      message: `⚡ МУТАЦИЯ ЯДРА! ${state.name} эволюционировал в форму «${stageName}»!`,
    };
  }

  return { evolved: false, newStage: state.stage };
}

export function addExp(state: TamagotchiState, amount: number): TamagotchiState {
  const visorBonus = state.headAccessory === "VISOR" ? 1.15 : 1.0;
  const actualAmount = Math.max(1, Math.round(amount * visorBonus));
  let exp = state.exp + actualAmount;
  let level = state.level;
  let expToNextLevel = state.expToNextLevel;
  let bytes = state.bytes;
  let skillPoints = state.skillPoints;

  while (exp >= expToNextLevel) {
    exp -= expToNextLevel;
    level += 1;
    skillPoints += 1; // +1 очко прокачки за уровень!
    expToNextLevel = Math.floor(expToNextLevel * 1.3) + 20;
    bytes += level * 6; // Награда байтами
  }

  let updated: TamagotchiState = {
    ...state,
    exp,
    level,
    expToNextLevel,
    skillPoints,
    bytes,
  };

  const evo = checkEvolution(updated);
  if (evo.evolved) {
    updated = { ...updated, stage: evo.newStage };
  }

  return updated;
}

export function advanceQuest(
  state: TamagotchiState,
  questId: string,
  amount = 1,
): { state: TamagotchiState; questMessage: string | null } {
  let rewardBytes = 0;
  let rewardExp = 0;
  let completedTitle: string | null = null;

  const nextQuests = state.dailyQuests.map((q) => {
    if (q.id === questId && !q.completed) {
      const nextVal = q.current + amount;
      if (nextVal >= q.target) {
        rewardBytes += q.rewardBytes;
        rewardExp += q.rewardExp;
        completedTitle = q.title;
        return { ...q, current: q.target, completed: true };
      }
      return { ...q, current: nextVal };
    }
    return q;
  });

  if (rewardBytes > 0) {
    let nextState = {
      ...state,
      bytes: state.bytes + rewardBytes,
      dailyQuests: nextQuests,
    };
    nextState = addExp(nextState, rewardExp);
    return {
      state: nextState,
      questMessage: `🏆 КВЕСТ ВЫПОЛНЕН [${completedTitle}]: +${rewardBytes} БАЙТОВ, +${rewardExp} EXP!`,
    };
  }

  return { state: { ...state, dailyQuests: nextQuests }, questMessage: null };
}

export function applyTimeDecay(
  currentState: TamagotchiState,
  elapsedSeconds: number,
): TamagotchiState {
  if (currentState.stage === "EGG") {
    return { ...currentState, lastTick: Date.now() };
  }

  const safeElapsed = Math.min(Math.max(0, elapsedSeconds), 43200);
  if (safeElapsed <= 0) return currentState;

  const hours = safeElapsed / 3600;
  const maxEnergy = getMaxEnergy(currentState);

  let energy = currentState.energy;
  let happiness = currentState.happiness;
  let cleanliness = currentState.cleanliness;
  let hp = currentState.hp;
  let poopCount = currentState.poopCount;
  let hasVirus = currentState.hasVirus;

  const fw = currentState.attributes?.firewall ?? 0;
  const bugResistFactor = Math.max(0.4, 1 - fw * 0.1);

  const currentHour = new Date().getHours();
  const isNight = currentHour >= 23 || currentHour < 7;
  const hasForceField = currentState.bodyAccessory === "FORCE_FIELD";
  const hasHorns = currentState.headAccessory === "HORNS";
  const hasHalo = currentState.headAccessory === "HALO";
  const hasOrb = currentState.droneAccessory === "ORB";
  const hasTesla = currentState.bodyAccessory === "TESLA_COILS";

  let bytes = currentState.bytes ?? 0;
  if (hasTesla) {
    bytes += Math.floor(hours * 120); // +2 Байта в минуту пассивно
  }

  if (currentState.isSleeping) {
    // Ночной сон: ускоренное восстановление заряда (+24/ч), рога дают оверклок x1.8
    const baseSpeed = isNight ? 24 : 18;
    const chargeSpeed = hasHorns ? baseSpeed * 1.8 : baseSpeed;
    energy = Math.min(maxEnergy, energy + hours * chargeSpeed);
    const nightDecayMult = hasForceField ? 0.5 : 1.0;
    happiness = Math.max(0, happiness - hours * (isNight ? 1.0 : 1.5) * nightDecayMult);
    // Откат чистоты от ночной дефрагментации (требует утренней очистки)
    cleanliness = Math.max(0, cleanliness - hours * (isNight ? 2.5 : 1.5) * bugResistFactor * nightDecayMult);
  } else {
    // Ночное бодрствование: ночной перегрев (+40% истощения), силовой каркас защищает
    const nightFatigue = (isNight ? 1.4 : 1.0) * (hasForceField ? 0.6 : 1.0);
    energy = Math.max(0, energy - hours * 6 * nightFatigue);
    happiness = Math.max(0, happiness - hours * 5 * nightFatigue);
    cleanliness = Math.max(0, cleanliness - hours * 4 * bugResistFactor * nightFatigue);
  }

  // Орбитальный шар сжигает мусор и снижает баги
  const bugThresholdMult = hasOrb ? 0.5 : 1.0;
  if (cleanliness < 50 * bugThresholdMult && poopCount < 1) poopCount = 1;
  if (cleanliness < 30 * bugThresholdMult && poopCount < 2) poopCount = 2;
  if (cleanliness < 15 * bugThresholdMult && poopCount < 3) poopCount = 3;
  if (cleanliness <= 5 && poopCount < 4) {
    poopCount = 4;
    if (Math.random() > fw * 0.15) hasVirus = true;
  }

  // Неон-нимб дает полный иммунитет к вирусам
  if (hasHalo) {
    hasVirus = false;
  }

  if (energy <= 0) {
    hp = Math.max(0, hp - hours * 10);
  }
  if (hasVirus) {
    hp = Math.max(0, hp - hours * 8);
  }

  return {
    ...currentState,
    energy: Math.round(energy),
    happiness: Math.round(happiness),
    cleanliness: Math.round(cleanliness),
    hp: Math.round(hp),
    bytes,
    poopCount,
    hasVirus,
    lastTick: Date.now(),
  };
}

export function warmEgg(state: TamagotchiState): {
  state: TamagotchiState;
  hatched: boolean;
  message: string;
} {
  const eggWarmCycles = state.eggWarmCycles + 1;
  let nextState: TamagotchiState = {
    ...state,
    eggWarmCycles,
    bytes: state.bytes + 3,
    lastTick: Date.now(),
  };

  if (eggWarmCycles >= 5) {
    nextState = {
      ...nextState,
      stage: "NIBBLE",
      level: 1,
      exp: 0,
      expToNextLevel: 40,
      skillPoints: 1,
      hp: 100,
      energy: 95,
      happiness: 90,
      cleanliness: 100,
      bytes: nextState.bytes + 20,
    };
    return {
      state: nextState,
      hatched: true,
      message: "✦ ВЫЛУПЛЕНИЕ! Приветствуй своего нового Байт-малыша! ✦",
    };
  }

  return {
    state: nextState,
    hatched: false,
    message: `Ядро прогрето! Температура инкубации: ${eggWarmCycles * 20}%`,
  };
}

export function feedPet(
  state: TamagotchiState,
  foodId: string,
): { state: TamagotchiState; success: boolean; message: string } {
  if (state.stage === "EGG") {
    return { state, success: false, message: "Яйцо не ест! Прогрей ядро." };
  }
  if (state.hp <= 0) {
    return { state, success: false, message: "Сбой системы! Нужен ребут." };
  }
  if (state.isSleeping) {
    return { state, success: false, message: "Питомец спит! Сначала разбуди." };
  }

  const food = FOOD_MENU.find((f) => f.id === foodId) ?? FOOD_MENU[0];
  if (!food) {
    return { state, success: false, message: "Неизвестный пакет данных." };
  }

  if (state.bytes < food.cost) {
    return {
      state,
      success: false,
      message: `Мало байтов! Нужно ${food.cost} B (в наличии: ${state.bytes} B).`,
    };
  }

  const maxEnergy = getMaxEnergy(state);
  if (state.energy >= maxEnergy) {
    return {
      state,
      success: false,
      message: "Буфер энергии полон! Питомец сыт.",
    };
  }

  let nextState: TamagotchiState = {
    ...state,
    bytes: state.bytes - food.cost,
    energy: Math.min(maxEnergy, state.energy + food.energyBoost),
    happiness: Math.min(100, state.happiness + food.happinessBoost),
    hp: Math.min(100, state.hp + food.integrityBoost),
    totalFed: state.totalFed + 1,
    lastTick: Date.now(),
  };

  nextState = addExp(nextState, 14 + Math.floor(food.cost * 1.5));
  const questResult = advanceQuest(nextState, "feed_3", 1);
  nextState = questResult.state;

  return {
    state: nextState,
    success: true,
    message: `${questResult.questMessage ? questResult.questMessage + " " : ""}Съеден ${food.name}! +${food.energyBoost}% Заряда, +${food.happinessBoost}% Настроения.`,
  };
}

export function petAnimal(state: TamagotchiState): {
  state: TamagotchiState;
  success: boolean;
  message: string;
} {
  if (state.stage === "EGG") {
    const res = warmEgg(state);
    return {
      state: res.state,
      success: true,
      message: res.message,
    };
  }
  if (state.hp <= 0) {
    return { state, success: false, message: "Система отключена! Нужен ребут." };
  }

  const energyCost = state.bodyAccessory === "EXO_SPINE" ? 0 : 1;
  if (energyCost > 0 && state.energy < energyCost) {
    return {
      state,
      success: false,
      message: "Питомец слишком устал. Покорми его или дай поспать!",
    };
  }

  const now = Date.now();
  const timeSinceLastPet = (now - state.lastPetted) / 1000;
  const expGain = timeSinceLastPet > 4 ? 6 : 1;
  const happyGain = timeSinceLastPet > 4 ? 8 : 2;

  const bitBonus = state.droneAccessory === "BIT" ? 1 : 0;
  const visorCache = state.headAccessory === "VISOR" && Math.random() < 0.25 ? 3 : 0;
  const earnedBytes = bitBonus + visorCache;

  let nextState: TamagotchiState = {
    ...state,
    energy: Math.max(0, state.energy - energyCost),
    happiness: Math.min(100, state.happiness + happyGain),
    bytes: state.bytes + earnedBytes,
    totalPetted: state.totalPetted + 1,
    lastPetted: now,
    lastTick: now,
  };

  nextState = addExp(nextState, expGain);

  const bonusMsg = earnedBytes > 0 ? ` (+${earnedBytes} Байт от модулей!)` : "";
  return {
    state: nextState,
    success: true,
    message: `Поглажен ${state.name}! Синхрон +${happyGain}%, Опыт +${expGain}${bonusMsg}`,
  };
}

export function cleanPet(state: TamagotchiState): {
  state: TamagotchiState;
  success: boolean;
  message: string;
} {
  if (state.stage === "EGG") {
    return { state, success: false, message: "Оболочка ядра стерильна." };
  }

  const energyCost = state.bodyAccessory === "EXO_SPINE" ? 2 : 4;
  if (state.energy < energyCost) {
    return {
      state,
      success: false,
      message: `Недостаточно энергии для очистки (-${energyCost}% Энергии).`,
    };
  }

  const hadBugs = state.poopCount > 0;
  const rewardBytes = state.poopCount * 4 + 3;

  let nextState: TamagotchiState = {
    ...state,
    energy: Math.max(0, state.energy - energyCost),
    cleanliness: 100,
    poopCount: 0,
    bytes: state.bytes + rewardBytes,
    totalCleaned: state.totalCleaned + 1,
    lastTick: Date.now(),
  };

  nextState = addExp(nextState, hadBugs ? 16 : 6);
  const questResult = advanceQuest(nextState, "clean_1", 1);
  nextState = questResult.state;

  return {
    state: nextState,
    success: true,
    message: `${questResult.questMessage ? questResult.questMessage + " " : ""}Буфер очищен! Кэш пуст (+${rewardBytes} Байтов, -4% Энергии).`,
  };
}

export function healPet(state: TamagotchiState): {
  state: TamagotchiState;
  success: boolean;
  message: string;
} {
  if (state.stage === "EGG") {
    return { state, success: false, message: "Яйцо не заражено." };
  }

  const healCost = 10;
  let nextState: TamagotchiState = {
    ...state,
    hp: Math.min(100, state.hp + 50),
    hasVirus: false,
    bytes: Math.max(0, state.bytes - healCost),
    lastTick: Date.now(),
  };

  nextState = addExp(nextState, 12);

  return {
    state: nextState,
    success: true,
    message: "Антивирусный патч применен! Целостность восстановлена.",
  };
}

export function toggleSleep(state: TamagotchiState): {
  state: TamagotchiState;
  isSleeping: boolean;
  message: string;
} {
  if (state.stage === "EGG") {
    return { state, isSleeping: false, message: "Яйцо не может спать." };
  }

  const isSleeping = !state.isSleeping;
  let morningBoostUntil = state.morningBoostUntil ?? 0;
  let message = isSleeping
    ? "Вход в режим гибернации (Ночная дефрагментация и зарядка)..."
    : "Гибернация завершена. Питомец онлайн!";

  // Пробуждение утром дает утренний оверклок (Cold Boot)
  if (!isSleeping && state.isSleeping) {
    const hour = new Date().getHours();
    if (hour >= 6 && hour <= 12) {
      morningBoostUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 часа
      message = "✦ УТРЕННИЙ БУСТ // COLD BOOT: +25% к опыту во всех играх на 2 часа! ✦";
    }
  }

  const nextState: TamagotchiState = {
    ...state,
    isSleeping,
    morningBoostUntil,
    lastTick: Date.now(),
  };

  return {
    state: nextState,
    isSleeping,
    message,
  };
}

export function upgradeAttribute(
  state: TamagotchiState,
  attr: "cpu" | "ram" | "firewall",
): { state: TamagotchiState; success: boolean; message: string } {
  if (state.skillPoints <= 0) {
    return { state, success: false, message: "Нет свободных очков навыков!" };
  }

  const currentAttrs = state.attributes ?? { cpu: 0, ram: 0, firewall: 0 };
  const nextAttrs = {
    ...currentAttrs,
    [attr]: currentAttrs[attr] + 1,
  };

  const attrNames = {
    cpu: "МОЩНОСТЬ CPU (+10% дохода с игр)",
    ram: "ОБЪЕМ ОЗУ (+10 макс. энергии)",
    firewall: "ФАЕРВОЛ (защита от багов)",
  };

  const nextState: TamagotchiState = {
    ...state,
    skillPoints: state.skillPoints - 1,
    attributes: nextAttrs,
  };

  return {
    state: nextState,
    success: true,
    message: `Прокачано: ${attrNames[attr]}! Очков осталось: ${nextState.skillPoints}`,
  };
}

export function spinLuckyWheel(state: TamagotchiState): {
  state: TamagotchiState;
  rewardText: string;
  success: boolean;
} {
  const isFree = Date.now() - (state.lastWheelSpin || 0) > 24 * 60 * 60 * 1000;
  const cost = isFree ? 0 : 10;

  if (!isFree && state.bytes < cost) {
    return {
      state,
      rewardText: `Нужно ${cost} байтов для спина!`,
      success: false,
    };
  }

  const roll = Math.random();
  let rewardText = "";
  let nextState = {
    ...state,
    bytes: state.bytes - cost,
    lastWheelSpin: Date.now(),
  };

  const maxEnergy = getMaxEnergy(nextState);

  if (roll < 0.35) {
    const gainBytes = 15 + Math.floor(Math.random() * 25);
    nextState.bytes += gainBytes;
    rewardText = `💰 ДЖЕКПОТ БАЙТОВ: +${gainBytes} B!`;
  } else if (roll < 0.65) {
    const gainExp = 40 + Math.floor(Math.random() * 60);
    nextState = addExp(nextState, gainExp);
    rewardText = `⚡ БУСТ ЗНАНИЙ: +${gainExp} EXP!`;
  } else if (roll < 0.85) {
    nextState.energy = maxEnergy;
    nextState.happiness = 100;
    rewardText = "✨ СВЕРХЗАРЯДКА: 100% Энергии и Синхронизации!";
  } else {
    // Редкий аксессуар
    const accs: HeadAccessory[] = ["VISOR", "HALO", "HORNS"];
    const picked = accs[Math.floor(Math.random() * accs.length)] ?? "VISOR";
    nextState.headAccessory = picked;
    rewardText = `👑 РЕДКИЙ МОДУЛЬ: Получен [${picked}]!`;
  }

  return { state: nextState, rewardText, success: true };
}

export function equipAccessory(
  state: TamagotchiState,
  head: HeadAccessory,
  drone: DroneAccessory,
  body?: BodyAccessory,
): TamagotchiState {
  return {
    ...state,
    headAccessory: head,
    droneAccessory: drone,
    bodyAccessory: body ?? state.bodyAccessory ?? "NONE",
  };
}

export function rebootPet(state: TamagotchiState): {
  state: TamagotchiState;
  message: string;
} {
  const maxEnergy = getMaxEnergy(state);
  const nextState: TamagotchiState = {
    ...state,
    hp: 60,
    energy: Math.floor(maxEnergy * 0.5),
    happiness: 50,
    cleanliness: 80,
    poopCount: 0,
    hasVirus: false,
    isSleeping: false,
    lastTick: Date.now(),
  };

  return {
    state: nextState,
    message: "⚡ АВАРИЙНЫЙ РЕБУТ УСПЕШЕН! Система восстановлена на 60%.",
  };
}

export function archiveAndHatchNewGen(
  state: TamagotchiState,
  newName = "CORE-02",
): { state: TamagotchiState; message: string } {
  const newGen = state.generation + 1;
  const bonusBytes = Math.max(
    40,
    Math.floor(state.bytes * 0.5) + state.level * 8,
  );

  const nextState: TamagotchiState = {
    ...DEFAULT_TAMAGOTCHI_STATE,
    name: newName,
    generation: newGen,
    bytes: bonusBytes,
    theme: state.theme,
    soundEnabled: state.soundEnabled,
    birthDate: Date.now(),
    lastTick: Date.now(),
    dailyQuests: INITIAL_QUESTS,
  };

  return {
    state: nextState,
    message: `✦ ПОКОЛЕНИЕ ${newGen} ИНИЦИИРОВАНО! Наследие: +${bonusBytes} Байтов. ✦`,
  };
}

export function saveTamagotchiState(state: TamagotchiState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore localStorage errors
  }
}

export function loadTamagotchiState(): TamagotchiState {
  if (typeof window === "undefined") return DEFAULT_TAMAGOTCHI_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const now = Date.now();
    if (!raw) {
      return {
        ...DEFAULT_TAMAGOTCHI_STATE,
        birthDate: now,
        lastTick: now,
        lastPetted: now,
      };
    }

    const parsed = JSON.parse(raw) as Partial<TamagotchiState>;
    const todayStr = getTodayDateString();
    const yesterdayStr = getYesterdayDateString();

    let dailyStreak = parsed.dailyStreak ?? 1;
    let claimedDailyRewardToday = parsed.claimedDailyRewardToday ?? false;
    const lastLogin = parsed.lastLoginDate ?? "";

    if (lastLogin !== todayStr) {
      if (lastLogin === yesterdayStr) {
        if (claimedDailyRewardToday) {
          dailyStreak = dailyStreak >= 7 ? 1 : dailyStreak + 1;
        }
      } else if (lastLogin !== "") {
        dailyStreak = 1;
      }
      claimedDailyRewardToday = false;
    }

    let dailyQuests = parsed.dailyQuests ?? INITIAL_QUESTS;
    let dailyContractClaimed = parsed.dailyContractClaimed ?? false;
    let lastQuestDate = parsed.lastQuestDate ?? "";

    if (lastQuestDate !== todayStr) {
      dailyQuests = generateDailyQuests(todayStr);
      dailyContractClaimed = false;
      lastQuestDate = todayStr;
    }

    const merged: TamagotchiState = {
      ...DEFAULT_TAMAGOTCHI_STATE,
      ...parsed,
      attributes: {
        ...DEFAULT_TAMAGOTCHI_STATE.attributes,
        ...(parsed.attributes ?? {}),
      },
      skillTree: {
        ...DEFAULT_SKILL_TREE,
        ...(parsed.skillTree ?? {}),
      },
      inventoryBuffs: {
        ...DEFAULT_INVENTORY_BUFFS,
        ...(parsed.inventoryBuffs ?? {}),
      },
      dailyQuests,
      dailyStreak,
      headAccessory: parsed.headAccessory ?? "NONE",
      bodyAccessory: parsed.bodyAccessory ?? "NONE",
      droneAccessory: parsed.droneAccessory ?? "NONE",
      lastLoginDate: parsed.lastLoginDate ?? "",
      claimedDailyRewardToday,
      lastQuestDate,
      dailyContractClaimed,
      morningBoostUntil: parsed.morningBoostUntil ?? 0,
      activeCombatBuff: parsed.activeCombatBuff ?? null,
      bestSurvivorTime: parsed.bestSurvivorTime ?? 0,
      bestSurvivorKills: parsed.bestSurvivorKills ?? 0,
    };

    const elapsedSeconds = Math.max(0, (now - (merged.lastTick || now)) / 1000);
    return applyTimeDecay(merged, elapsedSeconds);
  } catch {
    return DEFAULT_TAMAGOTCHI_STATE;
  }
}

export function buySkillTreeNode(
  state: TamagotchiState,
  nodeId: string,
): { state: TamagotchiState; success: boolean; message: string } {
  const node = SKILL_TREE_NODES[nodeId];
  if (!node) {
    return { state, success: false, message: "Неизвестный узел древа!" };
  }

  const currentLevel = state.skillTree?.[nodeId] ?? 0;
  if (currentLevel >= node.maxLevel) {
    return { state, success: false, message: "Узел уже прокачан до максимума!" };
  }

  const cost = getSkillNodeCost(nodeId, currentLevel);
  if (state.bytes < cost) {
    return {
      state,
      success: false,
      message: `Мало байтов! Нужно ${cost} B (в наличии: ${state.bytes} B).`,
    };
  }

  const nextSkillTree = {
    ...(state.skillTree ?? DEFAULT_SKILL_TREE),
    [nodeId]: currentLevel + 1,
  };

  const nextState: TamagotchiState = {
    ...state,
    bytes: state.bytes - cost,
    skillTree: nextSkillTree,
  };

  return {
    state: nextState,
    success: true,
    message: `Изучено: «${node.nameRu}» (Ур. ${currentLevel + 1}/${node.maxLevel})!`,
  };
}

export function claimDailyLoginReward(state: TamagotchiState): {
  state: TamagotchiState;
  success: boolean;
  message: string;
} {
  if (state.claimedDailyRewardToday) {
    return {
      state,
      success: false,
      message: "Награда за сегодняшний день уже получена! Возвращайся завтра.",
    };
  }

  const streak = Math.max(1, Math.min(7, state.dailyStreak || 1));
  const reward =
    DAILY_LOGIN_REWARDS.find((r) => r.day === streak) ?? DAILY_LOGIN_REWARDS[0]!;

  const maxEnergy = getMaxEnergy(state);
  const nextInv = { ...(state.inventoryBuffs ?? DEFAULT_INVENTORY_BUFFS) };
  if (reward.freeBuff && reward.freeBuff !== "NONE") {
    nextInv[reward.freeBuff] = (nextInv[reward.freeBuff] ?? 0) + 1;
  }

  let nextState: TamagotchiState = {
    ...state,
    bytes: state.bytes + reward.bytes,
    skillPoints: state.skillPoints + reward.skillPoints,
    energy: maxEnergy, // Полная подзарядка
    claimedDailyRewardToday: true,
    lastLoginDate: getTodayDateString(),
    inventoryBuffs: nextInv,
    lastTick: Date.now(),
  };

  nextState = addExp(nextState, reward.exp);

  return {
    state: nextState,
    success: true,
    message: `✦ ПОЛУЧЕНО [ДЕНЬ ${streak}]: +${reward.bytes} B, +${reward.exp} EXP${reward.skillPoints ? `, +${reward.skillPoints} SP` : ""}${reward.freeBuff ? `, Оверклок «${reward.freeBuff}»` : ""}! ✦`,
  };
}

export function claimDailyContract(state: TamagotchiState): {
  state: TamagotchiState;
  success: boolean;
  message: string;
} {
  const allCompleted = state.dailyQuests.every((q) => q.completed);
  if (!allCompleted) {
    return {
      state,
      success: false,
      message: "Выполни все 4 ежедневных директивы для получения бонуса!",
    };
  }

  if (state.dailyContractClaimed) {
    return {
      state,
      success: false,
      message: "Квантовый контейнер дня уже открыт! Обновление завтра.",
    };
  }

  let nextState: TamagotchiState = {
    ...state,
    bytes: state.bytes + DAILY_CONTRACT_BONUS.bytes,
    skillPoints: state.skillPoints + DAILY_CONTRACT_BONUS.skillPoints,
    dailyContractClaimed: true,
    lastTick: Date.now(),
  };

  nextState = addExp(nextState, DAILY_CONTRACT_BONUS.exp);

  return {
    state: nextState,
    success: true,
    message: `★ КВАНТОВЫЙ КОНТЕЙНЕР ОТКРЫТ! +${DAILY_CONTRACT_BONUS.bytes} B, +${DAILY_CONTRACT_BONUS.exp} EXP, +${DAILY_CONTRACT_BONUS.skillPoints} SP! ★`,
  };
}

export function buyCombatBuff(
  state: TamagotchiState,
  buffType: CombatBuffType,
): { state: TamagotchiState; success: boolean; message: string } {
  if (buffType === "NONE") {
    return {
      state: { ...state, activeCombatBuff: null },
      success: true,
      message: "Боевой оверклок снят.",
    };
  }

  const def = COMBAT_BUFFS[buffType];
  if (!def) {
    return { state, success: false, message: "Неизвестный оверклок!" };
  }

  const nextInv = { ...(state.inventoryBuffs ?? DEFAULT_INVENTORY_BUFFS) };
  const hasFree = (nextInv[buffType] ?? 0) > 0;

  if (hasFree) {
    nextInv[buffType] = Math.max(0, nextInv[buffType] - 1);
    return {
      state: {
        ...state,
        inventoryBuffs: nextInv,
        activeCombatBuff: buffType,
      },
      success: true,
      message: `Активирован бесплатный чип «${def.nameRu}»!`,
    };
  }

  if (state.bytes < def.cost) {
    return {
      state,
      success: false,
      message: `Мало байтов! Нужно ${def.cost} B (в наличии: ${state.bytes} B).`,
    };
  }

  return {
    state: {
      ...state,
      bytes: state.bytes - def.cost,
      activeCombatBuff: buffType,
    },
    success: true,
    message: `Приобретен и активирован оверклок «${def.nameRu}» на 1 рейд!`,
  };
}

export function setActiveCombatBuff(
  state: TamagotchiState,
  buffType: CombatBuffType | null,
): TamagotchiState {
  return {
    ...state,
    activeCombatBuff: buffType,
  };
}
