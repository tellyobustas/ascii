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
    nameRu: "БЕЗ РАЗГОНА",
    glyph: "⚪",
    tag: "СТАНДАРТ",
    cost: 0,
    description: "Стандартный боевой режим без дополнительных модификаторов.",
    details: "Базовые характеристики тамагочи.",
    color: "#888888",
    glow: "rgba(255, 255, 255, 0.15)",
  },
  BLADEMAIL: {
    id: "BLADEMAIL",
    nameRu: "BLADEMAIL // ОБРАТНЫЙ ШИП",
    glyph: "🛡️",
    tag: "ВОЗВРАТ УРОНА 350%",
    cost: 40,
    description: "Отражает 350% получаемого урона во всех врагов вокруг веером лазерных шипов.",
    details: "Каждый удар по персонажу провоцирует круговой импульс (160px) с мощным отталкиванием.",
    color: "#ff0055",
    glow: "rgba(255, 0, 85, 0.4)",
  },
  BERSERK: {
    id: "BERSERK",
    nameRu: "BERSERK // АВАРИЙНЫЙ РАЗГОН",
    glyph: "🩸",
    tag: "ЯРОСТЬ ЯДРА ДО +250%",
    cost: 50,
    description: "Чем ниже здоровье, тем чудовищнее урон и скорость атак (до +250% при HP < 25%).",
    details: "HP < 50%: +100% урона; HP < 25%: +250% урона и удвоенная скорость перезарядки с огненной аурой.",
    color: "#ff4400",
    glow: "rgba(255, 68, 0, 0.4)",
  },
  TESLA: {
    id: "TESLA",
    nameRu: "TESLA COIL // ТЕСЛА-КОНТУР",
    glyph: "⚡",
    tag: "АВТО-РАЗРЯД 3.2с",
    cost: 45,
    description: "Каждые 3.2 сек испускает высоковольтную цепную молнию по 5 случайным врагам на экране.",
    details: "Наносит мгновенные 90 ед. урона по всей арене, сжигая подступающие толпы багов.",
    color: "#00f0ff",
    glow: "rgba(0, 240, 255, 0.4)",
  },
  VAMPIRISM: {
    id: "VAMPIRISM",
    nameRu: "NANITE DRAIN // НАНО-ВАМПИРИЗМ",
    glyph: "🧛",
    tag: "ЖИЗНЕОТБОР ПРИ УБИЙСТВАХ",
    cost: 60,
    description: "Каждое устранение вируса восстанавливает HP питомца (+1 за багов, +15 за танка, +100 за босса).",
    details: "Позволяет танковать любые волны без аптечек, пополняя здоровье в гуще боя.",
    color: "#00ff66",
    glow: "rgba(0, 255, 102, 0.4)",
  },
  QUANTUM_RISK: {
    id: "QUANTUM_RISK",
    nameRu: "QUANTUM GAMBIT // РИСК-ПРОТОКОЛ",
    glyph: "🎲",
    tag: "ХАРДКОР: ДРОП x3",
    cost: 30,
    description: "Получаемый урон увеличен на +40%, но ВЕСЬ сбор Байтов и Опыта УТРАИВАЕТСЯ (x3)!",
    details: "Экстремальный режим для опытных хакеров: максимальный риск ради колоссального фарма.",
    color: "#ffd700",
    glow: "rgba(255, 215, 0, 0.4)",
  },
};
