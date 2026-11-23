// Mini-Games Engine: Memory Hack, Bug Smasher & Bit Runner

// 1. МАТРИЧНЫЙ ВЗЛОМ (Memory Hack / Simon Says)
export type HackNode = 0 | 1 | 2 | 3; // Альфа, Бета, Гамма, Дельта

export interface HackGameState {
  sequence: HackNode[];
  playerInput: HackNode[];
  round: number; // 1 to 5
  status: "SHOWING" | "PLAYING" | "SUCCESS" | "FAILED" | "VICTORY";
  activeHighlight: HackNode | null;
  message: string;
}

export function initHackGame(): HackGameState {
  const firstSeq: HackNode[] = [
    Math.floor(Math.random() * 4) as HackNode,
    Math.floor(Math.random() * 4) as HackNode,
  ];

  return {
    sequence: firstSeq,
    playerInput: [],
    round: 1,
    status: "SHOWING",
    activeHighlight: null,
    message: "Запомни последовательность кибер-узлов...",
  };
}

// 2. ОХОТА НА ВИРУСЫ (Whack-a-Bug with Combos & Bombs)
export type BugCellType = "EMPTY" | "NORMAL" | "GOLD" | "BOMB";

export interface BugSmashCell {
  type: BugCellType;
  id: number;
}

export interface BugSmashGameState {
  grid: BugSmashCell[];
  score: number;
  combo: number;
  maxCombo: number;
  bonusBytes: number;
  timeLeft: number; // seconds
  isActive: boolean;
  isGameOver: boolean;
  message: string;
}

export function initBugSmashGame(): BugSmashGameState {
  return {
    grid: Array.from({ length: 9 }, (_, i) => ({ type: "EMPTY", id: i })),
    score: 0,
    combo: 1,
    maxCombo: 1,
    bonusBytes: 0,
    timeLeft: 15,
    isActive: true,
    isGameOver: false,
    message: "Жми на баги! Золотые дают бонусы. БОМБЫ НЕ ТРОГАТЬ!",
  };
}

// 3. БИТ-РАННЕР (Data Stream Runner)
export interface RunnerRow {
  firewallLane: number; // 0, 1, or 2 (obstacle)
  coinLane: number; // 0, 1, or 2 (bonus byte), or -1
}

export interface BitRunnerGameState {
  playerLane: number; // 0 (left), 1 (center), 2 (right)
  distance: number;
  bytesCollected: number;
  obstaclesDodged: number;
  rows: RunnerRow[]; // upcoming 4 rows
  isGameOver: boolean;
  won: boolean;
  speedMs: number;
}

export function initBitRunnerGame(): BitRunnerGameState {
  return {
    playerLane: 1,
    distance: 0,
    bytesCollected: 0,
    obstaclesDodged: 0,
    rows: [
      { firewallLane: -1, coinLane: 1 },
      { firewallLane: 0, coinLane: 2 },
      { firewallLane: 2, coinLane: 0 },
      { firewallLane: 1, coinLane: -1 },
    ],
    isGameOver: false,
    won: false,
    speedMs: 700,
  };
}
