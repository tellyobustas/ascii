export type CombatBuffType =
  | "NONE"
  | "BLADEMAIL"
  | "BERSERK"
  | "TESLA"
  | "VAMPIRISM"
  | "QUANTUM_RISK";

export interface CombatBuffDef {
  id: CombatBuffType;
  nameRu: string;
  glyph: string;
  tag: string;
  cost: number;
  description: string;
  details: string;
  color: string;
  glow: string;
}

export const COMBAT_BUFFS: Record<CombatBuffType, CombatBuffDef> = {
  NONE: {
    id: "NONE",
    nameRu: "БЕЗ ЧИПА",
    glyph: "⚪",
    tag: "СТАНДАРТ",
    cost: 0,
    description: "Стандартный боевой режим без модификаторов.",
    details: "Базовые характеристики тамагочи.",
    color: "#888888",
    glow: "rgba(255, 255, 255, 0.15)",
  },
  BLADEMAIL: {
    id: "BLADEMAIL",
    nameRu: "ШИПЫ",
    glyph: "🛡️",
    tag: "ШИПЫ 350%",
    cost: 40,
    description: "Отражает 350% урона во врагов вокруг веером шипов.",
    details: "Каждый удар по вам вызывает круговой импульс отталкивания.",
    color: "#ff0055",
    glow: "rgba(255, 0, 85, 0.4)",
  },
  BERSERK: {
    id: "BERSERK",
    nameRu: "БЕРСЕРК",
    glyph: "🩸",
    tag: "ЯРОСТЬ +250%",
    cost: 50,
    description: "Чем ниже здоровье, тем выше урон и скорость атак (до +250%).",
    details: "При малом HP урон возрастает в разы.",
    color: "#ff4400",
    glow: "rgba(255, 68, 0, 0.4)",
  },
  TESLA: {
    id: "TESLA",
    nameRu: "ТЕСЛА",
    glyph: "⚡",
    tag: "МОЛНИЯ 3.2с",
    cost: 45,
    description: "Каждые 3.2 сек бьет цепной молнией по 5 врагам.",
    details: "90 урона по случайным целям на экране.",
    color: "#00f0ff",
    glow: "rgba(0, 240, 255, 0.4)",
  },
  VAMPIRISM: {
    id: "VAMPIRISM",
    nameRu: "ВАМПИРИЗМ",
    glyph: "🧛",
    tag: "ВАМПИРИЗМ",
    cost: 60,
    description: "Каждое убийство вируса восстанавливает HP.",
    details: "Пополняет здоровье прямо во время боя.",
    color: "#00ff66",
    glow: "rgba(0, 255, 102, 0.4)",
  },
  QUANTUM_RISK: {
    id: "QUANTUM_RISK",
    nameRu: "КУШ x3",
    glyph: "🎲",
    tag: "КУШ x3",
    cost: 30,
    description: "Урон по вам +40%, но сбор байтов и опыта x3!",
    details: "Высокий риск ради утроенной добычи.",
    color: "#ffd700",
    glow: "rgba(255, 215, 0, 0.4)",
  },
};
