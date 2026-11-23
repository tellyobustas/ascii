import type { CombatBuffType } from "./combat-buffs";
import type { SkillTreeState } from "./skill-tree";

export type PetStage =
  | "EGG"
  | "NIBBLE"
  | "SPARK"
  | "IMP"
  | "PROTO_DAEMON"
  | "DAEMON_CORE"
  | "CYBER_ARMOR"
  | "NEO_OVERLORD"
  | "OMEGA_DEITY";

export const STAGE_NAMES_RU: Record<PetStage, string> = {
  EGG: "Яйцо",
  NIBBLE: "Байт-малыш",
  SPARK: "Спарк",
  IMP: "Имп",
  PROTO_DAEMON: "Прото-демон",
  DAEMON_CORE: "Ядро демона",
  CYBER_ARMOR: "Броня демона",
  NEO_OVERLORD: "Оверлорд",
  OMEGA_DEITY: "Омега-демон",
};

export type PetMood =
  | "ECSTATIC"
  | "HAPPY"
  | "NORMAL"
  | "HUNGRY"
  | "DIRTY"
  | "SICK"
  | "SLEEPING"
  | "PANIC";

export const MOOD_NAMES_RU: Record<PetMood, string> = {
  ECSTATIC: "ЭКСТАЗ ♥",
  HAPPY: "СЧАСТЛИВ ★",
  NORMAL: "В СЕТИ ●",
  HUNGRY: "ГОЛОДЕН ⚡",
  DIRTY: "ЗАСОРЕН ⚠",
  SICK: "ВИРУС ☠",
  SLEEPING: "СПИТ 💤",
  PANIC: "СБОЙ ЯДРА !!",
};

export type PetTheme = "green" | "amber" | "cyan" | "magenta" | "white";

export interface ThemeColors {
  primary: string;
  glow: string;
  dim: string;
  border: string;
  bg: string;
  text: string;
}

export const THEME_CONFIG: Record<PetTheme, ThemeColors> = {
  green: {
    primary: "#00ff66",
    glow: "rgba(0, 255, 102, 0.4)",
    dim: "rgba(0, 255, 102, 0.15)",
    border: "rgba(0, 255, 102, 0.35)",
    bg: "#020704",
    text: "#f2fff6",
  },
  amber: {
    primary: "#ffb000",
    glow: "rgba(255, 176, 0, 0.4)",
    dim: "rgba(255, 176, 0, 0.15)",
    border: "rgba(255, 176, 0, 0.35)",
    bg: "#080501",
    text: "#fff9ee",
  },
  cyan: {
    primary: "#00f0ff",
    glow: "rgba(0, 240, 255, 0.4)",
    dim: "rgba(0, 240, 255, 0.15)",
    border: "rgba(0, 240, 255, 0.35)",
    bg: "#010608",
    text: "#eefcff",
  },
  magenta: {
    primary: "#ff007f",
    glow: "rgba(255, 0, 127, 0.4)",
    dim: "rgba(255, 0, 127, 0.15)",
    border: "rgba(255, 0, 127, 0.35)",
    bg: "#080105",
    text: "#fff0f7",
  },
  white: {
    primary: "#f2f2f2",
    glow: "rgba(242, 242, 242, 0.4)",
    dim: "rgba(242, 242, 242, 0.15)",
    border: "rgba(242, 242, 242, 0.35)",
    bg: "#040404",
    text: "#ffffff",
  },
};

export interface FoodItem {
  id: string;
  name: string;
  glyph: string;
  cost: number;
  energyBoost: number;
  happinessBoost: number;
  integrityBoost: number;
  description: string;
}

export const FOOD_MENU: FoodItem[] = [
  {
    id: "byte_snack",
    name: "ДАТА-ПАКЕТ",
    glyph: "[::01::]",
    cost: 0,
    energyBoost: 20,
    happinessBoost: 5,
    integrityBoost: 0,
    description: "Быстрый перекус байтами. Бесплатно.",
  },
  {
    id: "ram_noodle",
    name: "ЧИП ОЗУ",
    glyph: "[||||||]",
    cost: 8,
    energyBoost: 40,
    happinessBoost: 15,
    integrityBoost: 5,
    description: "Питательный кремниевый блок. Восстанавливает память.",
  },
  {
    id: "cyber_pizza",
    name: "ПИКСЕЛЬ-ПИЦЦА",
    glyph: "<▲#▲>",
    cost: 16,
    energyBoost: 60,
    happinessBoost: 30,
    integrityBoost: 0,
    description: "Горячий треугольный слайс. Сильно радует питомца.",
  },
  {
    id: "overclock_core",
    name: "РАЗГОН-ГЕЛЬ",
    glyph: "{⚡CORE⚡}",
    cost: 30,
    energyBoost: 85,
    happinessBoost: 45,
    integrityBoost: 20,
    description: "Высоковольтный гель. Максимальный заряд и лечение.",
  },
];

export interface Quest {
  id: string;
  title: string;
  desc: string;
  target: number;
  current: number;
  rewardBytes: number;
  rewardExp: number;
  completed: boolean;
}

export type HeadAccessory = "NONE" | "VISOR" | "HALO" | "HORNS";
export type BodyAccessory = "NONE" | "EXO_SPINE" | "FORCE_FIELD" | "TESLA_COILS";
export type DroneAccessory = "NONE" | "BIT" | "ORB" | "MINI_DEMON";

export interface ModuleSpec {
  id: string;
  glyph: string;
  name: string;
  purpose: string;
  combatPerk: string;
  petPerk: string;
}

