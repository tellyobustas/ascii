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
import { THEME_CONFIG, type TamagotchiState } from "@/lib/tamagotchi/types";

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

function generateUpgradeCards(currentWeapons: ActiveWeapon[]): UpgradeCard[] {
  const cards: UpgradeCard[] = [];
  const ownedWeaponIds = currentWeapons.map((w) => w.id);
  const allWeaponIds = Object.keys(WEAPON_REGISTRY);

  // Option to upgrade existing weapon
  currentWeapons.forEach((w) => {
    const def = WEAPON_REGISTRY[w.id];
    if (def && w.level < 5) {
      cards.push({
        id: `upgrade_${w.id}_${w.level + 1}`,
        title: `${def.nameRu} [УР. ${w.level + 1}]`,
        desc: `Увеличивает урон на +25% и расширяет зону поражения.`,
        glyph: def.glyph,
        type: "UPGRADE_WEAPON",
        weaponId: w.id,
      });
    }
  });

  // Option to acquire new weapon (if under 6 weapons)
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

  // Passive bonus options
  cards.push(
    {
      id: "passive_damage",
      title: "ПРОТОКОЛ АТАКИ",
      desc: "+20% ко всему урону оружия.",
      glyph: "⚔️",
      type: "PASSIVE",
      passiveStat: "DAMAGE",
    },
    {
      id: "passive_speed",
      title: "ТУРБО-УСКОРЕНИЕ",
      desc: "+15% к скорости перемещения.",
      glyph: "👟",
      type: "PASSIVE",
      passiveStat: "SPEED",
    },
    {
      id: "passive_heal",
      title: "НАНО-РЕМОНТ",
      desc: "Мгновенно восстанавливает 50% здоровья.",
      glyph: "💊",
      type: "PASSIVE",
      passiveStat: "MAX_HP",
    },
  );

  // Shuffle and pick 3
  const shuffled = [...cards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

export function TamagotchiSurvivors({
  tamagotchi,
  activeBuff,
  onFinishRun,
  onClose,
}: TamagotchiSurvivorsProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Stats calculation based on Tamagotchi power
  const skillTree = tamagotchi.skillTree ?? {};
  const baseStageHp = STAGE_HP_BONUS[tamagotchi.stage] ?? 100;
  const maxHp =
    baseStageHp +
    tamagotchi.level * 10 +
    (tamagotchi.attributes?.ram ?? 0) * 15 +
    (skillTree.MAX_HP ?? 0) * 30;

  const baseSpeed =
    190 +
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
  const magnetRadius = 80 + (skillTree.MAGNET_RADIUS ?? 0) * 30;
  const byteMultiplier = 1 + (skillTree.BYTE_HARVEST ?? 0) * 0.18;
  const hasRevive = (skillTree.SECOND_CHANCE ?? 0) > 0;

  // React states
  const [currentHp, setCurrentHp] = useState(maxHp);
  const [runTime, setRunTime] = useState(0);
  const [runLevel, setRunLevel] = useState(1);
  const [runExp, setRunExp] = useState(0);
  const [expToNext, setExpToNext] = useState(25);
  const [kills, setKills] = useState(0);
  const [bytesCollected, setBytesCollected] = useState(0);

  // In-run Level up state
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [upgradeCards, setUpgradeCards] = useState<UpgradeCard[]>([]);

  // Game over state
  const [isGameOver, setIsGameOver] = useState(false);
  const [runWon, setRunWon] = useState(false);
  const [morningBoostActive] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(
      tamagotchi.morningBoostUntil &&
        tamagotchi.morningBoostUntil > Date.now(),
    );
  });

  // Virtual Joystick state
  const joystickCenterRef = useRef<{ x: number; y: number } | null>(null);
  const joystickOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const [joystickThumb, setJoystickThumb] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  // Keyboard input state
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
  });

  const weaponsRef = useRef<ActiveWeapon[]>([
    { id: "cyber_blade", level: 1, cooldownTimer: 0 },
    { id: "laser_beam", level: 1, cooldownTimer: 0 },
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
  const reflectRingsRef = useRef<
    Array<{ x: number; y: number; radius: number; maxRadius: number; life: number }>
  >([]);
  const lightningBoltsRef = useRef<
    Array<{ x1: number; y1: number; x2: number; y2: number; life: number }>
  >([]);

  const themeColors = THEME_CONFIG[tamagotchi.theme] ?? THEME_CONFIG.green;

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

  // Joystick touch/mouse event handlers
  const handleJoystickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    joystickCenterRef.current = { x: centerX, y: centerY };
    setIsJoystickActive(true);
    e.currentTarget.setPointerCapture(e.pointerId);

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
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
    setJoystickThumb({ x: thumbX, y: thumbY });
  };

  const handleJoystickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!joystickCenterRef.current) return;
    const { x: centerX, y: centerY } = joystickCenterRef.current;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
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
    setJoystickThumb({ x: thumbX, y: thumbY });
  };

  const handleJoystickPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    joystickCenterRef.current = null;
    joystickOffsetRef.current = { x: 0, y: 0 };
    setIsJoystickActive(false);
    setJoystickThumb({ x: 0, y: 0 });
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  // Helper to trigger floating text
  const addFloatingText = (text: string, x: number, y: number, color = "#fff") => {
    floatingTextsRef.current.push({
      id: nextEntityIdRef.current++,
      text,
      x,
      y,
      color,
      lifeTime: 0.8,
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
        setCurrentHp(Math.round(playerRef.current.hp));
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
      const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
      lastTimestamp = timestamp;

      // Handle pause during Level-Up
      if (isLevelingUp || isGameOver) {
        animationId = requestAnimationFrame(loop);
        return;
      }

      // Update Run Timers
      runSecondsRef.current += dt;
      setRunTime(Math.floor(runSecondsRef.current));

      const player = playerRef.current;

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
          berserkDamageMult = 3.5;
          berserkCooldownMult = 0.5;
        } else if (hpRatio < 0.5) {
          berserkDamageMult = 2.0;
          berserkCooldownMult = 0.7;
        } else if (hpRatio < 0.75) {
          berserkDamageMult = 1.35;
          berserkCooldownMult = 0.85;
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

          // Execute Weapon Logic
          if (w.id === "cyber_blade") {
            // Melee Slash Arc
            playSound("pet", tamagotchi.soundEnabled);
            const slashAngle = Math.atan2(player.facingY, player.facingX);
            const slashRange = def.baseArea * globalAreaMult;

            // Damage nearby enemies in facing cone
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
                  // Knockback
                  en.x += Math.cos(enAngle) * 40;
                  en.y += Math.sin(enAngle) * 40;
                  addFloatingText(
                    `-${damage}`,
                    en.x,
                    en.y - 12,
                    damage > def.baseDamage * 1.5 ? "#ff007f" : "#00ff66",
                  );
                }
              }
            });

            // Visual slash projectile
            projectilesRef.current.push({
              id: nextEntityIdRef.current++,
              weaponId: "cyber_blade",
              x: player.x,
              y: player.y,
              vx: player.facingX,
              vy: player.facingY,
              damage,
              radius: slashRange,
              lifeTime: 0.18,
              pierce: 999,
            });
          } else if (w.id === "laser_beam") {
            // Ranged Laser to nearest enemy
            let closestEn: EnemyEntity | null = null;
            let closestDist = 450;
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
                radius: 7 * globalAreaMult,
                lifeTime: 0.8,
                pierce: 2 + Math.floor(w.level / 2),
              });
              playSound("click", tamagotchi.soundEnabled);
            }
          } else if (w.id === "glitch_darts") {
            // Homing darts
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
                lifeTime: 1.4,
                pierce: 1,
              });
            }
          } else if (w.id === "shockwave") {
            // Radial Shockwave
            const shockRadius = def.baseArea * globalAreaMult;
            enemiesRef.current.forEach((en) => {
              const d = Math.hypot(en.x - player.x, en.y - player.y);
              if (d <= shockRadius) {
                en.hp -= damage;
                addFloatingText(`-${damage}`, en.x, en.y - 10, "#00f0ff");
              }
            });
            projectilesRef.current.push({
              id: nextEntityIdRef.current++,
              weaponId: "shockwave",
              x: player.x,
              y: player.y,
              vx: 0,
              vy: 0,
              damage,
              radius: shockRadius,
              lifeTime: 0.25,
              pierce: 999,
            });
          }
        }
      });

      // Tesla Coil Discharge
      if (activeBuff === "TESLA") {
        teslaTimerRef.current -= dt;
        if (teslaTimerRef.current <= 0) {
          teslaTimerRef.current = 3.2;
          const candidates = enemiesRef.current
            .filter((en) => Math.hypot(en.x - player.x, en.y - player.y) <= 300)
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
              life: 0.18,
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

      // Update Projectiles
      projectilesRef.current.forEach((proj) => {
        proj.lifeTime -= dt;
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;

        // Collision with enemies
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
      });
      projectilesRef.current = projectilesRef.current.filter(
        (p) => p.lifeTime > 0 && p.pierce > 0,
      );

      // 3. Enemy Spawning Wave Engine
      spawnTimerRef.current -= dt;
      if (spawnTimerRef.current <= 0) {
        const timeSec = runSecondsRef.current;
        const spawnDelay = Math.max(0.18, 0.9 - timeSec * 0.0035);
        spawnTimerRef.current = spawnDelay;

        // Pick spawn location outside camera viewport
        const spawnAngle = Math.random() * Math.PI * 2;
        const spawnDist = 380 + Math.random() * 120;
        const ex = player.x + Math.cos(spawnAngle) * spawnDist;
        const ey = player.y + Math.sin(spawnAngle) * spawnDist;

        // Determine enemy type by wave time
        let type: EnemyEntity["type"] = "BUG";
        let hp = 30 + Math.floor(timeSec * 0.7);
        let speed = 90 + Math.random() * 25;
        let glyph = "[BUG]";
        let radius = 12;
        let color = "#00ff66";

        if (timeSec > 60 && Math.random() < 0.35) {
          type = "WORM";
          hp = 50 + Math.floor(timeSec * 0.9);
          speed = 120;
          glyph = "~WORM~";
          radius = 14;
          color = "#00f0ff";
        } else if (timeSec > 120 && Math.random() < 0.25) {
          type = "SKULL";
          hp = 110 + Math.floor(timeSec * 1.5);
          speed = 75;
          glyph = "☠SKULL";
          radius = 16;
          color = "#ffaa00";
        }

        // Mini-boss at 2 minutes
        if (Math.floor(timeSec) === 120 && !enemiesRef.current.some((e) => e.isBoss)) {
          type = "BOSS";
          hp = 1200;
          speed = 65;
          glyph = "⚡MEGA-DAEMON⚡";
          radius = 28;
          color = "#ff007f";
          playSound("bomb", tamagotchi.soundEnabled);
          addFloatingText("ВНИМАНИЕ: БОСС СИСТЕМЫ!", player.x, player.y - 60, "#ff007f");
        }

        enemiesRef.current.push({
          id: nextEntityIdRef.current++,
          type,
          x: ex,
          y: ey,
          hp,
          maxHp: hp,
          speed,
          damage: type === "BOSS" ? 25 : 12,
          radius,
          glyph,
          color,
          isBoss: type === "BOSS",
        });
      }

      // 4. Update Enemies & Check Collisions
      enemiesRef.current.forEach((en) => {
        const dx = player.x - en.x;
        const dy = player.y - en.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 2) {
          en.x += (dx / dist) * en.speed * dt;
          en.y += (dy / dist) * en.speed * dt;
        }

        // Attack Player on touch
        if (dist < en.radius + 14) {
          const dmgFactor = activeBuff === "QUANTUM_RISK" ? 1.4 : 1.0;
          player.hp -= en.damage * dt * 2.2 * dmgFactor;
          setCurrentHp(Math.max(0, Math.round(player.hp)));

          // Blademail reflection
          if (activeBuff === "BLADEMAIL") {
            blademailTimerRef.current -= dt;
            if (blademailTimerRef.current <= 0) {
              blademailTimerRef.current = 0.16;
              const reflectDmg = Math.max(
                35,
                Math.round(en.damage * 3.5 * globalDamageMult),
              );
              enemiesRef.current.forEach((nearby) => {
                const nd = Math.hypot(nearby.x - player.x, nearby.y - player.y);
                if (nd <= 160) {
                  nearby.hp -= reflectDmg;
                  nearby.x += ((nearby.x - player.x) / (nd || 1)) * 32;
                  nearby.y += ((nearby.y - player.y) / (nd || 1)) * 32;
                  addFloatingText(
                    `⚡${reflectDmg}`,
                    nearby.x,
                    nearby.y - 12,
                    "#ff0055",
                  );
                }
              });
              reflectRingsRef.current.push({
                x: player.x,
                y: player.y,
                radius: 12,
                maxRadius: 160,
                life: 0.22,
              });
              playSound("reflect", tamagotchi.soundEnabled);
            }
          }

          if (player.hp <= 0) {
            // Check revive
            if (hasRevive && !player.reviveUsed) {
              player.reviveUsed = true;
              player.hp = player.maxHp * 0.5;
              setCurrentHp(Math.round(player.hp));
              playSound("heal", tamagotchi.soundEnabled);
              triggerHaptic("heavy");
              addFloatingText("ВТОРОЕ ДЫХАНИЕ!", player.x, player.y - 30, "#00f0ff");
            } else {
              // Death
              setIsGameOver(true);
              setRunWon(false);
              playSound("gameLose", tamagotchi.soundEnabled);
              triggerHaptic("error");
            }
          }
        }
      });

      // Handle Enemy Deaths & Drop Spawns
      const aliveEnemies: EnemyEntity[] = [];
      enemiesRef.current.forEach((en) => {
        if (en.hp <= 0) {
          killsRef.current += 1;
          setKills(killsRef.current);

          // Vampirism / Nanite Drain heal
          if (activeBuff === "VAMPIRISM") {
            const drainAmount = en.isBoss ? 100 : en.glyph === "🛡️" ? 15 : 2;
            player.hp = Math.min(player.maxHp, player.hp + drainAmount);
            setCurrentHp(Math.round(player.hp));
            addFloatingText(
              `+${drainAmount} HP`,
              player.x,
              player.y - 18,
              "#00ff66",
            );
          }

          // Drop item
          const dropRoll = Math.random();
          if (dropRoll < 0.12) {
            // Medkit drop
            dropsRef.current.push({
              id: nextEntityIdRef.current++,
              type: "MEDKIT",
              x: en.x,
              y: en.y,
              value: medkitHealAmount,
              radius: 12,
            });
          } else if (dropRoll < 0.32) {
            // Byte coin drop
            dropsRef.current.push({
              id: nextEntityIdRef.current++,
              type: "COIN",
              x: en.x,
              y: en.y,
              value: Math.round((en.isBoss ? 25 : 3) * byteMultiplier),
              radius: 10,
            });
          } else {
            // EXP Gem
            dropsRef.current.push({
              id: nextEntityIdRef.current++,
              type: "EXP",
              x: en.x,
              y: en.y,
              value: en.isBoss ? 50 : 8,
              radius: 8,
            });
          }

          if (en.isBoss) {
            // Boss killed!
            playSound("gameWin", tamagotchi.soundEnabled);
            addFloatingText("БОСС УНИЧТОЖЕН! +50 БАЙТОВ", en.x, en.y, "#ffcc00");
            bytesRef.current += 50;
            setBytesCollected(bytesRef.current);
          }
        } else {
          aliveEnemies.push(en);
        }
      });
      enemiesRef.current = aliveEnemies;

      // 5. Update Drops & Magnet Attraction
      const remainingDrops: DropEntity[] = [];
      dropsRef.current.forEach((drop) => {
        const d = Math.hypot(player.x - drop.x, player.y - drop.y);

        // Magnet attraction
        if (d < magnetRadius) {
          drop.x += ((player.x - drop.x) / d) * 320 * dt;
          drop.y += ((player.y - drop.y) / d) * 320 * dt;
        }

        // Pick up
        if (d < drop.radius + 15) {
          if (drop.type === "EXP") {
            playSound("coin", tamagotchi.soundEnabled);
            expRef.current += drop.value;
            setRunExp(expRef.current);

            // Level up check
            if (expRef.current >= expToNextRef.current) {
              expRef.current -= expToNextRef.current;
              levelRef.current += 1;
              expToNextRef.current = Math.floor(expToNextRef.current * 1.35) + 15;
              setRunLevel(levelRef.current);
              setRunExp(expRef.current);
              setExpToNext(expToNextRef.current);

              // Trigger Card Level-up screen!
              setIsLevelingUp(true);
              setUpgradeCards(generateUpgradeCards(weaponsRef.current));
              playSound("levelUp", tamagotchi.soundEnabled);
              triggerHaptic("success");
            }
          } else if (drop.type === "MEDKIT") {
            playSound("heal", tamagotchi.soundEnabled);
            player.hp = Math.min(player.maxHp, player.hp + drop.value);
            setCurrentHp(Math.round(player.hp));
            addFloatingText(`+${drop.value} HP`, player.x, player.y - 20, "#00ff66");
          } else if (drop.type === "COIN") {
            playSound("coin", tamagotchi.soundEnabled);
            bytesRef.current += drop.value;
            setBytesCollected(bytesRef.current);
            addFloatingText(`+${drop.value} B`, drop.x, drop.y - 12, "#ffdd00");
          }
        } else {
          remainingDrops.push(drop);
        }
      });
      dropsRef.current = remainingDrops;

      // Update Floating Texts
      floatingTextsRef.current.forEach((ft) => {
        ft.lifeTime -= dt;
        ft.y -= 25 * dt;
      });
      floatingTextsRef.current = floatingTextsRef.current.filter(
        (ft) => ft.lifeTime > 0,
      );

      // ==========================================
      // RENDER SECTION (Camera & Graphics)
      // ==========================================
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cameraX = canvas.width / 2 - player.x;
      const cameraY = canvas.height / 2 - player.y;

      ctx.save();
      ctx.translate(cameraX, cameraY);

      // Draw Grid Matrix Background
      ctx.strokeStyle = "rgba(0, 255, 102, 0.08)";
      ctx.lineWidth = 1;
      const gridSize = 60;
      const startX = Math.floor((player.x - canvas.width / 2) / gridSize) * gridSize;
      const endX = startX + canvas.width + gridSize * 2;
      const startY = Math.floor((player.y - canvas.height / 2) / gridSize) * gridSize;
      const endY = startY + canvas.height + gridSize * 2;

      for (let x = startX; x <= endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }

      // Draw Drops
      dropsRef.current.forEach((drop) => {
        if (drop.type === "EXP") {
          ctx.fillStyle = "#00f0ff";
          ctx.beginPath();
          ctx.arc(drop.x, drop.y, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (drop.type === "MEDKIT") {
          ctx.fillStyle = "#ff0055";
          ctx.font = "bold 12px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("✚", drop.x, drop.y);
        } else if (drop.type === "COIN") {
          ctx.fillStyle = "#ffdd00";
          ctx.font = "bold 11px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("B", drop.x, drop.y);
        }
      });

      // Draw Projectiles
      projectilesRef.current.forEach((p) => {
        if (p.weaponId === "laser_beam") {
          ctx.strokeStyle = "#00ff66";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - (p.vx / 550) * 22, p.y - (p.vy / 550) * 22);
          ctx.stroke();
        } else if (p.weaponId === "cyber_blade") {
          ctx.strokeStyle = "rgba(0, 255, 102, 0.7)";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(
            p.x,
            p.y,
            p.radius,
            Math.atan2(p.vy, p.vx) - Math.PI * 0.4,
            Math.atan2(p.vy, p.vx) + Math.PI * 0.4,
          );
          ctx.stroke();
        } else if (p.weaponId === "shockwave") {
          ctx.strokeStyle = "rgba(0, 240, 255, 0.6)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = "#ff007f";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw Enemies
      enemiesRef.current.forEach((en) => {
        ctx.fillStyle = en.color;
        ctx.font = en.isBoss ? "bold 14px monospace" : "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(en.glyph, en.x, en.y);

        // Small health bar above enemy
        if (en.hp < en.maxHp) {
          ctx.fillStyle = "rgba(255,0,0,0.5)";
          ctx.fillRect(en.x - 12, en.y - en.radius - 5, 24, 2.5);
          ctx.fillStyle = "#00ff66";
          ctx.fillRect(
            en.x - 12,
            en.y - en.radius - 5,
            (en.hp / en.maxHp) * 24,
            2.5,
          );
        }
      });

      // Draw Player Character (Current Tamagotchi Daemon!)
      ctx.fillStyle = themeColors.primary;
      ctx.shadowColor = themeColors.glow;
      ctx.shadowBlur = 12;

      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("👾", player.x, player.y);

      // Facing indicator spark
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(
        player.x + player.facingX * 16,
        player.y + player.facingY * 16,
        2.5,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Orbiting Blades if weapon is active
      const orbitWep = weaponsRef.current.find((w) => w.id === "orbit_shards");
      if (orbitWep) {
        const bladeCount = 2 + Math.floor(orbitWep.level / 2);
        const orbitRadius = 45;
        const orbitSpeed = runSecondsRef.current * 4.5;
        for (let b = 0; b < bladeCount; b++) {
          const angle = orbitSpeed + (b * Math.PI * 2) / bladeCount;
          const bx = player.x + Math.cos(angle) * orbitRadius;
          const by = player.y + Math.sin(angle) * orbitRadius;

          ctx.fillStyle = "#00ff66";
          ctx.font = "bold 11px monospace";
          ctx.fillText("◆", bx, by);

          // Orbit damage to enemies
          enemiesRef.current.forEach((en) => {
            if (Math.hypot(en.x - bx, en.y - by) < en.radius + 8) {
              en.hp -= 18 * dt * 4;
            }
          });
        }
      }

      // Draw Berserk Aura
      if (activeBuff === "BERSERK") {
        const hpRatio = player.hp / Math.max(1, player.maxHp);
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
          ctx.fillText("ЯРОСТЬ", player.x, player.y - 24);
        }
      }

      // Draw Blademail Reflect Rings
      reflectRingsRef.current.forEach((ring) => {
        ctx.strokeStyle = `rgba(255, 0, 85, ${ring.life * 4.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.stroke();

        for (let sp = 0; sp < 8; sp++) {
          const ang = (sp * Math.PI * 2) / 8;
          ctx.beginPath();
          ctx.moveTo(
            ring.x + Math.cos(ang) * (ring.radius * 0.65),
            ring.y + Math.sin(ang) * (ring.radius * 0.65),
          );
          ctx.lineTo(
            ring.x + Math.cos(ang) * ring.radius,
            ring.y + Math.sin(ang) * ring.radius,
          );
          ctx.stroke();
        }
      });

      // Draw Tesla Lightning Bolts
      lightningBoltsRef.current.forEach((bolt) => {
        ctx.strokeStyle = `rgba(0, 240, 255, ${bolt.life * 5.5})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(bolt.x1, bolt.y1);
        const midX = (bolt.x1 + bolt.x2) / 2 + (Math.random() - 0.5) * 24;
        const midY = (bolt.y1 + bolt.y2) / 2 + (Math.random() - 0.5) * 24;
        ctx.lineTo(midX, midY);
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
    tamagotchi.theme,
    tamagotchi.soundEnabled,
    tamagotchi.morningBoostUntil,
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

  // Finish run handler
  const handleCompleteRun = () => {
    const multiplier = activeBuff === "QUANTUM_RISK" ? 3 : 1;
    const morningExpMult =
      tamagotchi.morningBoostUntil && tamagotchi.morningBoostUntil > Date.now()
        ? 1.25
        : 1.0;

    const baseExp = killsRef.current * 4 + levelRef.current * 15;
    const totalExp = Math.floor(baseExp * multiplier * morningExpMult);

    onFinishRun({
      survivedTime: runSecondsRef.current,
      enemiesKilled: killsRef.current,
      levelReached: levelRef.current,
      bytesGathered: bytesRef.current * multiplier,
      expGathered: totalExp,
      won: runWon,
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white font-mono select-none overflow-hidden">
      {/* Top HUD: Time, Kills, Level, Health */}
      <div className="relative z-10 flex flex-col border-b border-white/20 bg-black/90 p-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm text-yellow-400">
              ⏱ {formatTime(runTime)}
            </span>
            <span className="text-[0.62rem] text-white/60">
              💀 {kills}
            </span>
            <span className="text-[0.62rem] font-bold text-yellow-400">
              💰 {bytesCollected} B
            </span>
          </div>

          {/* Active Overclock & Morning Boost */}
          <div className="flex items-center gap-1.5">
            {activeBuff && activeBuff !== "NONE" && COMBAT_BUFFS[activeBuff] && (
              <span
                className="px-1.5 py-0.5 border text-[0.52rem] font-black uppercase tracking-wider flex items-center gap-1"
                style={{
                  borderColor: COMBAT_BUFFS[activeBuff].color,
                  color: COMBAT_BUFFS[activeBuff].color,
                  backgroundColor: "rgba(0,0,0,0.6)",
                }}
              >
                <span>{COMBAT_BUFFS[activeBuff].glyph}</span>
                <span>{COMBAT_BUFFS[activeBuff].tag}</span>
              </span>
            )}
            {morningBoostActive && (
              <span className="px-1 py-0.5 border border-cyan-400 text-[0.48rem] font-black text-cyan-300 bg-cyan-950/40">
                ⚡ +25% EXP
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span
              className="px-1.5 py-0.5 border text-[0.62rem] font-black"
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
              className="px-2 py-0.5 text-xs text-white/60 hover:text-white"
            >
              [✕]
            </button>
          </div>
        </div>

        {/* Health Bar */}
        <div className="mt-1 flex items-center gap-2 text-[0.58rem] font-bold">
          <span className="text-white/60">ХП:</span>
          <div className="relative h-2 flex-1 bg-white/10 overflow-hidden border border-white/20">
            <div
              className="h-full transition-all duration-150"
              style={{
                width: `${Math.max(0, (currentHp / maxHp) * 100)}%`,
                backgroundColor: currentHp < maxHp * 0.3 ? "#ff2222" : themeColors.primary,
              }}
            />
          </div>
          <span style={{ color: themeColors.primary }}>
            {currentHp} / {maxHp}
          </span>
        </div>

        {/* In-run EXP Bar */}
        <div className="mt-1 flex items-center gap-2 text-[0.52rem]">
          <span className="text-white/40">EXP:</span>
          <div className="h-1 flex-1 bg-white/10">
            <div
              className="h-full bg-cyan-400 transition-all duration-100"
              style={{
                width: `${Math.min(100, (runExp / expToNext) * 100)}%`,
              }}
            />
          </div>
          <span className="text-cyan-400 font-bold">
            {runExp}/{expToNext}
          </span>
        </div>
      </div>

      {/* Main Game Canvas Viewport */}
      <div className="relative flex-1 w-full bg-black">
        <canvas
          ref={canvasRef}
          width={400}
          height={550}
          className="h-full w-full object-cover"
        />

        {/* Bottom Center Virtual Joystick */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto">
          <div
            onPointerDown={handleJoystickPointerDown}
            onPointerMove={handleJoystickPointerMove}
            onPointerUp={handleJoystickPointerUp}
            onPointerCancel={handleJoystickPointerUp}
            className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 bg-black/60 backdrop-blur-sm touch-none transition-opacity"
            style={{
              borderColor: isJoystickActive
                ? themeColors.primary
                : "rgba(255, 255, 255, 0.25)",
              boxShadow: isJoystickActive
                ? `0 0 15px ${themeColors.glow}`
                : undefined,
            }}
          >
            {/* Joystick Thumb Button */}
            <div
              className="h-10 w-10 rounded-full border-2 transition-transform duration-75"
              style={{
                transform: `translate(${joystickThumb.x}px, ${joystickThumb.y}px)`,
                borderColor: themeColors.primary,
                backgroundColor: isJoystickActive
                  ? themeColors.primary
                  : "rgba(0, 255, 102, 0.3)",
              }}
            />
          </div>
          <p className="mt-1 text-center font-mono text-[0.48rem] text-white/40 uppercase tracking-widest">
            ДЖОЙСТИК (360°)
          </p>
        </div>
      </div>

      {/* In-Run Level Up Card Selection Modal */}
      {isLevelingUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md">
          <div
            className="terminal-scanlines relative flex w-full max-w-sm flex-col border-2 bg-black/95 p-4 shadow-2xl font-mono"
            style={{
              borderColor: themeColors.primary,
              boxShadow: `0 0 30px ${themeColors.glow}`,
            }}
          >
            <div className="text-center pb-2 border-b border-white/20">
              <span className="text-sm font-black text-yellow-400 animate-pulse">
                ⚡ НОВЫЙ УРОВЕНЬ РЕЙДА! ⚡
              </span>
              <p className="text-[0.60rem] text-white/60 mt-0.5">
                Выбери модуль улучшения для продолжения боя
              </p>
            </div>

            <div className="my-3 flex flex-col gap-2.5">
              {upgradeCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => handleSelectUpgrade(card)}
                  type="button"
                  className="flex items-center gap-3 border p-3 text-left transition hover:bg-white/10 active:scale-95 bg-black/60"
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

      {/* Game Over / Summary Screen */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 backdrop-blur-md">
          <div
            className="terminal-scanlines relative flex w-full max-w-sm flex-col border-2 bg-black/95 p-5 shadow-2xl font-mono text-center"
            style={{
              borderColor: runWon ? themeColors.primary : "#ff3333",
              boxShadow: `0 0 30px ${runWon ? themeColors.glow : "rgba(255, 50, 50, 0.4)"}`,
            }}
          >
            <h2
              className="text-base font-black uppercase tracking-widest"
              style={{ color: runWon ? themeColors.primary : "#ff3333" }}
            >
              {runWon ? "✦ РЕЙД ЗАВЕРШЕН ПОБЕДОЙ! ✦" : "☠ СИСТЕМА УНИЧТОЖЕНА ☠"}
            </h2>
            <p className="text-[0.62rem] text-white/60 mt-1">
              {runWon
                ? "Ты выжил и очистил сектор от вредоносного ПО!"
                : "Питомец пал в бою. Но собранные данные сохранены!"}
            </p>

            <div className="my-4 grid grid-cols-2 gap-2 border border-white/10 bg-black/60 p-3 text-xs">
              <div className="flex flex-col text-left">
                <span className="text-white/40 text-[0.55rem]">ВРЕМЯ БОЯ</span>
                <span className="font-bold text-yellow-400">
                  {formatTime(runTime)}
                </span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-white/40 text-[0.55rem]">УБИТО ВРАГОВ</span>
                <span className="font-bold text-white">{kills}</span>
              </div>
              <div className="flex flex-col text-left mt-2">
                <span className="text-white/40 text-[0.55rem]">УРОВЕНЬ РЕЙДА</span>
                <span className="font-bold text-cyan-400">УР. {runLevel}</span>
              </div>
              <div className="flex flex-col text-right mt-2">
                <span className="text-white/40 text-[0.55rem]">ДОБЫТО БАЙТОВ</span>
                <span className="font-bold text-yellow-400">
                  +{bytesCollected} B
                </span>
              </div>
            </div>

            <button
              onClick={handleCompleteRun}
              type="button"
              className="w-full border py-3 text-xs font-black uppercase tracking-widest transition"
              style={{
                borderColor: themeColors.primary,
                backgroundColor: themeColors.primary,
                color: "#000",
              }}
            >
              ПЕРЕДАТЬ НАГРАДЫ ТАМАГОЧИ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
