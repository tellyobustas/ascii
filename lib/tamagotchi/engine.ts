import {
  FOOD_MENU,
  type PetMood,
  type PetStage,
  type TamagotchiState,
} from "./types";

const STORAGE_KEY = "asciilograph_tamagotchi_v1";

export const DEFAULT_TAMAGOTCHI_STATE: TamagotchiState = {
  name: "CORE-01",
  stage: "EGG",
  level: 1,
  exp: 0,
  expToNextLevel: 50,
  hp: 100,
  energy: 85,
  happiness: 80,
  cleanliness: 95,
  isSleeping: false,
  bytes: 25,
  generation: 1,
  birthDate: Date.now(),
  lastTick: Date.now(),
  lastPetted: Date.now(),
  totalPetted: 0,
  totalFed: 0,
  totalCleaned: 0,
  gamesWon: 0,
  theme: "green",
  soundEnabled: true,
  poopCount: 0,
  hasVirus: false,
  eggWarmCycles: 0,
};

export function calculateMood(state: TamagotchiState): PetMood {
  if (state.hp <= 0) return "PANIC";
  if (state.isSleeping) return "SLEEPING";
  if (state.hasVirus || state.hp < 30) return "SICK";
  if (state.poopCount >= 2 || state.cleanliness < 35) return "DIRTY";
  if (state.energy < 30) return "HUNGRY";
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
    newStage = "BABY";
  } else if (state.stage === "BABY" && state.level >= 3) {
    newStage = "TEEN";
  } else if (state.stage === "TEEN" && state.level >= 8) {
    newStage = "ADULT";
  } else if (
    state.stage === "ADULT" &&
    state.level >= 20 &&
    state.happiness >= 85 &&
    state.hp >= 85
  ) {
    newStage = "OVERCLOCK";
  }

  if (newStage !== state.stage) {
    return {
      evolved: true,
      newStage,
      message: `⚡ SYSTEM EVOLUTION! ${state.name} evolved into ${newStage}!`,
    };
  }

  return { evolved: false, newStage: state.stage };
}

function addExp(state: TamagotchiState, amount: number): TamagotchiState {
  let exp = state.exp + amount;
  let level = state.level;
  let expToNextLevel = state.expToNextLevel;
  let bytes = state.bytes;

  while (exp >= expToNextLevel) {
    exp -= expToNextLevel;
    level += 1;
    expToNextLevel = Math.floor(expToNextLevel * 1.35) + 20;
    bytes += level * 5; // Level up reward
  }

  const updated: TamagotchiState = {
    ...state,
    exp,
    level,
    expToNextLevel,
    bytes,
  };

  const evo = checkEvolution(updated);
  if (evo.evolved) {
    updated.stage = evo.newStage;
  }

  return updated;
}