export const HEAD_MODULES: Record<HeadAccessory, ModuleSpec> = {
  NONE: {
    id: "NONE",
    glyph: "[ - ]",
    name: "Без модуля",
    purpose: "Стандартный сенсор",
    combatPerk: "Без бонусов",
    petPerk: "Штатный режим",
  },
  VISOR: {
    id: "VISOR",
    glyph: "[ ═══ ]",
    name: "Кибер-визор",
    purpose: "Тактическая оптика наведения",
    combatPerk: "+25% Шанс крита (x2.2 урон) и +35% к дальности стрельбы",
    petPerk: "+15% к опыту (EXP) во всех играх",
  },
  HALO: {
    id: "HALO",
    glyph: ".-~✦~-.",
    name: "Неон-нимб",
    purpose: "Фазовый щит целостности",
    combatPerk: "Поглощает 1 удар каждые 15с + реген +1 HP/2.5с",
    petPerk: "Полный иммунитет к вирусам",
  },
  HORNS: {
    id: "HORNS",
    glyph: "//     \\\\",
    name: "Рога разгона",
    purpose: "Оверклок-охлаждение ядра",
    combatPerk: "+20% Скорость бега и +30% темп стрельбы всех орудий",
    petPerk: "В 2 раза быстрее сон (регенерация заряда)",
  },
};

export const BODY_MODULES: Record<BodyAccessory, ModuleSpec> = {
  NONE: {
    id: "NONE",
    glyph: "[ - ]",
    name: "Без обвеса",
    purpose: "Штатный каркас",
    combatPerk: "Без бонусов",
    petPerk: "Штатный режим",
  },
  EXO_SPINE: {
    id: "EXO_SPINE",
    glyph: ">══  ══<",
    name: "Экзо-крылья",
    purpose: "Маневровые стабилизаторы",
    combatPerk: "+30 Радиус сбора лута и отталкивающий импульс при беге",
    petPerk: "-30% расхода энергии на активность",
  },
  FORCE_FIELD: {
    id: "FORCE_FIELD",
    glyph: "{ ( · ) }",
    name: "Силовой каркас",
    purpose: "Кинетический барьер-отражатель",
    combatPerk: "-20% входящего урона и 18 урона шипами при ударе",
    petPerk: "Защита от ночной деградации прогресса",
  },
  TESLA_COILS: {
    id: "TESLA_COILS",
    glyph: "╒⚡    ⚡╕",
    name: "Катушки Тесла",
    purpose: "Генератор цепных разрядов",
    combatPerk: "Цепная молния по 3 врагам каждые 2.2с (35 урона)",
    petPerk: "Пассивно генерирует +2 Байта в минуту",
  },
};

export const DRONE_MODULES: Record<DroneAccessory, ModuleSpec> = {
  NONE: {
    id: "NONE",
    glyph: "[ - ]",
    name: "Без дрона",
    purpose: "Слот спутника свободен",
    combatPerk: "Без бонусов",
    petPerk: "Нет спутника",
  },
  BIT: {
    id: "BIT",
    glyph: "[01]",
    name: "Бит-дрон",
    purpose: "Автономный стрелковый сателлит",
    combatPerk: "Стреляет бинарными залпами [01] каждые 0.75с (28 урона)",
    petPerk: "+1 Байт за каждый тап по экрану",
  },
  ORB: {
    id: "ORB",
    glyph: "( ✦ )",
    name: "Орбитальный шар",
    purpose: "Плазменный рефлектор снарядов",
    combatPerk: "Сбивает вражеские пули (снаряды танков и боссов) и режет мобов",
    petPerk: "Снижает засорение кэша в 2 раза",
  },
  MINI_DEMON: {
    id: "MINI_DEMON",
    glyph: "/\\^o^/\\",
    name: "Мини-демон",
    purpose: "Вампирический фамильяр",
    combatPerk: "Атакует врагов в радиусе (45 урона) и лечит +3 HP",
    petPerk: "+25% к выигрышу Байтов в мини-играх",
  },
};

export interface PetAttributes {
  cpu: number; // +10% Bytes from games per level
  ram: number; // +10 Max energy per level (starts at 100)
  firewall: number; // Reduces bug spawn & virus chance
}

export interface TamagotchiState {
  name: string;
  stage: PetStage;
  level: number;
  exp: number;
  expToNextLevel: number;
  skillPoints: number;
  attributes: PetAttributes;
  hp: number; // 0-100 Целостность
  energy: number; // 0-(100 + ram*10) Заряд
  happiness: number; // 0-100 Синхронизация
  cleanliness: number; // 0-100 Чистота буфера
  isSleeping: boolean;
  bytes: number; // Кибер-валюта
  generation: number;
  birthDate: number;
  lastTick: number;
  lastPetted: number;
  totalPetted: number;
  totalFed: number;
  totalCleaned: number;
  gamesWon: number;
  theme: PetTheme;
  soundEnabled: boolean;
  poopCount: number; // 0-4 багов мусора на экране
  hasVirus: boolean;
  eggWarmCycles: number; // 0-5
  headAccessory: HeadAccessory;
  bodyAccessory?: BodyAccessory;
  droneAccessory: DroneAccessory;
  dailyQuests: Quest[];
  lastWheelSpin: number; // timestamp
  skillTree: SkillTreeState;
  bestSurvivorTime: number; // in seconds
  bestSurvivorKills: number;
  dailyStreak: number; // 1-7
  lastLoginDate: string; // YYYY-MM-DD
  claimedDailyRewardToday: boolean;
  lastQuestDate: string; // YYYY-MM-DD
  dailyContractClaimed: boolean;
  morningBoostUntil: number; // timestamp
  inventoryBuffs: Record<CombatBuffType, number>;
  activeCombatBuff: CombatBuffType | null;
}

export type MiniGameType = "NONE" | "HACK" | "BUG_SMASH" | "RUNNER";
