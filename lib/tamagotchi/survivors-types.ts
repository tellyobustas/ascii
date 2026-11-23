// Types for Vampire Survivors Cyber-Raid Game Mode

export type WeaponCategory = "MELEE" | "RANGED";

export interface WeaponDef {
  id: string;
  name: string;
  nameRu: string;
  category: WeaponCategory;
  description: string;
  glyph: string;
  baseDamage: number;
  baseCooldown: number; // in seconds
  baseSpeed: number;
  baseArea: number;
  baseCount: number;
}

export const WEAPON_REGISTRY: Record<string, WeaponDef> = {
  // Ближний бой
  cyber_blade: {
    id: "cyber_blade",
    name: "Cyber Blade",
    nameRu: "Клинок",
    category: "MELEE",
    description: "Взмах перед собой с отбросом врагов.",
    glyph: "⚔️",
    baseDamage: 28,
    baseCooldown: 0.85,
    baseSpeed: 0,
    baseArea: 75,
    baseCount: 1,
  },
  orbit_shards: {
    id: "orbit_shards",
    name: "Orbit Shards",
    nameRu: "Орбита",
    category: "MELEE",
    description: "Осколки вращаются вокруг питомца.",
    glyph: "🛡️",
    baseDamage: 18,
    baseCooldown: 2.5,
    baseSpeed: 3.5,
    baseArea: 65,
    baseCount: 2,
  },
  shockwave: {
    id: "shockwave",
    name: "Pulse Shockwave",
    nameRu: "Взрыв",
    category: "MELEE",
    description: "Круговой импульс по всем врагам вокруг.",
    glyph: "⚡",
    baseDamage: 35,
    baseCooldown: 2.2,
    baseSpeed: 0,
    baseArea: 90,
    baseCount: 1,
  },

  // Дальний бой
  laser_beam: {
    id: "laser_beam",
    name: "Matrix Laser",
    nameRu: "Лазер",
    category: "RANGED",
    description: "Пронзающий луч в ближайшую цель.",
    glyph: "🔦",
    baseDamage: 22,
    baseCooldown: 0.95,
    baseSpeed: 550,
    baseArea: 1,
    baseCount: 1,
  },
  glitch_darts: {
    id: "glitch_darts",
    name: "Glitch Darts",
    nameRu: "Дротики",
    category: "RANGED",
    description: "Самонаводящиеся снаряды во врагов.",
    glyph: "🎯",
    baseDamage: 20,
    baseCooldown: 1.1,
    baseSpeed: 380,
    baseArea: 1,
    baseCount: 2,
  },
  lightning_strike: {
    id: "lightning_strike",
    name: "Firewall Lightning",
    nameRu: "Молния",
    category: "RANGED",
    description: "Удар молнии по случайным врагам.",
    glyph: "🌩️",
    baseDamage: 55,
    baseCooldown: 1.8,
    baseSpeed: 0,
    baseArea: 50,
    baseCount: 1,
  },
  plasma_pulse: {
    id: "plasma_pulse",
    name: "Plasma Pulse",
    nameRu: "Плазма",
    category: "RANGED",
    description: "Очередь плазменных снарядов [=>>].",
    glyph: "💠",
    baseDamage: 24,
    baseCooldown: 0.65,
    baseSpeed: 520,
    baseArea: 20,
    baseCount: 1,
  },
};

export interface ActiveWeapon {
  id: string;
  level: number;
  cooldownTimer: number;
}

export type UpgradeCardType = "NEW_WEAPON" | "UPGRADE_WEAPON" | "PASSIVE";

export interface UpgradeCard {
  id: string;
  title: string;
  desc: string;
  glyph: string;
  type: UpgradeCardType;
  weaponId?: string;
  passiveStat?: "DAMAGE" | "SPEED" | "MAX_HP" | "AREA" | "COOLDOWN";
}

export type EnemyType = "BUG" | "WORM" | "SKULL" | "TANK" | "BOSS";

export interface EnemyEntity {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  radius: number;
  glyph: string;
  color: string;
  isBoss?: boolean;
  shootTimer?: number;
  chargeTimer?: number;
  isCharging?: boolean;
}

export type DropType = "EXP" | "MEDKIT" | "COIN" | "MAGNET" | "NUKE";

export interface DropEntity {
  id: number;
  type: DropType;
  x: number;
  y: number;
  value: number; // Exp amount, heal amount, coin amount
  radius: number;
}

export interface ProjectileEntity {
  id: number;
  weaponId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  lifeTime: number; // seconds left
  pierce: number;
  orbitAngle?: number;
  isEnemy?: boolean;
  glyph?: string;
  color?: string;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  lifeTime: number;
}

export interface SurvivorRunResult {
  survivedTime: number; // in seconds
  enemiesKilled: number;
  levelReached: number;
  bytesGathered: number;
  expGathered: number;
  won: boolean;
  extracted?: boolean;
}