export function applyTimeDecay(
  currentState: TamagotchiState,
  elapsedSeconds: number,
): TamagotchiState {
  if (currentState.stage === "EGG") {
    return { ...currentState, lastTick: Date.now() };
  }

  // Cap elapsed time to 12 hours (43200 seconds) max offline decay
  const safeElapsed = Math.min(Math.max(0, elapsedSeconds), 43200);
  if (safeElapsed <= 0) return currentState;

  // Rate per hour:
  // Energy: ~6% per hour awake, ~2% if sleeping (or +10% recharge if sleeping!)
  const hours = safeElapsed / 3600;

  let energy = currentState.energy;
  let happiness = currentState.happiness;
  let cleanliness = currentState.cleanliness;
  let hp = currentState.hp;
  let poopCount = currentState.poopCount;
  let hasVirus = currentState.hasVirus;

  if (currentState.isSleeping) {
    // Regenerate energy during sleep
    energy = Math.min(100, energy + hours * 15);
    happiness = Math.max(0, happiness - hours * 2);
    cleanliness = Math.max(0, cleanliness - hours * 2);
  } else {
    energy = Math.max(0, energy - hours * 6);
    happiness = Math.max(0, happiness - hours * 5);
    cleanliness = Math.max(0, cleanliness - hours * 4);
  }

  // Generate poop / bugs when cleanliness drops
  if (cleanliness < 50 && poopCount < 1) poopCount = 1;
  if (cleanliness < 30 && poopCount < 2) poopCount = 2;
  if (cleanliness < 15 && poopCount < 3) poopCount = 3;
  if (cleanliness <= 5 && poopCount < 4) {
    poopCount = 4;
    hasVirus = true;
  }

  // Health drops if starved or sick
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
    bytes: state.bytes + 2,
    lastTick: Date.now(),
  };

  if (eggWarmCycles >= 5) {
    nextState = {
      ...nextState,
      stage: "BABY",
      level: 1,
      exp: 0,
      expToNextLevel: 40,
      hp: 100,
      energy: 95,
      happiness: 90,
      cleanliness: 100,
      bytes: nextState.bytes + 15,
    };
    return {
      state: nextState,
      hatched: true,
      message: "✦ KERNEL HATCHED! Welcome your new Byte Pet! ✦",
    };
  }

  return {
    state: nextState,
    hatched: false,
    message: `Core warmed! Temperature: ${eggWarmCycles * 20}%`,
  };
}

export function feedPet(
  state: TamagotchiState,
  foodId: string,
): { state: TamagotchiState; success: boolean; message: string } {
  if (state.stage === "EGG") {
    return { state, success: false, message: "Eggs cannot eat! Warm the core first." };
  }
  if (state.hp <= 0) {
    return { state, success: false, message: "System crash! Reboot required." };
  }
  if (state.isSleeping) {
    return { state, success: false, message: "Pet is sleeping! Wake it up first." };
  }

  const food = FOOD_MENU.find((f) => f.id === foodId) ?? FOOD_MENU[0];
  if (!food) {
    return { state, success: false, message: "Invalid food item." };
  }

  if (state.bytes < food.cost) {
    return {
      state,
      success: false,
      message: `Not enough Bytes! Need ${food.cost} B (Have: ${state.bytes} B).`,
    };
  }

  if (state.energy >= 98) {
    return {
      state,
      success: false,
      message: "Buffer full! Pet is not hungry.",
    };
  }

  let nextState: TamagotchiState = {
    ...state,
    bytes: state.bytes - food.cost,
    energy: Math.min(100, state.energy + food.energyBoost),
    happiness: Math.min(100, state.happiness + food.happinessBoost),
    hp: Math.min(100, state.hp + food.integrityBoost),
    totalFed: state.totalFed + 1,
    lastTick: Date.now(),
  };

  nextState = addExp(nextState, 12 + Math.floor(food.cost * 1.5));

  return {
    state: nextState,
    success: true,
    message: `Consumed ${food.name}! +${food.energyBoost}% Energy, +${food.happinessBoost}% Sync.`,
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
    return { state, success: false, message: "System down! Reboot required." };
  }

  const now = Date.now();
  const timeSinceLastPet = (now - state.lastPetted) / 1000;

  // Diminishing returns if spamming faster than 4 seconds
  const expGain = timeSinceLastPet > 4 ? 6 : 1;
  const happyGain = timeSinceLastPet > 4 ? 8 : 2;

  let nextState: TamagotchiState = {
    ...state,
    happiness: Math.min(100, state.happiness + happyGain),
    totalPetted: state.totalPetted + 1,
    lastPetted: now,
    lastTick: now,
  };

  nextState = addExp(nextState, expGain);

  return {
    state: nextState,
    success: true,
    message: `Pet ${state.name}! Sync +${happyGain}%, EXP +${expGain}`,
  };
}

