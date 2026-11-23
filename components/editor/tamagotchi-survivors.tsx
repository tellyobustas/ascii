"use client";

import { useEffect, useRef, useState } from "react";
import {
  WEAPON_REGISTRY,
  type ActiveWeapon,
  type DropEntity,
  type EnemyEntity,
  type FloatingText,
  type ProjectileEntity,
  type SurvivorRunResult,
  type UpgradeCard,
} from "@/lib/tamagotchi/survivors-types";
import { COMBAT_BUFFS, type CombatBuffType } from "@/lib/tamagotchi/combat-buffs";
import { playSound, triggerHaptic } from "@/lib/tamagotchi/sound";
import {
  THEME_CONFIG,
  type PetMood,
  type TamagotchiState,
} from "@/lib/tamagotchi/types";
import {
  getAccessoryOverlay,
  getPetSprite,
} from "@/lib/tamagotchi/sprites";

interface TamagotchiSurvivorsProps {
  tamagotchi: TamagotchiState;
  activeBuff?: CombatBuffType | null;
  onFinishRun: (result: SurvivorRunResult) => void;
  onClose: () => void;
}

const STAGE_HP_BONUS: Record<string, number> = {
  EGG: 60,
  NIBBLE: 100,
  SPARK: 140,
  IMP: 180,
  PROTO_DAEMON: 230,
  DAEMON_CORE: 300,
  CYBER_ARMOR: 400,
  NEO_OVERLORD: 550,
  OMEGA_DEITY: 800,
};

const STAGE_SPEED_BONUS: Record<string, number> = {
  EGG: 0,
  NIBBLE: 0,
  SPARK: 10,
  IMP: 15,
  PROTO_DAEMON: 20,
  DAEMON_CORE: 28,
  CYBER_ARMOR: 22,
  NEO_OVERLORD: 35,
  OMEGA_DEITY: 50,
};

// 2-frame retro cyberpunk ASCII sprites for all enemies
const ASCII_ENEMY_SPRITES: Record<
  EnemyEntity["type"],
  {
    frames: string[][];
    color: string;
    lineH: number;
    fontSize: number;
  }
> = {
  BUG: {
    frames: [
      [" /o\\ ", "<[X]>", " \\ / "],
      [" \\o/ ", "<[O]>", " / \\ "],
    ],
    color: "#00ff88",
    lineH: 10,
    fontSize: 9,
  },
  WORM: {
    frames: [
      ["~{0_0}~", " (S S) "],
      ["~{o_o}~", " (Z Z) "],
    ],
    color: "#00f0ff",
    lineH: 11,
    fontSize: 10,
  },
  SKULL: {
    frames: [
      [" .---. ", "|(o.o)|", " \\ = / "],
      [" .---. ", "|(O_O)|", " \\ ~ / "],
    ],
    color: "#ffaa00",
    lineH: 11,
    fontSize: 10,
  },
  TANK: {
    frames: [
      [" [|#▓#|] ", "<==[X]==>", "  /TTT\\  "],
      [" [|▓#▓|] ", "<=<[X]=>=", "  \\TTT/  "],
    ],
    color: "#ff3366",
    lineH: 12,
    fontSize: 10,
  },
  BOSS: {
    frames: [
      [
        "   /\\___/\\   ",
        " <[ ☠ 0xDEAD ]> ",
        "  ||==[██]==||  ",
        "   \\/───\\/   ",
      ],
      [
        "   /▼___▼\\   ",
        " <[ ☠ CORE-X ]> ",
        "  ||==[▓▓]==||  ",
        "   /\\───/\\   ",
      ],
    ],
    color: "#ff007f",
    lineH: 14,
    fontSize: 12,
  },
};

