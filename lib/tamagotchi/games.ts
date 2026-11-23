export type BinaryGuessChoice = "0" | "1";

export interface BinaryGuessGameState {
  round: number; // 1 to 3
  playerScore: number;
  botScore: number;
  lastBotChoice: BinaryGuessChoice | null;
  lastPlayerChoice: BinaryGuessChoice | null;
  resultMessage: string;
  isGameOver: boolean;
  won: boolean;
}

export function initBinaryGame(): BinaryGuessGameState {
  return {
    round: 1,
    playerScore: 0,
    botScore: 0,
    lastBotChoice: null,
    lastPlayerChoice: null,
    resultMessage: "Round 1: Guess the pet's binary bit (0 or 1)!",
    isGameOver: false,
    won: false,
  };
}

export function playBinaryRound(
  currentState: BinaryGuessGameState,
  playerChoice: BinaryGuessChoice,
): BinaryGuessGameState {
  if (currentState.isGameOver) return currentState;

  const botChoice: BinaryGuessChoice = Math.random() > 0.5 ? "1" : "0";
  const matched = playerChoice === botChoice;

  const newPlayerScore = currentState.playerScore + (matched ? 1 : 0);
  const newBotScore = currentState.botScore + (matched ? 0 : 1);
  const nextRound = currentState.round + 1;

  if (nextRound > 3) {
    const playerWon = newPlayerScore >= 2;
    return {
      round: 3,
      playerScore: newPlayerScore,
      botScore: newBotScore,
      lastBotChoice: botChoice,
      lastPlayerChoice: playerChoice,
      resultMessage: playerWon
        ? `VICTORY! ${newPlayerScore}-Round win! +15 Sync, +10 Bytes, +25 EXP!`
        : `MATCH OVER! Pet won ${newBotScore}/3. Good effort! +5 Sync.`,
      isGameOver: true,
      won: playerWon,
    };
  }

  return {
    round: nextRound,
    playerScore: newPlayerScore,
    botScore: newBotScore,
    lastBotChoice: botChoice,
    lastPlayerChoice: playerChoice,
    resultMessage: matched
      ? `Match! Pet transmitted [${botChoice}]. Point to you! Next round:`
      : `Miss! Pet transmitted [${botChoice}]. Next round:`,
    isGameOver: false,
    won: false,
  };
}

export interface BugCatchGameState {
  activeSector: number; // 0-8 (3x3 grid), -1 if none
  score: number;
  timeLeft: number; // in seconds
  isActive: boolean;
  isGameOver: boolean;
  won: boolean;
}

export function initBugCatchGame(): BugCatchGameState {
  return {
    activeSector: Math.floor(Math.random() * 9),
    score: 0,
    timeLeft: 12,
    isActive: true,
    isGameOver: false,
    won: false,
  };
}