export function cleanPet(state: TamagotchiState): {
  state: TamagotchiState;
  success: boolean;
  message: string;
} {
  if (state.stage === "EGG") {
    return { state, success: false, message: "Egg shell is sterile." };
  }

  const hadBugs = state.poopCount > 0;
  const rewardBytes = state.poopCount * 3 + 2;

  let nextState: TamagotchiState = {
    ...state,
    cleanliness: 100,
    poopCount: 0,
    bytes: state.bytes + rewardBytes,
    totalCleaned: state.totalCleaned + 1,
    lastTick: Date.now(),
  };

  nextState = addExp(nextState, hadBugs ? 15 : 5);

  return {
    state: nextState,
    success: true,
    message: `Buffer purged! Cleaned cache (+${rewardBytes} Bytes).`,
  };
}

export function healPet(state: TamagotchiState): {
  state: TamagotchiState;
  success: boolean;
  message: string;
} {
  if (state.stage === "EGG") {
    return { state, success: false, message: "Egg has no viruses." };
  }

  const healCost = 10;
  if (state.bytes < healCost && state.bytes > 0) {
    // Allow free basic patch if poor
  }

  let nextState: TamagotchiState = {
    ...state,
    hp: Math.min(100, state.hp + 45),
    hasVirus: false,
    bytes: Math.max(0, state.bytes - healCost),
    lastTick: Date.now(),
  };

  nextState = addExp(nextState, 10);

  return {
    state: nextState,
    success: true,
    message: "Antivirus patch injected! Integrity restored.",
  };
}

export function toggleSleep(state: TamagotchiState): {
  state: TamagotchiState;
  isSleeping: boolean;
  message: string;
} {
  if (state.stage === "EGG") {
    return { state, isSleeping: false, message: "Eggs cannot sleep." };
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
      ? "Entering Hibernation (Power Save Mode)..."
      : "Hibernation terminated. Core active!",
  };
}

export function rebootPet(state: TamagotchiState): {
  state: TamagotchiState;
  message: string;
} {
  const nextState: TamagotchiState = {
    ...state,
    hp: 60,
    energy: 50,
    happiness: 45,
    cleanliness: 80,
    poopCount: 0,
    hasVirus: false,
    isSleeping: false,
    lastTick: Date.now(),
  };

  return {
    state: nextState,
    message: "⚡ EMERGENCY REBOOT SUCCESSFUL! System revived at 60% Integrity.",
  };
}

export function archiveAndHatchNewGen(
  state: TamagotchiState,
  newName = "CORE-02",
): { state: TamagotchiState; message: string } {
  const newGen = state.generation + 1;
  const bonusBytes = Math.max(30, Math.floor(state.bytes * 0.5) + state.level * 5);

  const nextState: TamagotchiState = {
    ...DEFAULT_TAMAGOTCHI_STATE,
    name: newName,
    generation: newGen,
    bytes: bonusBytes,
    theme: state.theme,
    soundEnabled: state.soundEnabled,
    birthDate: Date.now(),
    lastTick: Date.now(),
  };

  return {
    state: nextState,
    message: `✦ GENERATION ${newGen} INITIATED! Legacy bonus: +${bonusBytes} Bytes. ✦`,
  };
}

export function saveTamagotchiState(state: TamagotchiState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore localStorage errors (e.g. private mode)
  }
}

export function loadTamagotchiState(): TamagotchiState {
  if (typeof window === "undefined") return DEFAULT_TAMAGOTCHI_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TAMAGOTCHI_STATE;

    const parsed = JSON.parse(raw) as Partial<TamagotchiState>;
    const merged: TamagotchiState = {
      ...DEFAULT_TAMAGOTCHI_STATE,
      ...parsed,
    };

    // Calculate offline elapsed time
    const now = Date.now();
    const elapsedSeconds = Math.max(0, (now - (merged.lastTick || now)) / 1000);

    return applyTimeDecay(merged, elapsedSeconds);
  } catch {
    return DEFAULT_TAMAGOTCHI_STATE;
  }
}
