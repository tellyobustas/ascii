export interface SkillNodeDef {
  id: string;
  nameRu: string;
  descRu: string;
  glyph: string;
  category: "OFFENSE" | "DEFENSE" | "UTILITY";
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  effectPerLevel: string;
}

export const SKILL_TREE_NODES: Record<string, SkillNodeDef> = {
  // ВЕТКА АТАКИ (OFFENSE)
  ATK_POWER: {
    id: "ATK_POWER",
    nameRu: "Протокол урона",
    descRu: "Увеличивает весь урон оружия в кибер-рейде.",
    glyph: "⚔️",
    category: "OFFENSE",
    maxLevel: 5,
    baseCost: 20,
    costMultiplier: 1.6,
    effectPerLevel: "+12% к урону",
  },
  ATK_SPEED: {
    id: "ATK_SPEED",
    nameRu: "Тактовая частота",
    descRu: "Снижает перезарядку всех атак и оружия.",
    glyph: "⚡",
    category: "OFFENSE",
    maxLevel: 5,
    baseCost: 25,
    costMultiplier: 1.65,
    effectPerLevel: "+8% к скорости атак",
  },
  CRIT_CHANCE: {
    id: "CRIT_CHANCE",
    nameRu: "Критический импульс",
    descRu: "Дает шанс нанести двойной урон.",
    glyph: "🎯",
    category: "OFFENSE",
    maxLevel: 5,
    baseCost: 35,
    costMultiplier: 1.7,
    effectPerLevel: "+5% шанс крита",
  },
  ATK_AREA: {
    id: "ATK_AREA",
    nameRu: "Радиус поражения",
    descRu: "Увеличивает размер снарядов и дальность ближнего боя.",
    glyph: "💥",
    category: "OFFENSE",
    maxLevel: 5,
    baseCost: 30,
    costMultiplier: 1.6,
    effectPerLevel: "+10% к площади атак",
  },

  // ВЕТКА ЗАЩИТЫ (DEFENSE)
  MAX_HP: {
    id: "MAX_HP",
    nameRu: "Титановое ядро",
    descRu: "Увеличивает базовый запас ХП в забеге.",
    glyph: "🛡️",
    category: "DEFENSE",
    maxLevel: 5,
    baseCost: 20,
    costMultiplier: 1.5,
    effectPerLevel: "+30 макс. ХП",
  },
  HEAL_AMP: {
    id: "HEAL_AMP",
    nameRu: "Нано-регенерация",
    descRu: "Усиливает пополнение здоровья от найденных аптечек.",
    glyph: "💊",
    category: "DEFENSE",
    maxLevel: 5,
    baseCost: 25,
    costMultiplier: 1.6,
    effectPerLevel: "+20% исцеления от аптечек",
  },
  ARMOR: {
    id: "ARMOR",
    nameRu: "Экран фаервола",
    descRu: "Снижает получаемый от врагов урон.",
    glyph: "🧱",
    category: "DEFENSE",
    maxLevel: 5,
    baseCost: 40,
    costMultiplier: 1.75,
    effectPerLevel: "-10% получаемого урона",
  },

  // ВЕТКА МОБИЛЬНОСТИ И РЕСУРСОВ (UTILITY)
  MOVE_SPEED: {
    id: "MOVE_SPEED",
    nameRu: "Сверхразгон",
    descRu: "Увеличивает скорость перемещения джойстиком.",
    glyph: "👟",
    category: "UTILITY",
    maxLevel: 5,
    baseCost: 15,
    costMultiplier: 1.5,
    effectPerLevel: "+7% к скорости бега",
  },
  MAGNET_RADIUS: {
    id: "MAGNET_RADIUS",
    nameRu: "Магнит данных",
    descRu: "Увеличивает радиус автоматического подбора кристаллов и монет.",
    glyph: "🧲",
    category: "UTILITY",
    maxLevel: 5,
    baseCost: 20,
    costMultiplier: 1.55,
    effectPerLevel: "+30% к радиусу подбора",
  },
  BYTE_HARVEST: {
    id: "BYTE_HARVEST",
    nameRu: "Майнинг-модуль",
    descRu: "Увеличивает выпадение байтов в забегах для прокачки.",
    glyph: "💰",
    category: "UTILITY",
    maxLevel: 5,
    baseCost: 35,
    costMultiplier: 1.7,
    effectPerLevel: "+18% к добыче байтов",
  },
  SECOND_CHANCE: {
    id: "SECOND_CHANCE",
    nameRu: "Аварийный бэкап",
    descRu: "Дает 1 бесплатное воскрешение с 50% ХП за рейд.",
    glyph: "💖",
    category: "UTILITY",
    maxLevel: 1,
    baseCost: 100,
    costMultiplier: 1,
    effectPerLevel: "1 воскрешение за забег",
  },
};

export type SkillTreeState = Record<string, number>;

export const DEFAULT_SKILL_TREE: SkillTreeState = {
  ATK_POWER: 0,
  ATK_SPEED: 0,
  CRIT_CHANCE: 0,
  ATK_AREA: 0,
  MAX_HP: 0,
  HEAL_AMP: 0,
  ARMOR: 0,
  MOVE_SPEED: 0,
  MAGNET_RADIUS: 0,
  BYTE_HARVEST: 0,
  SECOND_CHANCE: 0,
};

export function getSkillNodeCost(nodeId: string, currentLevel: number): number {
  const node = SKILL_TREE_NODES[nodeId];
  if (!node) return 999;
  return Math.floor(node.baseCost * Math.pow(node.costMultiplier, currentLevel));
}
