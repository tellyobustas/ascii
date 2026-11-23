import {
  DEFAULT_SKILL_TREE,
  getSkillNodeCost,
  SKILL_TREE_NODES,
} from "./skill-tree";
import {
  FOOD_MENU,
  STAGE_NAMES_RU,
  type DroneAccessory,
  type HeadAccessory,
  type PetMood,
  type PetStage,
  type Quest,
  type TamagotchiState,
} from "./types";

const STORAGE_KEY = "asciilograph_tamagotchi_v1";

export const INITIAL_QUESTS: Quest[] = [
  {
    id: "feed_3",
    title: "КИБЕР-ОБЕД",
    desc: "Покормить питомца 3 раза",
    target: 3,
    current: 0,
    rewardBytes: 15,
    rewardExp: 40,
    completed: false,
  },
  {
    id: "play_2",
    title: "МАСТЕР АРКАД",
    desc: "Сыграть в мини-игры 2 раза",
    target: 2,
    current: 0,
    rewardBytes: 25,
    rewardExp: 60,
    completed: false,
  },
  {
    id: "clean_1",
    title: "ДЕФРАГМЕНТАЦИЯ",
    desc: "Очистить кэш буфера 1 раз",
    target: 1,
    current: 0,
    rewardBytes: 12,
    rewardExp: 35,
    completed: false,
  },
];

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
  droneAccessory: "NONE",
  dailyQuests: INITIAL_QUESTS,
  lastWheelSpin: 0,
  skillTree: DEFAULT_SKILL_TREE,
  bestSurvivorTime: 0,
  bestSurvivorKills: 0,
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
  let exp = state.exp + amount;
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

  if (currentState.isSleeping) {
    energy = Math.min(maxEnergy, energy + hours * 18);
    happiness = Math.max(0, happiness - hours * 1.5);
    cleanliness = Math.max(0, cleanliness - hours * 1.5 * bugResistFactor);
  } else {
    energy = Math.max(0, energy - hours * 6);
    happiness = Math.max(0, happiness - hours * 5);
    cleanliness = Math.max(0, cleanliness - hours * 4 * bugResistFactor);
  }

  if (cleanliness < 50 && poopCount < 1) poopCount = 1;
  if (cleanliness < 30 && poopCount < 2) poopCount = 2;
  if (cleanliness < 15 && poopCount < 3) poopCount = 3;
  if (cleanliness <= 5 && poopCount < 4) {
    poopCount = 4;
    if (Math.random() > fw * 0.15) hasVirus = true;
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

  if (state.energy < 2) {
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

  let nextState: TamagotchiState = {
    ...state,
    energy: Math.max(0, state.energy - 1),
    happiness: Math.min(100, state.happiness + happyGain),
    totalPetted: state.totalPetted + 1,
    lastPetted: now,
    lastTick: now,
  };

  nextState = addExp(nextState, expGain);

  return {
    state: nextState,
    success: true,
    message: `Поглажен ${state.name}! Синхронизация +${happyGain}%, Опыт +${expGain}`,
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

  if (state.energy < 4) {
    return {
      state,
      success: false,
      message: "Недостаточно энергии для очистки (-4% Энергии).",
    };
  }

  const hadBugs = state.poopCount > 0;
  const rewardBytes = state.poopCount * 4 + 3;

  let nextState: TamagotchiState = {
    ...state,
    energy: Math.max(0, state.energy - 4),
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
  const nextState: TamagotchiState = {
    ...state,
    isSleeping,
    lastTick: Date.now(),
  };

  return {
    state: nextState,
    isSleeping,
    message: isSleeping
      ? "Вход в режим гибернации (Зарядка включена)..."
      : "Гибернация завершена. Питомец онлайн!",
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
): TamagotchiState {
  return {
    ...state,
    headAccessory: head,
    droneAccessory: drone,
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
      dailyQuests: parsed.dailyQuests ?? INITIAL_QUESTS,
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