function generateUpgradeCards(currentWeapons: ActiveWeapon[]): UpgradeCard[] {
  const cards: UpgradeCard[] = [];
  const ownedWeaponIds = currentWeapons.map((w) => w.id);
  const allWeaponIds = Object.keys(WEAPON_REGISTRY);

  // Upgrade existing weapon
  currentWeapons.forEach((w) => {
    const def = WEAPON_REGISTRY[w.id];
    if (def && w.level < 5) {
      cards.push({
        id: `upgrade_${w.id}_${w.level + 1}`,
        title: `${def.nameRu} [УР. ${w.level + 1}]`,
        desc: "+25% урона и дальности",
        glyph: def.glyph,
        type: "UPGRADE_WEAPON",
        weaponId: w.id,
      });
    }
  });

  // Acquire new weapon (up to 6 weapons)
  if (ownedWeaponIds.length < 6) {
    allWeaponIds.forEach((id) => {
      if (!ownedWeaponIds.includes(id)) {
        const def = WEAPON_REGISTRY[id];
        if (def) {
          cards.push({
            id: `new_${id}`,
            title: `НОВОЕ: ${def.nameRu}`,
            desc: def.description,
            glyph: def.glyph,
            type: "NEW_WEAPON",
            weaponId: id,
          });
        }
      }
    });
  }

  // Passive upgrades
  cards.push(
    {
      id: "passive_damage",
      title: "АТАКА",
      desc: "+20% к урону оружия",
      glyph: "⚔️",
      type: "PASSIVE",
      passiveStat: "DAMAGE",
    },
    {
      id: "passive_speed",
      title: "СКОРОСТЬ",
      desc: "+15% к скорости бега",
      glyph: "👟",
      type: "PASSIVE",
      passiveStat: "SPEED",
    },
    {
      id: "passive_heal",
      title: "ЛЕЧЕНИЕ",
      desc: "+50% здоровья",
      glyph: "💊",
      type: "PASSIVE",
      passiveStat: "MAX_HP",
    },
  );

  const shuffled = [...cards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

export function TamagotchiSurvivors({
  tamagotchi,
  activeBuff,
  onFinishRun,
  onClose,
}: TamagotchiSurvivorsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const thumbElemRef = useRef<HTMLDivElement | null>(null);
  const baseElemRef = useRef<HTMLDivElement | null>(null);

  // Stats calculation based on Tamagotchi power
  const skillTree = tamagotchi.skillTree ?? {};
  const baseStageHp = STAGE_HP_BONUS[tamagotchi.stage] ?? 100;
  const maxHp =
    baseStageHp +
    tamagotchi.level * 10 +
    (tamagotchi.attributes?.ram ?? 0) * 15 +
    (skillTree.MAX_HP ?? 0) * 30;

  const baseSpeed =
    195 +
    (STAGE_SPEED_BONUS[tamagotchi.stage] ?? 0) +
    tamagotchi.level * 2 +
    (skillTree.MOVE_SPEED ?? 0) * 12;

  const medkitHealBase =
    35 +
    (tamagotchi.attributes?.firewall ?? 0) * 6 +
    Math.floor(tamagotchi.level * 1.5);
  const medkitMultiplier = 1 + (skillTree.HEAL_AMP ?? 0) * 0.2;
  const medkitHealAmount = Math.floor(medkitHealBase * medkitMultiplier);

  const globalDamageMult =
    (1 + (skillTree.ATK_POWER ?? 0) * 0.12) *
    (1 + (tamagotchi.attributes?.cpu ?? 0) * 0.05);

  const globalCooldownMult = 1 / (1 + (skillTree.ATK_SPEED ?? 0) * 0.08);
  const globalCritChance = 0.05 + (skillTree.CRIT_CHANCE ?? 0) * 0.05;
  const globalAreaMult = 1 + (skillTree.ATK_AREA ?? 0) * 0.1;
  const magnetRadius = 85 + (skillTree.MAGNET_RADIUS ?? 0) * 30;
  const byteMultiplier = 1 + (skillTree.BYTE_HARVEST ?? 0) * 0.18;
  const hasRevive = (skillTree.SECOND_CHANCE ?? 0) > 0;

  // React states (Throttled for 60fps performance)
  const [currentHp, setCurrentHp] = useState(maxHp);
  const [runTime, setRunTime] = useState(0);
  const [runLevel, setRunLevel] = useState(1);
  const [runExp, setRunExp] = useState(0);
  const [expToNext, setExpToNext] = useState(25);
  const [kills, setKills] = useState(0);
  const [bytesCollected, setBytesCollected] = useState(0);

  // Safe Extraction state (Opens after 3:00 / 180s)
  const [isExtractionOpen, setIsExtractionOpen] = useState(false);
  const [extractionDist, setExtractionDist] = useState(0);
  const [extractionArrow, setExtractionArrow] = useState("▲");
  const [isExtracted, setIsExtracted] = useState(false);

  // Throttling references
  const lastReportedSecondRef = useRef(-1);
  const lastReportedHpRef = useRef(maxHp);
  const lastHpReportTimeRef = useRef(0);
  const lastReportedKillsRef = useRef(0);
  const lastReportedBytesRef = useRef(0);
  const lastReportedExpRef = useRef(0);
  const lastCompassUpdateRef = useRef(0);

  // Level up & Game over state
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [upgradeCards, setUpgradeCards] = useState<UpgradeCard[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [runWon, setRunWon] = useState(false);

  // Virtual Joystick & Drag Controls state (Refs avoid 120Hz React re-renders)
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);
  const joystickOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const keysRef = useRef<Record<string, boolean>>({});

  // Game loop internal mutable references
  const playerRef = useRef({
    x: 0,
    y: 0,
    facingX: 1,
    facingY: 0,
    hp: maxHp,
    maxHp,
    speed: baseSpeed,
    reviveUsed: false,
    iFrameTimer: 0, // 0.45s invulnerability frames after hit
  });

  // Start with strong RANGED options: Matrix Laser + Plasma Pulse + Cyber Blade
  const weaponsRef = useRef<ActiveWeapon[]>([
    { id: "laser_beam", level: 1, cooldownTimer: 0 },
    { id: "plasma_pulse", level: 1, cooldownTimer: 0 },
    { id: "cyber_blade", level: 1, cooldownTimer: 0 },
  ]);

  const enemiesRef = useRef<EnemyEntity[]>([]);
  const dropsRef = useRef<DropEntity[]>([]);
  const projectilesRef = useRef<ProjectileEntity[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const nextEntityIdRef = useRef(1);
  const spawnTimerRef = useRef(0);
  const runSecondsRef = useRef(0);
  const killsRef = useRef(0);
  const bytesRef = useRef(0);
  const levelRef = useRef(1);
  const expRef = useRef(0);
  const expToNextRef = useRef(25);
  const blademailTimerRef = useRef(0);
  const teslaTimerRef = useRef(1.5);
  const satelliteShootTimerRef = useRef(2.2);

  // Safe Extraction State Ref
  const extractionRef = useRef({
    active: false,
    x: 0,
    y: 0,
    radius: 65,
    holdTimer: 0,
    extracted: false,
    beaconAngle: 0,
  });

  const reflectRingsRef = useRef<
    Array<{ x: number; y: number; radius: number; maxRadius: number; life: number }>
  >([]);
  const lightningBoltsRef = useRef<
    Array<{ x1: number; y1: number; x2: number; y2: number; life: number }>
  >([]);

  const themeColors = THEME_CONFIG[tamagotchi.theme] ?? THEME_CONFIG.green;

  // Lock vertical scroll, pull-to-refresh & rubber-banding in Telegram / Mobile Webview
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevDocOverflow = document.documentElement.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    const prevDocOverscroll = document.documentElement.style.overscrollBehavior;
    const prevTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.body.style.touchAction = "none";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";

    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest(".allow-scroll")) return;
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overflow = prevDocOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
      document.documentElement.style.overscrollBehavior = prevDocOverscroll;
      document.body.style.touchAction = prevTouchAction;
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  // Dynamic canvas sizing (DPR capped at 1.5 to prevent iPhone 15 Pro Max GPU heating)
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const targetW = Math.max(320, Math.floor(rect.width * dpr));
      const targetH = Math.max(400, Math.floor(rect.height * dpr));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    updateSize();
    const ro = new ResizeObserver(() => updateSize());
    ro.observe(container);

    return () => {
      ro.disconnect();
    };
  }, []);

  // Keyboard listeners for desktop support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Direct DOM Touch / Drag Controls: ZERO React re-renders on touch move!
  const updateControlVector = (
    clientX: number,
    clientY: number,
    originX: number,
    originY: number,
  ) => {
    const dx = clientX - originX;
    const dy = clientY - originY;
    const dist = Math.hypot(dx, dy);
    const maxRadius = 38;
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const thumbX = Math.cos(angle) * clampedDist;
    const thumbY = Math.sin(angle) * clampedDist;

    joystickOffsetRef.current = {
      x: thumbX / maxRadius,
      y: thumbY / maxRadius,
    };

    // Update DOM directly without setState
    if (thumbElemRef.current) {
      thumbElemRef.current.style.transform = `translate(${thumbX}px, ${thumbY}px)`;
    }
    if (baseElemRef.current) {
      baseElemRef.current.style.borderColor = themeColors.primary;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement)?.closest("button")) return;

    const joystickElem = document.getElementById("survivors-joystick");
    if (joystickElem && (e.target as HTMLElement)?.closest("#survivors-joystick")) {
      const rect = joystickElem.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      dragOriginRef.current = { x: cx, y: cy };
      updateControlVector(e.clientX, e.clientY, cx, cy);
    } else {
      dragOriginRef.current = { x: e.clientX, y: e.clientY };
      updateControlVector(e.clientX, e.clientY, e.clientX, e.clientY);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragOriginRef.current) return;
    updateControlVector(
      e.clientX,
      e.clientY,
      dragOriginRef.current.x,
      dragOriginRef.current.y,
    );
  };

  const handlePointerUp = () => {
    dragOriginRef.current = null;
    joystickOffsetRef.current = { x: 0, y: 0 };
    if (thumbElemRef.current) {
      thumbElemRef.current.style.transform = "translate(0px, 0px)";
    }
    if (baseElemRef.current) {
      baseElemRef.current.style.borderColor = "rgba(255, 255, 255, 0.35)";
    }
  };

  // Helper to trigger floating text
  const addFloatingText = (text: string, x: number, y: number, color = "#fff") => {
    if (floatingTextsRef.current.length > 20) {
      floatingTextsRef.current.splice(0, 4);
    }
    floatingTextsRef.current.push({
      id: nextEntityIdRef.current++,
      text,
      x,
      y,
      color,
      lifeTime: 0.65,
    });
  };

  const handleSelectUpgrade = (card: UpgradeCard) => {
    playSound("levelUp", tamagotchi.soundEnabled);
    triggerHaptic("success");

    if (card.type === "NEW_WEAPON" && card.weaponId) {
      weaponsRef.current.push({
        id: card.weaponId,
        level: 1,
        cooldownTimer: 0,
      });
    } else if (card.type === "UPGRADE_WEAPON" && card.weaponId) {
      const existing = weaponsRef.current.find((w) => w.id === card.weaponId);
      if (existing) existing.level += 1;
    } else if (card.type === "PASSIVE") {
      if (card.passiveStat === "DAMAGE") {
        weaponsRef.current.forEach((w) => {
          w.level += 0.5;
        });
      } else if (card.passiveStat === "SPEED") {
        playerRef.current.speed *= 1.15;
      } else if (card.passiveStat === "MAX_HP") {
        playerRef.current.hp = Math.min(
          playerRef.current.maxHp,
          playerRef.current.hp + playerRef.current.maxHp * 0.5,
        );
        lastReportedHpRef.current = Math.round(playerRef.current.hp);
        setCurrentHp(lastReportedHpRef.current);
      }
    }

    setIsLevelingUp(false);
  };

  // Main Canvas Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let lastTimestamp: number | null = null;

    const loop = (timestamp: number) => {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }
      const rawDelta = (timestamp - lastTimestamp) / 1000;
      // Frame rate pacing: clamp dt to avoid huge steps or 120Hz runaway
      const dt = Math.min(Math.max(rawDelta, 0.008), 0.05);
      lastTimestamp = timestamp;

      // Pause during Level-Up
      if (isLevelingUp || isGameOver) {
        animationId = requestAnimationFrame(loop);
        return;
      }

      // Update Run Timers (Throttled to 1/s to avoid re-rendering lag)
      runSecondsRef.current += dt;
      const floorSec = Math.floor(runSecondsRef.current);
      if (floorSec !== lastReportedSecondRef.current) {
        lastReportedSecondRef.current = floorSec;
        setRunTime(floorSec);
      }

      const player = playerRef.current;

      // Decrement i-frames
      if (player.iFrameTimer > 0) {
        player.iFrameTimer -= dt;
      }

      // 1. Calculate Movement Vector (Joystick + Keyboard)
      let moveX = joystickOffsetRef.current.x;
      let moveY = joystickOffsetRef.current.y;

      const keys = keysRef.current;
      if (keys["w"] || keys["arrowup"]) moveY -= 1;
      if (keys["s"] || keys["arrowdown"]) moveY += 1;
      if (keys["a"] || keys["arrowleft"]) moveX -= 1;
      if (keys["d"] || keys["arrowright"]) moveX += 1;

      const moveLen = Math.hypot(moveX, moveY);
      if (moveLen > 0.05) {
        const normX = moveX / Math.max(1, moveLen);
        const normY = moveY / Math.max(1, moveLen);
        player.x += normX * player.speed * dt;
        player.y += normY * player.speed * dt;
        player.facingX = normX;
        player.facingY = normY;
      }

      // 2. Weapon Auto-Firing
      const hpRatio = player.hp / Math.max(1, player.maxHp);
      let berserkDamageMult = 1.0;
      let berserkCooldownMult = 1.0;
      if (activeBuff === "BERSERK") {
        if (hpRatio < 0.25) {
          berserkDamageMult = 3.0;
          berserkCooldownMult = 0.55;
        } else if (hpRatio < 0.5) {
          berserkDamageMult = 1.8;
          berserkCooldownMult = 0.75;
        } else if (hpRatio < 0.75) {
          berserkDamageMult = 1.3;
          berserkCooldownMult = 0.88;
        }
      }

      const morningBoostMult =
        tamagotchi.morningBoostUntil && tamagotchi.morningBoostUntil > Date.now()
          ? 1.15
          : 1.0;

      weaponsRef.current.forEach((w) => {
        const def = WEAPON_REGISTRY[w.id];
        if (!def) return;

        w.cooldownTimer -= dt;
        if (w.cooldownTimer <= 0) {
          const cooldown =
            ((def.baseCooldown / (1 + (w.level - 1) * 0.15)) *
              globalCooldownMult) *
            berserkCooldownMult;
          w.cooldownTimer = cooldown;

          const damage = Math.round(
            def.baseDamage *
              (1 + (w.level - 1) * 0.28) *
              globalDamageMult *
              berserkDamageMult *
              morningBoostMult *
              (Math.random() < globalCritChance ? 2 : 1),
          );

          if (w.id === "laser_beam") {
            let closestEn: EnemyEntity | null = null;
            let closestDist = 580;
            enemiesRef.current.forEach((en) => {
              const d = Math.hypot(en.x - player.x, en.y - player.y);
              if (d < closestDist) {
                closestDist = d;
                closestEn = en;
              }
            });

            if (closestEn) {
              const dx = (closestEn as EnemyEntity).x - player.x;
              const dy = (closestEn as EnemyEntity).y - player.y;
              const angle = Math.atan2(dy, dx);
              projectilesRef.current.push({
                id: nextEntityIdRef.current++,
                weaponId: "laser_beam",
                x: player.x,
                y: player.y,
                vx: Math.cos(angle) * def.baseSpeed,
                vy: Math.sin(angle) * def.baseSpeed,
                damage,
                radius: 8 * globalAreaMult,
                lifeTime: 0.9,
                pierce: 3 + Math.floor(w.level / 2),
                glyph: "──►",
                color: "#00ff88",
              });
              playSound("click", tamagotchi.soundEnabled);
            }
          } else if (w.id === "plasma_pulse") {
            // Rapid plasma burst in facing direction
            projectilesRef.current.push({
              id: nextEntityIdRef.current++,
              weaponId: "plasma_pulse",
              x: player.x,
              y: player.y,
              vx: player.facingX * def.baseSpeed,
              vy: player.facingY * def.baseSpeed,
              damage,
              radius: 12,
              lifeTime: 0.85,
              pierce: 1 + Math.floor(w.level / 2),
              glyph: "[=>>]",
              color: "#00f0ff",
            });
            playSound("click", tamagotchi.soundEnabled);
          } else if (w.id === "cyber_blade") {
            playSound("pet", tamagotchi.soundEnabled);
            const slashAngle = Math.atan2(player.facingY, player.facingX);
            const slashRange = def.baseArea * globalAreaMult;

            enemiesRef.current.forEach((en) => {
              const dx = en.x - player.x;
              const dy = en.y - player.y;
              const dist = Math.hypot(dx, dy);
              if (dist <= slashRange + en.radius) {
                const enAngle = Math.atan2(dy, dx);
                let diffAngle = Math.abs(slashAngle - enAngle);
                if (diffAngle > Math.PI) diffAngle = Math.PI * 2 - diffAngle;
                if (diffAngle <= Math.PI * 0.6) {
                  en.hp -= damage;
                  en.x += Math.cos(enAngle) * 35;
                  en.y += Math.sin(enAngle) * 35;
                  addFloatingText(
                    `-${damage}`,
                    en.x,
                    en.y - 12,
                    damage > def.baseDamage * 1.5 ? "#ff007f" : "#00ff66",
                  );
                }
              }
            });

            projectilesRef.current.push({
              id: nextEntityIdRef.current++,
              weaponId: "cyber_blade",
              x: player.x,
              y: player.y,
              vx: player.facingX,
              vy: player.facingY,
              damage,
              radius: slashRange,
              lifeTime: 0.16,
              pierce: 999,
            });
          } else if (w.id === "glitch_darts") {
            const count = def.baseCount + Math.floor(w.level / 2);
            for (let i = 0; i < count; i++) {
              const spreadAngle =
                Math.atan2(player.facingY, player.facingX) +
                (Math.random() - 0.5) * 1.2;
              projectilesRef.current.push({
                id: nextEntityIdRef.current++,
                weaponId: "glitch_darts",
                x: player.x,
                y: player.y,
                vx: Math.cos(spreadAngle) * def.baseSpeed,
                vy: Math.sin(spreadAngle) * def.baseSpeed,
                damage,
                radius: 6,
                lifeTime: 1.3,
                pierce: 1,
                glyph: "♦",
                color: "#ffaa00",
              });
            }
          }
        }
      });

      // 3. Orbiting ASCII Satellites System (Scales with player effort & level)
      const satCount = Math.min(
        6,
        2 + Math.floor(levelRef.current / 3) +
          (weaponsRef.current.find((w) => w.id === "orbit_shards")?.level ?? 0),
      );
      const orbitSpeed = runSecondsRef.current * 3.5;
      const orbitRadius = 48 + Math.min(22, levelRef.current * 2);

      // Satellite periodic burst fire at distant enemies
      satelliteShootTimerRef.current -= dt;
      if (satelliteShootTimerRef.current <= 0) {
        satelliteShootTimerRef.current = 2.4;
        let target = enemiesRef.current.find(
          (e) => Math.hypot(e.x - player.x, e.y - player.y) < 460,
        );
        if (target) {
          const ang = Math.atan2(target.y - player.y, target.x - player.x);
          projectilesRef.current.push({
            id: nextEntityIdRef.current++,
            weaponId: "satellite_dart",
            x: player.x,
            y: player.y,
            vx: Math.cos(ang) * 450,
            vy: Math.sin(ang) * 450,
            damage: Math.round(22 * globalDamageMult),
            radius: 6,
            lifeTime: 1.0,
            pierce: 1,
            glyph: "►",
            color: "#00f0ff",
          });
          playSound("click", tamagotchi.soundEnabled);
        }
      }

      // Tesla Coil Discharge
      if (activeBuff === "TESLA") {
        teslaTimerRef.current -= dt;
        if (teslaTimerRef.current <= 0) {
          teslaTimerRef.current = 3.2;
          const candidates = enemiesRef.current
            .filter((en) => Math.hypot(en.x - player.x, en.y - player.y) <= 360)
            .sort(
              (a, b) =>
                Math.hypot(a.x - player.x, a.y - player.y) -
                Math.hypot(b.x - player.x, b.y - player.y),
            )
            .slice(0, 5);

          candidates.forEach((en) => {
            const teslaDmg = Math.round(90 * globalDamageMult * morningBoostMult);
            en.hp -= teslaDmg;
            addFloatingText(`⚡${teslaDmg}`, en.x, en.y - 14, "#00f0ff");
            lightningBoltsRef.current.push({
              x1: player.x,
              y1: player.y,
              x2: en.x,
              y2: en.y,
              life: 0.16,
            });
          });

          if (candidates.length > 0) {
            playSound("tesla", tamagotchi.soundEnabled);
          }
        }
      }

      // Update FX timers
      reflectRingsRef.current.forEach((ring) => {
        ring.radius += 360 * dt;
        ring.life -= dt;
      });
      reflectRingsRef.current = reflectRingsRef.current.filter((r) => r.life > 0);

      lightningBoltsRef.current.forEach((bolt) => {
        bolt.life -= dt;
      });
      lightningBoltsRef.current = lightningBoltsRef.current.filter((b) => b.life > 0);

      // Update Projectiles (Player + Enemy)
      projectilesRef.current.forEach((proj) => {
        proj.lifeTime -= dt;
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;

        if (proj.isEnemy) {
          // Enemy projectile hitting player (respects i-frames!)
          const d = Math.hypot(proj.x - player.x, proj.y - player.y);
          if (d < proj.radius + 14 && player.iFrameTimer <= 0) {
            player.hp -= proj.damage;
            player.iFrameTimer = 0.45;
            proj.pierce = 0;
            triggerHaptic("medium");
            playSound("pet", tamagotchi.soundEnabled);
            addFloatingText(`-${proj.damage}`, player.x, player.y - 14, "#ff2244");
          }
        } else {
          // Player projectile hitting enemies
          if (proj.pierce > 0 && proj.weaponId !== "cyber_blade" && proj.weaponId !== "shockwave") {
            enemiesRef.current.forEach((en) => {
              const d = Math.hypot(en.x - proj.x, en.y - proj.y);
              if (d < en.radius + proj.radius && proj.pierce > 0) {
                en.hp -= proj.damage;
                proj.pierce -= 1;
                addFloatingText(`-${proj.damage}`, en.x, en.y - 12, "#00ff66");
              }
            });
          }
        }
      });
      projectilesRef.current = projectilesRef.current.filter(
        (p) => p.lifeTime > 0 && p.pierce > 0,
      );

      // 4. Safe Extraction Logic (Activates at 3:00 / 180s)
      const ex = extractionRef.current;
      if (runSecondsRef.current >= 180 && !ex.active && !ex.extracted) {
        ex.active = true;
        const exAngle = Math.random() * Math.PI * 2;
        ex.x = player.x + Math.cos(exAngle) * 560;
        ex.y = player.y + Math.sin(exAngle) * 560;
        setIsExtractionOpen(true);
        playSound("combo", tamagotchi.soundEnabled);
        triggerHaptic("heavy");
        addFloatingText("🚨 ЭВАКУАЦИЯ ОТКРЫТА! 🚨", player.x, player.y - 40, "#00f0ff");
      }

      if (ex.active && !ex.extracted) {
        const dToEx = Math.hypot(ex.x - player.x, ex.y - player.y);
        ex.beaconAngle = Math.atan2(ex.y - player.y, ex.x - player.x);

        // Update compass direction icon for HUD (throttled to 250ms)
        if (timestamp - lastCompassUpdateRef.current > 250) {
          lastCompassUpdateRef.current = timestamp;
          setExtractionDist(Math.round(dToEx));
          const deg = (ex.beaconAngle * 180) / Math.PI;
          if (deg >= -22.5 && deg < 22.5) setExtractionArrow("►");
          else if (deg >= 22.5 && deg < 67.5) setExtractionArrow("◢");
          else if (deg >= 67.5 && deg < 112.5) setExtractionArrow("▼");
          else if (deg >= 112.5 && deg < 157.5) setExtractionArrow("◣");
          else if (deg >= -67.5 && deg < -22.5) setExtractionArrow("◥");
          else if (deg >= -112.5 && deg < -67.5) setExtractionArrow("▲");
          else if (deg >= -157.5 && deg < -112.5) setExtractionArrow("◤");
          else setExtractionArrow("◄");
        }

        // Zone hold check
        if (dToEx <= ex.radius) {
          ex.holdTimer += dt;
          if (ex.holdTimer >= 3.0) {
            ex.extracted = true;
            setIsExtracted(true);
            setIsGameOver(true);
            setRunWon(true);
            playSound("gameWin", tamagotchi.soundEnabled);
            triggerHaptic("success");
          }
        } else {
          ex.holdTimer = Math.max(0, ex.holdTimer - dt * 0.5);
        }
      }

      // 5. Enemy Spawning Wave Engine (Capped at 40 enemies max)
      spawnTimerRef.current -= dt;
      if (spawnTimerRef.current <= 0 && enemiesRef.current.length < 40) {
        const timeSec = runSecondsRef.current;
        const spawnDelay = Math.max(0.22, 0.85 - timeSec * 0.0035);
        spawnTimerRef.current = spawnDelay;

        const spawnAngle = Math.random() * Math.PI * 2;
        const spawnDist = 720 + Math.random() * 150;
        const exX = player.x + Math.cos(spawnAngle) * spawnDist;
        const ey = player.y + Math.sin(spawnAngle) * spawnDist;

        let type: EnemyEntity["type"] = "BUG";
        let hp = 35 + Math.floor(timeSec * 0.7);
        let speed = 90 + Math.random() * 20;
        let glyph = "[BUG]";
        let radius = 14;
        let color = "#00ff88";

        if (timeSec > 120 && Math.random() < 0.25) {
          type = "SKULL";
          hp = 110 + Math.floor(timeSec * 1.3);
          speed = 75;
          glyph = "☠SKULL";
          radius = 18;
          color = "#ffaa00";
        } else if (timeSec > 75 && Math.random() < 0.22) {
          type = "TANK";
          hp = 200 + Math.floor(timeSec * 1.6);
          speed = 60;
          glyph = "[#▓#]";
          radius = 24;
          color = "#ff3366";
        } else if (timeSec > 40 && Math.random() < 0.35) {
          type = "WORM";
          hp = 50 + Math.floor(timeSec * 0.85);
          speed = 120;
          glyph = "~WORM~";
          radius = 16;
          color = "#00f0ff";
        }

        // Mini-boss at 2 minutes
        if (Math.floor(timeSec) === 120 && !enemiesRef.current.some((e) => e.isBoss)) {
          type = "BOSS";
          hp = 1400;
          speed = 65;
          glyph = "⚡MEGA-DAEMON⚡";
          radius = 36;
          color = "#ff007f";
          playSound("bomb", tamagotchi.soundEnabled);
          addFloatingText("ВНИМАНИЕ: БОСС!", player.x, player.y - 70, "#ff007f");
        }

        enemiesRef.current.push({
          id: nextEntityIdRef.current++,
          type,
          x: exX,
          y: ey,
          hp,
          maxHp: hp,
          speed,
          damage: type === "BOSS" ? 28 : type === "TANK" ? 18 : 11,
          radius,
          glyph,
          color,
          isBoss: type === "BOSS",
        });
      }

      // 6. Update Enemies & Telegraphed Attacks
      enemiesRef.current.forEach((en) => {
        const dx = player.x - en.x;
        const dy = player.y - en.y;
        const dist = Math.hypot(dx, dy);

        // Skull Charge Logic
        if (en.type === "SKULL") {
          en.chargeTimer = (en.chargeTimer ?? 2.8) - dt;
          if (en.chargeTimer <= 0.5 && !en.isCharging) {
            en.isCharging = true;
            en.color = "#ff3300";
          }
          if (en.chargeTimer <= 0) {
            en.chargeTimer = 3.2;
            en.isCharging = false;
            en.color = "#ffaa00";
            if (dist > 10) {
              en.x += (dx / dist) * 65;
              en.y += (dy / dist) * 65;
            }
          }
        }

        // Tank Ranged Shoot Logic
        if (en.type === "TANK") {
          en.shootTimer = (en.shootTimer ?? 2.8) - dt;
          if (en.shootTimer <= 0 && dist < 520) {
            en.shootTimer = 2.8;
            const shootAng = Math.atan2(dy, dx);
            projectilesRef.current.push({
              id: nextEntityIdRef.current++,
              weaponId: "enemy_tank_bullet",
              x: en.x,
              y: en.y,
              vx: Math.cos(shootAng) * 180,
              vy: Math.sin(shootAng) * 180,
              damage: 16,
              radius: 8,
              lifeTime: 3.2,
              pierce: 1,
              isEnemy: true,
              glyph: "[#]",
              color: "#ff3366",
            });
          }
        }

        // Boss Radial Bursts
        if (en.isBoss) {
          en.shootTimer = (en.shootTimer ?? 3.5) - dt;
          if (en.shootTimer <= 0) {
            en.shootTimer = 3.5;
            for (let s = 0; s < 6; s++) {
              const bAng = (s * Math.PI * 2) / 6;
              projectilesRef.current.push({
                id: nextEntityIdRef.current++,
                weaponId: "enemy_boss_bullet",
                x: en.x,
                y: en.y,
                vx: Math.cos(bAng) * 160,
                vy: Math.sin(bAng) * 160,
                damage: 20,
                radius: 10,
                lifeTime: 3.8,
                pierce: 1,
                isEnemy: true,
                glyph: "[X]",
                color: "#ff007f",
              });
            }
          }
        }

        // Movement
        if (dist > 2200) {
          en.x = player.x + (dx / dist) * 750;
          en.y = player.y + (dy / dist) * 750;
        } else if (dist > 2) {
          const spd = en.isCharging ? en.speed * 1.7 : en.speed;
          en.x += (dx / dist) * spd * dt;
          en.y += (dy / dist) * spd * dt;
        }

        // Orbiting Satellites contact check with this enemy
        for (let s = 0; s < satCount; s++) {
          const satAngle = orbitSpeed + (s * Math.PI * 2) / satCount;
          const sx = player.x + Math.cos(satAngle) * orbitRadius;
          const sy = player.y + Math.sin(satAngle) * (orbitRadius * 0.72);
          if (Math.hypot(en.x - sx, en.y - sy) < en.radius + 12) {
            const satDmg = Math.round(24 * globalDamageMult);
            en.hp -= satDmg * dt * 4;
            en.x += (dx / (dist || 1)) * -18 * dt;
            en.y += (dy / (dist || 1)) * -18 * dt;
          }
        }

        // Contact Attack Player (protected by i-frames!)
        if (dist < en.radius + 16 && player.iFrameTimer <= 0) {
          const dmgFactor = activeBuff === "QUANTUM_RISK" ? 1.4 : 1.0;
          const hitDamage = Math.round(en.damage * dmgFactor);
          player.hp -= hitDamage;
          player.iFrameTimer = 0.45; // 0.45s invulnerability frames
          triggerHaptic("medium");
          playSound("pet", tamagotchi.soundEnabled);
          addFloatingText(`-${hitDamage}`, player.x, player.y - 14, "#ff2244");

          // Blademail reflection
          if (activeBuff === "BLADEMAIL") {
            blademailTimerRef.current -= dt;
            if (blademailTimerRef.current <= 0) {
              blademailTimerRef.current = 0.2;
              const reflectDmg = Math.max(
                35,
                Math.round(en.damage * 3.5 * globalDamageMult),
              );
              enemiesRef.current.forEach((nearby) => {
                const nd = Math.hypot(nearby.x - player.x, nearby.y - player.y);
                if (nd <= 180) {
                  nearby.hp -= reflectDmg;
                  nearby.x += ((nearby.x - player.x) / (nd || 1)) * 32;
                  nearby.y += ((nearby.y - player.y) / (nd || 1)) * 32;
                  addFloatingText(`⚡${reflectDmg}`, nearby.x, nearby.y - 12, "#ff0055");
                }
              });
              reflectRingsRef.current.push({
                x: player.x,
                y: player.y,
                radius: 12,
                maxRadius: 180,
                life: 0.22,
              });
              playSound("reflect", tamagotchi.soundEnabled);
            }
          }

          if (player.hp <= 0) {
            if (hasRevive && !player.reviveUsed) {
              player.reviveUsed = true;
              player.hp = player.maxHp * 0.5;
              lastReportedHpRef.current = Math.round(player.hp);
              setCurrentHp(lastReportedHpRef.current);
              playSound("heal", tamagotchi.soundEnabled);
              triggerHaptic("heavy");
              addFloatingText("ВТОРОЕ ДЫХАНИЕ!", player.x, player.y - 30, "#00f0ff");
            } else {
              setIsGameOver(true);
              setRunWon(false);
              lastReportedHpRef.current = 0;
              setCurrentHp(0);
              playSound("gameLose", tamagotchi.soundEnabled);
              triggerHaptic("error");
            }
          }
        }
      });

      // Handle Enemy Deaths & Drop Spawns (Capped drops to 35 max)
      const aliveEnemies: EnemyEntity[] = [];
      enemiesRef.current.forEach((en) => {
        if (en.hp <= 0) {
          killsRef.current += 1;

          // Vampirism (Balanced: +1 bug, +5 tank, +30 boss)
          if (activeBuff === "VAMPIRISM") {
            const drain = en.isBoss ? 30 : en.type === "TANK" ? 5 : 1;
            player.hp = Math.min(player.maxHp, player.hp + drain);
            addFloatingText(`+${drain} HP`, player.x, player.y - 18, "#00ff66");
          }

          // Smart Medkit drop rate (more when hurt)
          const hurtFactor = player.hp < player.maxHp * 0.35 ? 0.16 : 0.05;
          const dropRoll = Math.random();

          if (dropsRef.current.length < 35) {
            if (dropRoll < hurtFactor) {
              dropsRef.current.push({
                id: nextEntityIdRef.current++,
                type: "MEDKIT",
                x: en.x,
                y: en.y,
                value: medkitHealAmount,
                radius: 14,
              });
            } else if (dropRoll < 0.32) {
              dropsRef.current.push({
                id: nextEntityIdRef.current++,
                type: "COIN",
                x: en.x,
                y: en.y,
                value: Math.round((en.isBoss ? 35 : 4) * byteMultiplier),
                radius: 12,
              });
            } else {
              dropsRef.current.push({
                id: nextEntityIdRef.current++,
                type: "EXP",
                x: en.x,
                y: en.y,
                value: en.isBoss ? 60 : 9,
                radius: 10,
              });
            }
          }

          if (en.isBoss) {
            playSound("gameWin", tamagotchi.soundEnabled);
            addFloatingText("БОСС ПОВЕРЖЕН! +50 B", en.x, en.y, "#ffcc00");
            bytesRef.current += 50;
          }
        } else {
          aliveEnemies.push(en);
        }
      });
      enemiesRef.current = aliveEnemies;

      // 7. Update Drops & Magnet Attraction
      const remainingDrops: DropEntity[] = [];
      dropsRef.current.forEach((drop) => {
        const d = Math.hypot(player.x - drop.x, player.y - drop.y);

        if (d < magnetRadius) {
          drop.x += ((player.x - drop.x) / d) * 350 * dt;
          drop.y += ((player.y - drop.y) / d) * 350 * dt;
        }

        if (d < drop.radius + 18) {
          if (drop.type === "EXP") {
            playSound("coin", tamagotchi.soundEnabled);
            expRef.current += drop.value;

            if (expRef.current >= expToNextRef.current) {
              expRef.current -= expToNextRef.current;
              levelRef.current += 1;
              expToNextRef.current = Math.floor(expToNextRef.current * 1.35) + 15;
              setRunLevel(levelRef.current);
              setExpToNext(expToNextRef.current);

              setIsLevelingUp(true);
              setUpgradeCards(generateUpgradeCards(weaponsRef.current));
              playSound("levelUp", tamagotchi.soundEnabled);
              triggerHaptic("success");
            }
          } else if (drop.type === "MEDKIT") {
            playSound("heal", tamagotchi.soundEnabled);
            player.hp = Math.min(player.maxHp, player.hp + drop.value);
            addFloatingText(`+${drop.value} HP`, player.x, player.y - 20, "#00ff66");
          } else if (drop.type === "COIN") {
            playSound("coin", tamagotchi.soundEnabled);
            bytesRef.current += drop.value;
            addFloatingText(`+${drop.value} B`, drop.x, drop.y - 12, "#ffdd00");
          }
        } else {
          remainingDrops.push(drop);
        }
      });
      dropsRef.current = remainingDrops;

      // Batch throttle React state updates (120ms)
      const roundedHp = Math.max(0, Math.round(player.hp));
      if (
        roundedHp !== lastReportedHpRef.current &&
        (timestamp - lastHpReportTimeRef.current > 120 || roundedHp <= 0)
      ) {
        lastHpReportTimeRef.current = timestamp;
        lastReportedHpRef.current = roundedHp;
        setCurrentHp(roundedHp);
      }

      if (killsRef.current !== lastReportedKillsRef.current) {
        lastReportedKillsRef.current = killsRef.current;
        setKills(killsRef.current);
      }

      if (bytesRef.current !== lastReportedBytesRef.current) {
        lastReportedBytesRef.current = bytesRef.current;
        setBytesCollected(bytesRef.current);
      }

      if (expRef.current !== lastReportedExpRef.current) {
        lastReportedExpRef.current = expRef.current;
        setRunExp(expRef.current);
      }

      // Update Floating Texts
      floatingTextsRef.current.forEach((ft) => {
        ft.lifeTime -= dt;
        ft.y -= 25 * dt;
      });
      floatingTextsRef.current = floatingTextsRef.current.filter(
        (ft) => ft.lifeTime > 0,
      );

      // ==========================================
      // RENDER SECTION (Zero shadowBlur = Ice Cold Performance!)
      // ==========================================
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const ZOOM = 0.58 * dpr;

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(ZOOM, ZOOM);
      ctx.translate(-player.x, -player.y);

      // Single-batch Grid Matrix Background (Fast!)
      ctx.strokeStyle = "rgba(0, 255, 102, 0.08)";
      ctx.lineWidth = 1;
      const gridSize = 60;
      const visibleHalfW = (canvas.width / 2) / ZOOM + gridSize;
      const visibleHalfH = (canvas.height / 2) / ZOOM + gridSize;
      const startX = Math.floor((player.x - visibleHalfW) / gridSize) * gridSize;
      const endX = player.x + visibleHalfW;
      const startY = Math.floor((player.y - visibleHalfH) / gridSize) * gridSize;
      const endY = player.y + visibleHalfH;

      ctx.beginPath();
      for (let x = startX; x <= endX; x += gridSize) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      }
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }
      ctx.stroke();

      // Draw Extraction Beacon & Directional Chevrons if Open
      if (ex.active && !ex.extracted) {
        const dToEx = Math.hypot(ex.x - player.x, ex.y - player.y);

        // Ground Conduit Chevrons Trail towards extraction point
        const steps = Math.min(10, Math.floor(dToEx / 60));
        ctx.fillStyle = "rgba(0, 240, 255, 0.45)";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (let st = 1; st <= steps; st++) {
          const frac = st / (steps + 1);
          const tx = player.x + (ex.x - player.x) * frac;
          const ty = player.y + (ex.y - player.y) * frac;
          ctx.fillText(">>>", tx, ty);
        }

        // Orbiting Pointer Arrow around player pointing directly to beacon
        const arrowX = player.x + Math.cos(ex.beaconAngle) * 44;
        const arrowY = player.y + Math.sin(ex.beaconAngle) * 44;
        ctx.fillStyle = "#00f0ff";
        ctx.font = "bold 11px monospace";
        ctx.fillText("──►", arrowX, arrowY);

        // Pulsing circular extraction zone on ground
        const pulseR = ex.radius + Math.sin(runSecondsRef.current * 5) * 4;
        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, pulseR, 0, Math.PI * 2);
        ctx.stroke();

        // ASCII Extraction Portal Graphic
        ctx.font = "bold 10px monospace";
        ctx.fillStyle = "#00f0ff";
        ctx.fillText(".--[ 🛸 ]--.", ex.x, ex.y - 20);
        ctx.fillText("|  ЭВАКУАЦИЯ  |", ex.x, ex.y - 8);
        ctx.fillText("'-----------'", ex.x, ex.y + 4);

        if (ex.holdTimer > 0) {
          const pct = Math.min(1, ex.holdTimer / 3.0);
          const barBlocks = 8;
          const fill = Math.round(pct * barBlocks);
          const asciiHold = "█".repeat(fill) + "░".repeat(barBlocks - fill);
          ctx.fillStyle = "#00ff88";
          ctx.font = "bold 10px monospace";
          ctx.fillText(`[${asciiHold}] ${Math.round(pct * 100)}%`, ex.x, ex.y + 22);
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
          ctx.font = "bold 9px monospace";
          ctx.fillText("УДЕРЖИВАЙ 3 СЕК", ex.x, ex.y + 20);
        }
      }

      // Draw ASCII Drops
      dropsRef.current.forEach((drop) => {
        if (drop.type === "EXP") {
          ctx.fillStyle = "#00f0ff";
          ctx.font = "bold 13px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("◆", drop.x, drop.y);
        } else if (drop.type === "MEDKIT") {
          ctx.fillStyle = "#ff0055";
          ctx.font = "bold 12px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("[✚]", drop.x, drop.y);
        } else if (drop.type === "COIN") {
          ctx.fillStyle = "#ffdd00";
          ctx.font = "bold 12px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("[$]", drop.x, drop.y);
        }
      });

      // Draw Projectiles
      projectilesRef.current.forEach((p) => {
        if (p.weaponId === "laser_beam") {
          ctx.strokeStyle = p.color ?? "#00ff88";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - (p.vx / 550) * 26, p.y - (p.vy / 550) * 26);
          ctx.stroke();
        } else if (p.weaponId === "cyber_blade") {
          ctx.strokeStyle = "rgba(0, 255, 102, 0.8)";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(
            p.x,
            p.y,
            p.radius,
            Math.atan2(p.vy, p.vx) - Math.PI * 0.45,
            Math.atan2(p.vy, p.vx) + Math.PI * 0.45,
          );
          ctx.stroke();
        } else {
          ctx.fillStyle = p.color ?? "#ff007f";
          ctx.font = "bold 11px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(p.glyph ?? "►", p.x, p.y);
        }
      });

      // Draw ASCII Enemies
      enemiesRef.current.forEach((en) => {
        const enemyDef = ASCII_ENEMY_SPRITES[en.type] ?? ASCII_ENEMY_SPRITES.BUG;
        const frameIdx = Math.floor(runSecondsRef.current * 4) % enemyDef.frames.length;
        const lines = enemyDef.frames[frameIdx];

        ctx.font = `bold ${enemyDef.fontSize}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = en.color;

        const startLineY = en.y - ((lines.length - 1) * enemyDef.lineH) / 2;
        lines.forEach((line, idx) => {
          ctx.fillText(line, en.x, startLineY + idx * enemyDef.lineH);
        });

        // Health bar above damaged enemy
        if (en.hp < en.maxHp) {
          const barW = en.isBoss ? 56 : 28;
          const barH = en.isBoss ? 4.5 : 3;
          const barY = en.y - en.radius - (en.isBoss ? 20 : 12);

          ctx.fillStyle = "rgba(0,0,0,0.8)";
          ctx.fillRect(en.x - barW / 2 - 1, barY - 1, barW + 2, barH + 2);
          ctx.fillStyle = "rgba(255, 0, 60, 0.6)";
          ctx.fillRect(en.x - barW / 2, barY, barW, barH);
          ctx.fillStyle = en.isBoss ? "#ff007f" : "#00ff66";
          ctx.fillRect(
            en.x - barW / 2,
            barY,
            Math.max(0, (en.hp / en.maxHp) * barW),
            barH,
          );

          if (en.isBoss) {
            ctx.font = "bold 9px monospace";
            ctx.fillStyle = "#ff007f";
            ctx.textAlign = "center";
            ctx.fillText(
              `${Math.round(en.hp)}/${en.maxHp} HP`,
              en.x,
              barY - 6,
            );
          }
        }
      });

      // Draw Player Hero (Blinks during i-frames!)
      const isBlinking = player.iFrameTimer > 0 && Math.floor(player.iFrameTimer * 16) % 2 === 0;

      if (!isBlinking) {
        let combatMood: PetMood = "NORMAL";
        if (player.hp <= player.maxHp * 0.25) {
          combatMood = "PANIC";
        } else if (player.hp <= player.maxHp * 0.5) {
          combatMood = "SICK";
        } else if (tamagotchi.hp >= 70 && tamagotchi.happiness >= 70) {
          combatMood = "ECSTATIC";
        } else {
          combatMood = "HAPPY";
        }

        const petLines = getPetSprite(
          tamagotchi.stage,
          combatMood,
          tamagotchi.eggWarmCycles ?? 0,
        );

        const accessories = getAccessoryOverlay(
          tamagotchi.headAccessory ?? "NONE",
          tamagotchi.droneAccessory ?? "NONE",
        );

        const isComplexStage =
          tamagotchi.stage === "OMEGA_DEITY" ||
          tamagotchi.stage === "NEO_OVERLORD" ||
          tamagotchi.stage === "CYBER_ARMOR";
        const petFontSize = isComplexStage ? 9.5 : 11;
        const petLineHeight = petFontSize + 2.5;

        const isMoving =
          moveLen > 0.05 ||
          keys["w"] ||
          keys["a"] ||
          keys["s"] ||
          keys["d"] ||
          keys["arrowup"] ||
          keys["arrowdown"] ||
          keys["arrowleft"] ||
          keys["arrowright"];
        const walkBob = isMoving
          ? Math.sin(runSecondsRef.current * 14) * 2.5
          : Math.sin(runSecondsRef.current * 3) * 0.8;

        const petStartY =
          player.y - ((petLines.length - 1) * petLineHeight) / 2 + walkBob;

        ctx.font = `bold ${petFontSize}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = themeColors.primary;

        petLines.forEach((line, idx) => {
          ctx.fillText(line, player.x, petStartY + idx * petLineHeight);
        });

        // Head Accessory
        if (accessories.headGlyph) {
          ctx.fillStyle = "#00f0ff";
          ctx.font = "bold 9px monospace";
          ctx.fillText(accessories.headGlyph, player.x, petStartY - 12);
        }

        // Drone Companion Accessory
        if (accessories.droneGlyph) {
          const droneAngle = runSecondsRef.current * 2.6;
          const droneDist = 44;
          const dx = player.x + Math.cos(droneAngle) * droneDist;
          const dy = player.y + Math.sin(droneAngle) * (droneDist * 0.65);
          ctx.fillStyle = "#ffcc00";
          ctx.font = "bold 9px monospace";
          ctx.fillText(accessories.droneGlyph, dx, dy);
        }

        // Directional Facing Spark
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(
          player.x + player.facingX * 22,
          player.y + player.facingY * 22 + walkBob,
          2.5,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        // Sleek Floating ASCII Health Bar above Player
        const currentHpRatio = Math.max(0, Math.min(1, player.hp / player.maxHp));
        const hpColor =
          currentHpRatio < 0.25 ? "#ff2244" : currentHpRatio < 0.5 ? "#ffaa00" : "#00ff66";
        const hpTextY = petStartY - (accessories.headGlyph ? 18 : 12);

        const totalBlocks = 8;
        const filledBlocks = Math.round(currentHpRatio * totalBlocks);
        const emptyBlocks = totalBlocks - filledBlocks;
        const asciiHp = "█".repeat(filledBlocks) + "░".repeat(emptyBlocks);

        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = hpColor;
        ctx.fillText(`[${asciiHp}] ${Math.round(player.hp)}`, player.x, hpTextY);
      }

      // Draw Orbiting ASCII Satellites (летающие вокруг персонажа проджектайлы)
      const SAT_GLYPHS = ["<01>", "[#]", "(✦)", "[B]", "♦", "<X>"];
      for (let s = 0; s < satCount; s++) {
        const satAngle = orbitSpeed + (s * Math.PI * 2) / satCount;
        const sx = player.x + Math.cos(satAngle) * orbitRadius;
        const sy = player.y + Math.sin(satAngle) * (orbitRadius * 0.72);
        const glyph = SAT_GLYPHS[s % SAT_GLYPHS.length];

        ctx.fillStyle = themeColors.primary;
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(glyph, sx, sy);
      }

      // Draw Berserk Aura
      if (activeBuff === "BERSERK") {
        if (hpRatio < 0.5) {
          ctx.strokeStyle = "rgba(255, 68, 0, 0.75)";
          ctx.lineWidth = hpRatio < 0.25 ? 3 : 2;
          ctx.beginPath();
          ctx.arc(
            player.x,
            player.y,
            20 + Math.sin(runSecondsRef.current * 14) * 5,
            0,
            Math.PI * 2,
          );
          ctx.stroke();

          ctx.fillStyle = "#ff4400";
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "center";
          ctx.fillText("ЯРОСТЬ", player.x, player.y - 32);
        }
      }

      // Draw Blademail Reflect Rings
      reflectRingsRef.current.forEach((ring) => {
        ctx.strokeStyle = `rgba(255, 0, 85, ${ring.life * 4.5})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Draw Tesla Lightning Bolts
      lightningBoltsRef.current.forEach((bolt) => {
        ctx.strokeStyle = `rgba(0, 240, 255, ${bolt.life * 5.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bolt.x1, bolt.y1);
        ctx.lineTo(bolt.x2, bolt.y2);
        ctx.stroke();
      });

      // Draw Floating Damage Texts
      floatingTextsRef.current.forEach((ft) => {
        ctx.fillStyle = ft.color;
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(ft.text, ft.x, ft.y);
      });

      ctx.restore();

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [
    isLevelingUp,
    isGameOver,
    tamagotchi.stage,
    tamagotchi.theme,
    tamagotchi.soundEnabled,
    tamagotchi.morningBoostUntil,
    tamagotchi.headAccessory,
    tamagotchi.droneAccessory,
    tamagotchi.eggWarmCycles,
    tamagotchi.hp,
    tamagotchi.happiness,
    activeBuff,
    maxHp,
    globalDamageMult,
    globalCooldownMult,
    globalCritChance,
    globalAreaMult,
    magnetRadius,
    byteMultiplier,
    medkitHealAmount,
    hasRevive,
    themeColors.glow,
    themeColors.primary,
  ]);

  // Finish run handler (Awards +50% for Safe Extraction)
  const handleCompleteRun = () => {
    const multiplier = activeBuff === "QUANTUM_RISK" ? 3 : 1;
    const morningExpMult =
      tamagotchi.morningBoostUntil && tamagotchi.morningBoostUntil > Date.now()
        ? 1.25
        : 1.0;
    const extractionMult = isExtracted ? 1.5 : 1.0;

    const baseExp = killsRef.current * 4 + levelRef.current * 15;
    const totalExp = Math.floor(baseExp * multiplier * morningExpMult * extractionMult);
    const totalBytes = Math.floor(bytesRef.current * multiplier * extractionMult);

    onFinishRun({
      survivedTime: runSecondsRef.current,
      enemiesKilled: killsRef.current,
      levelReached: levelRef.current,
      bytesGathered: totalBytes,
      expGathered: totalExp,
      won: runWon || isExtracted,
      extracted: isExtracted,
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="fixed inset-0 h-[100dvh] max-h-[100dvh] z-50 flex flex-col bg-black text-white font-mono select-none overflow-hidden touch-none overscroll-none"
    >
      {/* Sleek Minimal Top HUD: Dropped below iPhone 15 Pro Max Dynamic Island */}
      <div className="relative z-20 flex flex-col border-b border-white/20 bg-black/95 px-3 pt-[max(env(safe-area-inset-top),3.25rem)] pb-2 text-xs touch-none select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <span className="text-yellow-400 text-sm font-black">
              ⏱ {formatTime(runTime)}
            </span>
            <span className="text-white/70 text-[0.70rem]">
              💀 {kills}
            </span>
            <span className="text-yellow-400 text-[0.70rem]">
              💰 {bytesCollected}
            </span>
            {activeBuff && activeBuff !== "NONE" && COMBAT_BUFFS[activeBuff] && (
              <span
                className="px-1.5 py-0.2 border text-[0.55rem] font-black uppercase"
                style={{
                  borderColor: COMBAT_BUFFS[activeBuff].color,
                  color: COMBAT_BUFFS[activeBuff].color,
                }}
              >
                {COMBAT_BUFFS[activeBuff].nameRu}
              </span>
            )}
          </div>

          {/* Compass / Extraction Radar indicator (3+ min) */}
          {isExtractionOpen && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 border border-cyan-400 text-cyan-300 bg-cyan-950/40 text-[0.55rem] font-bold animate-pulse">
              <span>🛸 ЭВАК: {extractionDist}м</span>
              <span className="text-xs font-black">{extractionArrow}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span
              className="px-1.5 py-0.2 border text-[0.65rem] font-black"
              style={{
                borderColor: themeColors.primary,
                color: themeColors.primary,
              }}
            >
              УР. {runLevel}
            </span>
            <button
              onClick={onClose}
              type="button"
              className="text-white/50 hover:text-white text-xs px-1"
            >
              [✕]
            </button>
          </div>
        </div>

        {/* Unified Slim HP Bar with integrated cyan EXP underline */}
        <div className="mt-1.5 flex flex-col gap-0.5">
          <div className="relative h-3 w-full bg-black/80 border border-white/30 overflow-hidden">
            <div
              className="h-full transition-all duration-150"
              style={{
                width: `${Math.max(0, (currentHp / maxHp) * 100)}%`,
                backgroundColor:
                  currentHp < maxHp * 0.25
                    ? "#ff2244"
                    : currentHp < maxHp * 0.5
                    ? "#ffaa00"
                    : themeColors.primary,
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-[0.58rem] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              HP {currentHp}/{maxHp}
            </div>
          </div>
          {/* Razor-thin EXP line (0 to 100%) */}
          <div className="h-0.5 w-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-100"
              style={{
                width: `${Math.min(100, (runExp / expToNext) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Game Canvas Viewport */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full bg-black overflow-hidden touch-none select-none overscroll-none"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block z-0 touch-none select-none pointer-events-none"
        />

        {/* Bottom Center Virtual Joystick (360°) */}
        <div
          id="survivors-joystick"
          className="absolute bottom-10 sm:bottom-12 left-1/2 -translate-x-1/2 z-30 pointer-events-auto touch-none select-none"
        >
          <div
            ref={baseElemRef}
            className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 bg-black/75 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.8)] touch-none select-none transition-colors duration-150"
            style={{
              borderColor: "rgba(255, 255, 255, 0.35)",
            }}
          >
            {/* 4-way crosshair indicators for 360° tactile orientation */}
            <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-[1px] bg-white/20 pointer-events-none" />
            <div className="absolute inset-y-2 left-1/2 -translate-x-1/2 w-[1px] bg-white/20 pointer-events-none" />

            {/* Joystick Thumb Button */}
            <div
              ref={thumbElemRef}
              className="h-11 w-11 rounded-full border-2 flex items-center justify-center transition-transform duration-75 pointer-events-none select-none shadow-md"
              style={{
                borderColor: themeColors.primary,
                backgroundColor: "rgba(0, 255, 102, 0.35)",
              }}
            >
              <div className="h-2 w-2 rounded-full bg-white opacity-90" />
            </div>
          </div>
        </div>
      </div>

      {/* In-Run Level Up Card Selection Modal */}
      {isLevelingUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md">
          <div
            className="allow-scroll terminal-scanlines relative flex w-full max-w-sm flex-col border-2 bg-black/95 p-4 shadow-2xl font-mono"
            style={{
              borderColor: themeColors.primary,
              boxShadow: `0 0 30px ${themeColors.glow}`,
            }}
          >
            <div className="text-center pb-2 border-b border-white/20">
              <span className="text-xs font-black text-yellow-400">
                ⚡ НОВЫЙ УРОВЕНЬ
              </span>
              <p className="text-[0.55rem] text-white/50 mt-0.5">
                Выбери улучшение
              </p>
            </div>

            <div className="my-2.5 flex flex-col gap-2">
              {upgradeCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => handleSelectUpgrade(card)}
                  type="button"
                  className="flex items-center gap-3 border p-2.5 text-left transition hover:bg-white/10 active:scale-95 bg-black/60"
                  style={{ borderColor: themeColors.border }}
                >
                  <span className="text-2xl">{card.glyph}</span>
                  <div className="flex-1">
                    <span
                      className="font-black text-xs block"
                      style={{ color: themeColors.primary }}
                    >
                      {card.title}
                    </span>
                    <p className="text-[0.58rem] text-white/70 mt-0.5">
                      {card.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Game Over / Safe Extraction Summary Screen */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 backdrop-blur-md">
          <div
            className="allow-scroll terminal-scanlines relative flex w-full max-w-sm flex-col border-2 bg-black/95 p-5 shadow-2xl font-mono text-center"
            style={{
              borderColor: isExtracted
                ? "#00f0ff"
                : runWon
                ? themeColors.primary
                : "#ff3333",
              boxShadow: `0 0 30px ${
                isExtracted
                  ? "rgba(0, 240, 255, 0.5)"
                  : runWon
                  ? themeColors.glow
                  : "rgba(255, 50, 50, 0.4)"
              }`,
            }}
          >
            <h2
              className="text-sm font-black uppercase tracking-wider"
              style={{
                color: isExtracted
                  ? "#00f0ff"
                  : runWon
                  ? themeColors.primary
                  : "#ff3333",
              }}
            >
              {isExtracted
                ? "🛸 УСПЕШНАЯ ЭВАКУАЦИЯ! 🛸"
                : runWon
                ? "ПОБЕДА"
                : "ПОРАЖЕНИЕ"}
            </h2>
            <p className="text-[0.55rem] text-white/60 mt-0.5">
              {isExtracted
                ? "Ядро спасено! +50% бонуса к опыту и байтам!"
                : runWon
                ? "Сектор очищен!"
                : "Данные боя сохранены"}
            </p>

            <div className="my-3 grid grid-cols-2 gap-2 border border-white/10 bg-black/60 p-2.5 text-xs">
              <div className="flex flex-col text-left">
                <span className="text-white/40 text-[0.52rem]">ВРЕМЯ</span>
                <span className="font-bold text-yellow-400">
                  {formatTime(runTime)}
                </span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-white/40 text-[0.52rem]">УБИТО</span>
                <span className="font-bold text-white">{kills}</span>
              </div>
              <div className="flex flex-col text-left mt-1.5">
                <span className="text-white/40 text-[0.52rem]">УРОВЕНЬ</span>
                <span className="font-bold text-cyan-400">УР. {runLevel}</span>
              </div>
              <div className="flex flex-col text-right mt-1.5">
                <span className="text-white/40 text-[0.52rem]">БАЙТЫ</span>
                <span className="font-bold text-yellow-400">
                  +{bytesCollected} B {isExtracted && "(+50%)"}
                </span>
              </div>
            </div>

            <button
              onClick={handleCompleteRun}
              type="button"
              className="w-full border py-2.5 text-xs font-black uppercase tracking-wider transition active:scale-95"
              style={{
                borderColor: isExtracted ? "#00f0ff" : themeColors.primary,
                backgroundColor: isExtracted ? "#00f0ff" : themeColors.primary,
                color: "#000",
              }}
            >
              {isExtracted ? "ЗАБРАТЬ НАГРАДЫ ЭВАКУАЦИИ" : "ЗАБРАТЬ НАГРАДЫ"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
