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
    nameRu: "Плазменный клинок",
    category: "MELEE",
    description: "Рассекающий взмах перед собой, отбрасывающий врагов.",
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
    nameRu: "Орбитальные байты",
    category: "MELEE",
    description: "Острые кремниевые осколки, вращающиеся вокруг питомца.",
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
    nameRu: "Импульсный разряд",
    category: "MELEE",
    description: "Круговой электро-взрыв, уничтожающий подошедших врагов.",
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
    nameRu: "Матричный лазер",
    category: "RANGED",
    description: "Пронзающий луч света в ближайшего противника.",
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
    nameRu: "Самонаводящиеся биты",
    category: "RANGED",
    description: "Пакеты данных, выслеживающие и подрывающие цели.",
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
    nameRu: "Разряд фаервола",
    category: "RANGED",
    description: "Мощный удар молнии с небес по случайным врагам.",
    glyph: "🌩️",
    baseDamage: 55,
    baseCooldown: 1.8,
    baseSpeed: 0,
    baseArea: 50,
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
}
