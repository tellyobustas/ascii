export type PetStage = "EGG" | "BABY" | "TEEN" | "ADULT" | "OVERCLOCK";

export type PetMood =
  | "ECSTATIC"
  | "HAPPY"
  | "NORMAL"
  | "HUNGRY"
  | "DIRTY"
  | "SICK"
  | "SLEEPING"
  | "PANIC";

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
    name: "DATA PACKET",
    glyph: "[::01::]",
    cost: 0,
    energyBoost: 15,
    happinessBoost: 5,
    integrityBoost: 0,
    description: "Lightweight byte stream. Fast snack.",
  },
  {
    id: "ram_noodle",
    name: "RAM CHIP",
    glyph: "[||||||]",
    cost: 5,
    energyBoost: 35,
    happinessBoost: 12,
    integrityBoost: 5,
    description: "Nutritious silicon block. Restores memory.",
  },
  {
    id: "cyber_pizza",
    name: "PIXEL SLICE",
    glyph: "<▲#▲>",
    cost: 10,
    energyBoost: 45,
    happinessBoost: 25,
    integrityBoost: 0,
    description: "Warm triangular cyber-slice. Boosts mood.",
  },
  {
    id: "overclock_core",
    name: "OVERCLOCK GEL",
    glyph: "{⚡CORE⚡}",
    cost: 18,
    energyBoost: 60,
    happinessBoost: 30,
    integrityBoost: 15,
    description: "High-voltage bio-fuel. Maximum boost.",
  },
];

export interface TamagotchiState {
  name: string;
  stage: PetStage;
  level: number;
  exp: number;
  expToNextLevel: number;
  hp: number; // 0-100 Integrity
  energy: number; // 0-100 Charge
  happiness: number; // 0-100 Sync
  cleanliness: number; // 0-100 Buffer cleanliness
  isSleeping: boolean;
  bytes: number; // In-game currency
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
  poopCount: number; // 0-4 glitch bugs on screen
  hasVirus: boolean;
  eggWarmCycles: number; // For EGG stage hatching progress (0-5)
}

export type MiniGameType = "NONE" | "GUESS" | "BUG_CATCH";
