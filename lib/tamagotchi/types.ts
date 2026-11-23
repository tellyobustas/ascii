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
  EGG: "Ядро данных (Яйцо)",
  NIBBLE: "Байт-малыш",
  SPARK: "Кибер-спарк",
  IMP: "Нео-бес",
  PROTO_DAEMON: "Прото-демон",
  DAEMON_CORE: "ASCIILOGRAPH Ядро",
  CYBER_ARMOR: "Бронированный демон",
  NEO_OVERLORD: "Кибер-повелитель",
  OMEGA_DEITY: "Омега-демон (Сверхбог)",
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
export type DroneAccessory = "NONE" | "BIT" | "ORB" | "MINI_DEMON";

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
  droneAccessory: DroneAccessory;
  dailyQuests: Quest[];
  lastWheelSpin: number; // timestamp
}

export type MiniGameType = "NONE" | "HACK" | "BUG_SMASH" | "RUNNER";
