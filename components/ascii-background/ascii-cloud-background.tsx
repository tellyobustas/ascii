"use client";

import { useEffect, useRef } from "react";

type AsciiCloudBackgroundConfig = {
  cloudCount: number;
  particlesPerCloud: number;
  speed: number;
  turbulence: number;
  cohesionStrength: number;
  flowStrength: number;
  trailAmount: number;
  opacity: {
    min: number;
    max: number;
  };
  fontSizeMin: number;
  fontSizeMax: number;
  glyphs: {
    far: string;
    mid: string;
    near: string;
  };
  colors: string[];
};

type CloudAnchor = {
  aspect: number;
  depth: number;
  driftAngle: number;
  phase: number;
  radius: number;
  rotation: number;
  rotationVelocity: number;
  scaleX: number;
  scaleY: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

type Particle = {
  cloudIndex: number;
  color: string;
  depth: number;
  edge: number;
  fontSize: number;
  glyph: string;
  glyphPool: string[];
  localIndex: number;
  localX: number;
  localY: number;
  nextGlyphAt: number;
  opacity: number;
  phase: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

type Scene = {
  clouds: CloudAnchor[];
  particles: Particle[];
  particlesByCloud: Particle[][];
};

const DESKTOP_CONFIG: AsciiCloudBackgroundConfig = {
  cloudCount: 14,
  particlesPerCloud: 64,
  speed: 0.3,
  turbulence: 0.96,
  cohesionStrength: 0.0068,
  flowStrength: 0.07,
  trailAmount: 0.18,
  opacity: {
    min: 0.72,
    max: 1,
  },
  fontSizeMin: 9,
  fontSizeMax: 20,
  glyphs: {
    far: ".·'\"-_",
    mid: ".·'\"^-_/\\|<>+xo",
    near: "*+xo01<>/\\",
  },
  colors: [
    "rgba(0, 255, 120, 0.08)",
    "rgba(80, 255, 160, 0.16)",
    "rgba(190, 255, 220, 0.22)",
    "rgba(255, 255, 255, 0.16)",
  ],
};

const MOBILE_CONFIG: AsciiCloudBackgroundConfig = {
  ...DESKTOP_CONFIG,
  cloudCount: 9,
  particlesPerCloud: 38,
  speed: 0.24,
  flowStrength: 0.056,
  trailAmount: 0.2,
  fontSizeMin: 8,
  fontSizeMax: 16,
};

const REDUCED_MOTION_CONFIG: AsciiCloudBackgroundConfig = {
  ...MOBILE_CONFIG,
  cloudCount: 5,
  particlesPerCloud: 24,
  speed: 0.05,
  turbulence: 0.18,
  flowStrength: 0.012,
  trailAmount: 0.32,
};

const MOBILE_QUERY = "(max-width: 700px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const TAU = Math.PI * 2;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomNormalish() {
  return (
    Math.random() +
    Math.random() +
    Math.random() +
    Math.random() -
    2
  ) / 2;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function pickGlyph(pool: string[]) {
  return pick(pool);
}

function resolveConfig(isMobile: boolean, reducedMotion: boolean) {
  if (reducedMotion) return REDUCED_MOTION_CONFIG;
  return isMobile ? MOBILE_CONFIG : DESKTOP_CONFIG;
}

function scalarNoise(x: number, y: number, time: number, phase: number) {
  const nx = x * 0.0027;
  const ny = y * 0.0027;

  return (
    Math.sin(nx * 1.7 + ny * 0.62 + time * 0.00019 + phase) +
    Math.cos(nx * -0.72 + ny * 1.45 - time * 0.00017 + phase * 0.7) +
    Math.sin((nx + ny) * 1.1 + time * 0.00013 + phase * 1.9) * 0.7
  );
}

function curlNoise(x: number, y: number, time: number, phase: number) {
  const epsilon = 28;
  const left = scalarNoise(x - epsilon, y, time, phase);
  const right = scalarNoise(x + epsilon, y, time, phase);
  const top = scalarNoise(x, y - epsilon, time, phase);
  const bottom = scalarNoise(x, y + epsilon, time, phase);
  const dx = (right - left) / (epsilon * 2);
  const dy = (bottom - top) / (epsilon * 2);
  const curlX = dy;
  const curlY = -dx;
  const length = Math.hypot(curlX, curlY) || 1;

  return {
    x: curlX / length,
    y: curlY / length,
  };
}

function createCloud(index: number, width: number, height: number): CloudAnchor {
  const depth = index === 0 ? 1 : randomBetween(0.42, 0.96);
  const radius = randomBetween(
    Math.min(width, height) * 0.11,
    Math.min(width, height) * 0.27,
  );
  const driftAngle =
    index === 0
      ? randomBetween(-0.25, 0.25)
      : randomBetween(0, TAU);

  return {
    aspect: randomBetween(1.65, 3.45),
    depth,
    driftAngle,
    phase: randomBetween(0, TAU),
    radius,
    rotation: randomBetween(-0.45, 0.45),
    rotationVelocity: randomBetween(-0.00095, 0.00095),
    scaleX: 1,
    scaleY: 1,
    vx: Math.cos(driftAngle) * randomBetween(0.18, 0.46) * depth,
    vy: Math.sin(driftAngle) * randomBetween(0.08, 0.28) * depth,
    x:
      index === 0
        ? randomBetween(width * 0.08, width * 0.28)
        : randomBetween(-width * 0.08, width * 1.08),
    y:
      index === 0
        ? randomBetween(height * 0.18, height * 0.42)
        : randomBetween(height * 0.05, height * 0.95),
  };
}

function createParticle(
  cloud: CloudAnchor,
  cloudIndex: number,
  localIndex: number,
  config: AsciiCloudBackgroundConfig,
  now: number,
): Particle {
  const lobe = pick([-0.58, -0.16, 0.18, 0.56]);
  const u = clamp(lobe + randomNormalish() * 0.38, -1, 1);
  const envelope = Math.pow(Math.max(0.05, 1 - Math.abs(u)), 0.58);
  const edgeScatter = Math.random() < 0.22 ? randomBetween(0.72, 1.18) : randomBetween(0.08, 0.76);
  const side = Math.random() < 0.5 ? -1 : 1;
  const curve =
    Math.sin((u + 0.2) * Math.PI * 1.2 + cloud.phase) *
    cloud.radius *
    0.16;
  const localX =
    u * cloud.radius * cloud.aspect +
    randomNormalish() * cloud.radius * 0.13;
  const localY =
    side * edgeScatter * envelope * cloud.radius * 0.64 +
    curve +
    randomNormalish() * cloud.radius * 0.08;
  const edge = clamp(Math.abs(u) * 0.64 + edgeScatter * 0.54, 0, 1);
  const depth = pick([0.55, 0.74, 0.88, 1, 1.16]);
  const glyphPool =
    depth < 0.7
      ? Array.from(config.glyphs.far)
      : depth > 1
        ? Array.from(config.glyphs.near)
        : Array.from(config.glyphs.mid);
  const fontSize =
    randomBetween(config.fontSizeMin, config.fontSizeMax) *
    depth *
    randomBetween(0.86, 1.08);
  const opacity =
    randomBetween(config.opacity.min, config.opacity.max) *
    (0.58 + depth * 0.42) *
    (1 - edge * 0.22);

  return {
    cloudIndex,
    color: pick(config.colors),
    depth,
    edge,
    fontSize,
    glyph: pickGlyph(glyphPool),
    glyphPool,
    localIndex,
    localX,
    localY,
    nextGlyphAt: now + randomBetween(500, 2000),
    opacity,
    phase: randomBetween(0, TAU),
    vx: cloud.vx + randomNormalish() * 0.2,
    vy: cloud.vy + randomNormalish() * 0.16,
    x: cloud.x + localX * 0.82 + randomNormalish() * 22,
    y: cloud.y + localY * 0.82 + randomNormalish() * 18,
  };
}

function createScene(
  width: number,
  height: number,
  config: AsciiCloudBackgroundConfig,
): Scene {
  const clouds: CloudAnchor[] = [];
  const particlesByCloud: Particle[][] = [];
  const now = performance.now();

  for (let cloudIndex = 0; cloudIndex < config.cloudCount; cloudIndex += 1) {
    const cloud = createCloud(cloudIndex, width, height);
    const particleCount = Math.round(
      config.particlesPerCloud * randomBetween(0.78, 1.18) * cloud.depth,
    );

    clouds.push(cloud);
    particlesByCloud.push(
      Array.from({ length: particleCount }, (_, localIndex) =>
        createParticle(cloud, cloudIndex, localIndex, config, now),
      ),
    );
  }

  const particles = particlesByCloud
    .flat()
    .sort((first, second) => first.depth - second.depth);

  return {
    clouds,
    particles,
    particlesByCloud,
  };
}

function rotatePoint(x: number, y: number, angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

function targetForParticle(
  particle: Particle,
  cloud: CloudAnchor,
  time: number,
) {
  const pulse = Math.sin(time * 0.00042 + cloud.phase);
  const innerWave = Math.sin(
    time * 0.00068 + particle.phase + particle.localX * 0.008,
  );
  const edgeLoose = particle.edge * Math.sin(time * 0.0009 + particle.phase);
  const localX =
    particle.localX *
    cloud.scaleX *
    (1 + pulse * 0.08 + innerWave * 0.025);
  const localY =
    particle.localY *
      cloud.scaleY *
      (1 - pulse * 0.05 + Math.cos(time * 0.00061 + particle.phase) * 0.035) +
    edgeLoose * cloud.radius * 0.08;
  const rotated = rotatePoint(localX, localY, cloud.rotation);

  return {
    x: cloud.x + rotated.x,
    y: cloud.y + rotated.y,
  };
}

function wrapCloud(
  cloud: CloudAnchor,
  cloudParticles: Particle[],
  width: number,
  height: number,
) {
  const margin = cloud.radius * cloud.aspect + 140;
  let shiftX = 0;
  let shiftY = 0;

  if (cloud.x < -margin) shiftX = width + margin * 2;
  if (cloud.x > width + margin) shiftX = -(width + margin * 2);
  if (cloud.y < -margin) shiftY = height + margin * 2;
  if (cloud.y > height + margin) shiftY = -(height + margin * 2);

  if (shiftX === 0 && shiftY === 0) return;

  cloud.x += shiftX;
  cloud.y += shiftY;

  for (const particle of cloudParticles) {
    particle.x += shiftX;
    particle.y += shiftY;
  }
}

function updateCloud(
  cloud: CloudAnchor,
  time: number,
  frameScale: number,
  config: AsciiCloudBackgroundConfig,
) {
  const flow = curlNoise(cloud.x, cloud.y, time, cloud.phase);
  const driftX = Math.cos(cloud.driftAngle + Math.sin(time * 0.00008 + cloud.phase) * 0.8);
  const driftY = Math.sin(cloud.driftAngle + Math.cos(time * 0.00007 + cloud.phase) * 0.55);
  const desiredVx = (driftX * 0.72 + flow.x * 0.28) * config.speed * cloud.depth;
  const desiredVy = (driftY * 0.72 + flow.y * 0.28) * config.speed * cloud.depth;

  cloud.vx += (desiredVx - cloud.vx) * 0.012 * frameScale;
  cloud.vy += (desiredVy - cloud.vy) * 0.012 * frameScale;
  cloud.x += cloud.vx * frameScale;
  cloud.y += cloud.vy * frameScale;
  cloud.rotation +=
    (cloud.rotationVelocity + Math.sin(time * 0.00011 + cloud.phase) * 0.00018) *
    frameScale;
  cloud.scaleX = 1 + Math.sin(time * 0.00022 + cloud.phase) * 0.14;
  cloud.scaleY = 1 + Math.cos(time * 0.00019 + cloud.phase * 1.7) * 0.11;
}

function updateParticle(
  particle: Particle,
  cloud: CloudAnchor,
  cloudParticles: Particle[],
  time: number,
  frameScale: number,
  config: AsciiCloudBackgroundConfig,
  reducedMotion: boolean,
) {
  const target = targetForParticle(particle, cloud, time);
  const flow = curlNoise(
    particle.x * (0.88 + particle.depth * 0.12),
    particle.y * (0.88 + particle.depth * 0.12),
    time,
    particle.phase + cloud.phase,
  );
  let separationX = 0;
  let separationY = 0;
  let alignmentX = 0;
  let alignmentY = 0;
  let neighborCount = 0;
  const checks = Math.min(12, cloudParticles.length - 1);
  const stride = 7 + (particle.localIndex % 5);

  for (let offset = 1; offset <= checks; offset += 1) {
    const other =
      cloudParticles[(particle.localIndex + offset * stride) % cloudParticles.length];
    if (!other || other === particle) continue;

    const dx = other.x - particle.x;
    const dy = other.y - particle.y;
    const distanceSquared = dx * dx + dy * dy;
    const separationRadius = 15 + particle.fontSize * 0.95;

    if (distanceSquared > 0 && distanceSquared < separationRadius * separationRadius) {
      const distance = Math.sqrt(distanceSquared);
      const push = (separationRadius - distance) / separationRadius;
      separationX -= (dx / distance) * push;
      separationY -= (dy / distance) * push;
    }

    if (distanceSquared < 105 * 105) {
      alignmentX += other.vx;
      alignmentY += other.vy;
      neighborCount += 1;
    }
  }

  if (neighborCount > 0) {
    alignmentX = alignmentX / neighborCount - particle.vx;
    alignmentY = alignmentY / neighborCount - particle.vy;
  }

  const targetStrength =
    config.cohesionStrength * (1.16 - particle.edge * 0.42) * (0.82 + particle.depth * 0.22);
  const flowStrength = config.flowStrength * particle.depth;
  const looseEdge = 1 + particle.edge * 0.36;

  particle.vx +=
    ((target.x - particle.x) * targetStrength +
      flow.x * flowStrength * looseEdge +
      separationX * 0.052 +
      alignmentX * 0.016) *
    frameScale;
  particle.vy +=
    ((target.y - particle.y) * targetStrength +
      flow.y * flowStrength * looseEdge +
      separationY * 0.052 +
      alignmentY * 0.016) *
    frameScale;

  particle.vx *= reducedMotion ? 0.88 : 0.935;
  particle.vy *= reducedMotion ? 0.88 : 0.935;

  const maxSpeed = (reducedMotion ? 0.22 : 1.25) * particle.depth;
  const speed = Math.hypot(particle.vx, particle.vy);
  if (speed > maxSpeed) {
    particle.vx = (particle.vx / speed) * maxSpeed;
    particle.vy = (particle.vy / speed) * maxSpeed;
  }

  particle.x += particle.vx * frameScale;
  particle.y += particle.vy * frameScale;

  if (time > particle.nextGlyphAt) {
    particle.glyph = pickGlyph(particle.glyphPool);
    particle.nextGlyphAt = time + randomBetween(650, 2200);
  }
}

function drawScene(
  context: CanvasRenderingContext2D,
  scene: Scene,
  time: number,
  width: number,
  height: number,
  config: AsciiCloudBackgroundConfig,
  fontFamily: string,
) {
  context.globalCompositeOperation = "source-over";
  context.fillStyle = `rgba(0, 0, 0, ${config.trailAmount})`;
  context.fillRect(0, 0, width, height);
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (const particle of scene.particles) {
    const flicker =
      Math.sin(time * 0.0015 + particle.phase) * 0.026 +
      Math.sin(time * 0.00047 + particle.phase * 2.3) * 0.018;
    const shimmer = Math.sin(time * 0.001 + particle.localX * 0.01 + particle.phase);
    const alpha = clamp(
      particle.opacity + flicker + (shimmer > 0.94 ? 0.045 : 0),
      config.opacity.min,
      config.opacity.max * 1.18,
    );
    const jitterX =
      Math.sin(time * 0.0013 + particle.phase + particle.localY * 0.01) *
      0.54 *
      particle.depth;
    const jitterY =
      Math.cos(time * 0.0011 + particle.phase + particle.localX * 0.008) *
      0.54 *
      particle.depth;
    const rotation =
      Math.sin(time * 0.00062 + particle.phase) * 0.08 * particle.depth;

    context.save();
    context.translate(particle.x + jitterX, particle.y + jitterY);
    context.rotate(rotation);
    context.globalAlpha = alpha;
    context.fillStyle = particle.color;
    context.font = `${particle.fontSize}px ${fontFamily}`;
    context.fillText(particle.glyph, 0, 0);
    context.restore();
  }

  context.globalAlpha = 1;
}

export function AsciiCloudBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    const mobileQuery = window.matchMedia(MOBILE_QUERY);
    const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let lastTime = performance.now();
    let isMobile = mobileQuery.matches;
    let reducedMotion = reducedMotionQuery.matches;
    let config = resolveConfig(isMobile, reducedMotion);
    let scene = createScene(1, 1, config);
    let fontFamily =
      getComputedStyle(document.body).fontFamily ||
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.fillStyle = "rgb(0, 0, 0)";
      context.fillRect(0, 0, width, height);

      isMobile = mobileQuery.matches;
      reducedMotion = reducedMotionQuery.matches;
      config = resolveConfig(isMobile, reducedMotion);
      scene = createScene(width, height, config);
      fontFamily =
        getComputedStyle(document.body).fontFamily ||
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    };

    const handleMediaChange = () => resize();

    const tick = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;
      const motionScale = reducedMotion ? 0.16 : 1;
      const frameScale = Math.min(delta / 16.67, 2.4) * motionScale;

      for (let index = 0; index < scene.clouds.length; index += 1) {
        const cloud = scene.clouds[index];
        const cloudParticles = scene.particlesByCloud[index] ?? [];
        updateCloud(cloud, time, frameScale, config);
        wrapCloud(cloud, cloudParticles, width, height);
      }

      for (const particle of scene.particles) {
        const cloud = scene.clouds[particle.cloudIndex];
        const cloudParticles = scene.particlesByCloud[particle.cloudIndex] ?? [];
        updateParticle(
          particle,
          cloud,
          cloudParticles,
          time,
          frameScale,
          config,
          reducedMotion,
        );
      }

      drawScene(context, scene, time, width, height, config, fontFamily);
      animationFrame = window.requestAnimationFrame(tick);
    };

    resize();
    animationFrame = window.requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    mobileQuery.addEventListener("change", handleMediaChange);
    reducedMotionQuery.addEventListener("change", handleMediaChange);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      mobileQuery.removeEventListener("change", handleMediaChange);
      reducedMotionQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  return (
    <canvas
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 bg-black"
      ref={canvasRef}
    />
  );
}
