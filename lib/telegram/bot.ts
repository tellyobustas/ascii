import { Bot } from "grammy";

export function createAsciiBot(token: string) {
  return new Bot(token);
}
