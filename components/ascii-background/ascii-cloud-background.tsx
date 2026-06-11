"use client";

import { useEffect, useRef } from "react";

type AsciiCloudBackgroundConfig = {
  cloudCount: number;
  particlesPerCloud: number;
  speed: number;
  opacity: {
    min: number;
    max: number;
  };
  palette: string[];
  symbols: string;
  turbulence: number;
  fontSize: {
    min: number;
    max: number;
  };
};

type Particle = {
  cloudIndex: number;
  char: string;
  color: string;
  flicker: number;
  opacity: number;
  phase: number;
  size: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

type Cloud = {
  phase: number;
  radius: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

const DEFAULT_CONFIG: AsciiCloudBackgroundConfig = {
  cloudCount: 5,
  particlesPerCloud: 30,
  speed: 0.34,
  opacity: {
    min: 0.08,
    max: 0.25,
  },
  palette: ["#00ff66", "#0a5f31", "#f2f2f2", "#7f8f84"],
  symbols: "./\\|_-+=*#%@<>[]{}01",
  turbulence: 0.13,
  fontSize: {
    min: 10,
    max: 18,
  },
};

const MOBILE_QUERY = "(max-width: 700px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function wrap(value: number, max: number, margin: number) {
  if (value < -margin) return max + margin;
  if (value > max + margin) return -margin;
  return value;
}

function resolveConfig(isMobile: boolean): AsciiCloudBackgroundConfig {
  if (!isMobile) return DEFAULT_CONFIG;

  return {
    ...DEFAULT_CONFIG,
    cloudCount: 4,
    particlesPerCloud: 18,
    speed: 0.28,
    fontSize: {
      min: 9,
      max: 15,
    },
  };
}

function createScene(width: number, height: number, config: AsciiCloudBackgroundConfig) {
  const clouds: Cloud[] = [];
  const particles: Particle[] = [];
  const chars = Array.from(config.symbols);

  for (let cloudIndex = 0; cloudIndex < config.cloudCount; cloudIndex += 1) {
    const cloud: Cloud = {
      phase: randomBetween(0, Math.PI * 2),
      radius: randomBetween(70, Math.min(width, height) * 0.2),
      vx: randomBetween(-0.45, 0.45) * config.speed,
      vy: randomBetween(-0.24, 0.24) * config.speed,
      x: randomBetween(width * 0.08, width * 0.92),
      y: randomBetween(height * 0.08, height * 0.92),
    };

    clouds.push(cloud);

    for (let index = 0; index < config.particlesPerCloud; index += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const distance = randomBetween(0, cloud.radius);

      particles.push({
        char: pick(chars),
        cloudIndex,
        color: pick(config.palette),
        flicker: randomBetween(0.018, 0.065),
        opacity: randomBetween(config.opacity.min, config.opacity.max),
        phase: randomBetween(0, Math.PI * 2),
        size: randomBetween(config.fontSize.min, config.fontSize.max),
        vx: cloud.vx + randomBetween(-0.28, 0.28),
        vy: cloud.vy + randomBetween(-0.18, 0.18),
        x: cloud.x + Math.cos(angle) * distance,
        y: cloud.y + Math.sin(angle) * distance * 0.62,
      });
    }
  }

  return { clouds, particles };
}

export function AsciiCloudBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let lastTime = performance.now();
    let isMobile = window.matchMedia(MOBILE_QUERY).matches;
    let reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
    let config = resolveConfig(isMobile);
    let scene = createScene(1, 1, config);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      isMobile = window.matchMedia(MOBILE_QUERY).matches;
      reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
      config = resolveConfig(isMobile);
      scene = createScene(width, height, config);
    };

    const update = (delta: number, time: number) => {
      const timeScale = reducedMotion ? 0.05 : 1;
      const frameScale = Math.min(delta / 16.67, 2.2) * timeScale;
      const margin = 90;

      for (const cloud of scene.clouds) {
        const driftX = Math.cos(time * 0.00012 + cloud.phase) * 0.014;
        const driftY = Math.sin(time * 0.0001 + cloud.phase) * 0.011;

        cloud.vx += driftX * frameScale;
        cloud.vy += driftY * frameScale;
        cloud.vx *= 0.996;
        cloud.vy *= 0.996;
        cloud.x = wrap(cloud.x + cloud.vx * frameScale, width, margin);
        cloud.y = wrap(cloud.y + cloud.vy * frameScale, height, margin);
      }

      // Small boids pass per cloud: separation, alignment, cohesion and a soft
      // pull to the moving cloud center keep each flock alive without chaos.
      for (const particle of scene.particles) {
        const cloud = scene.clouds[particle.cloudIndex];
        let separationX = 0;
        let separationY = 0;
        let alignmentX = 0;
        let alignmentY = 0;
        let cohesionX = 0;
        let cohesionY = 0;
        let neighborCount = 0;

        for (const other of scene.particles) {
          if (other === particle || other.cloudIndex !== particle.cloudIndex) {
            continue;
          }

          const dx = other.x - particle.x;
          const dy = other.y - particle.y;
          const distanceSquared = dx * dx + dy * dy;

          if (distanceSquared > 0 && distanceSquared < 52 * 52) {
            const distance = Math.sqrt(distanceSquared);
            separationX -= dx / distance;
            separationY -= dy / distance;
          }

          if (distanceSquared < 118 * 118) {
            alignmentX += other.vx;
            alignmentY += other.vy;
            cohesionX += other.x;
            cohesionY += other.y;
            neighborCount += 1;
          }
        }

        if (neighborCount > 0) {
          alignmentX = alignmentX / neighborCount - particle.vx;
          alignmentY = alignmentY / neighborCount - particle.vy;
          cohesionX = cohesionX / neighborCount - particle.x;
          cohesionY = cohesionY / neighborCount - particle.y;
        }

        const turbulenceX =
          Math.cos(time * 0.0011 + particle.phase + particle.y * 0.015) *
          config.turbulence;
        const turbulenceY =
          Math.sin(time * 0.0009 + particle.phase + particle.x * 0.012) *
          config.turbulence;
        const centerPullX = (cloud.x - particle.x) * 0.00075;
        const centerPullY = (cloud.y - particle.y) * 0.00075;

        particle.vx +=
          (separationX * 0.018 +
            alignmentX * 0.006 +
            cohesionX * 0.00022 +
            centerPullX +
            turbulenceX * 0.012) *
          frameScale;
        particle.vy +=
          (separationY * 0.018 +
            alignmentY * 0.006 +
            cohesionY * 0.00022 +
            centerPullY +
            turbulenceY * 0.012) *
          frameScale;

        const maxSpeed = reducedMotion ? 0.18 : 0.82;
        const speed = Math.hypot(particle.vx, particle.vy);
        if (speed > maxSpeed) {
          particle.vx = (particle.vx / speed) * maxSpeed;
          particle.vy = (particle.vy / speed) * maxSpeed;
        }

        particle.x = wrap(particle.x + particle.vx * frameScale, width, margin);
        particle.y = wrap(particle.y + particle.vy * frameScale, height, margin);
      }
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      context.textAlign = "center";
      context.textBaseline = "middle";

      for (const particle of scene.particles) {
        const flicker =
          Math.sin(time * particle.flicker + particle.phase) * 0.035;
        const jitterX = Math.cos(time * 0.002 + particle.phase) * 0.85;
        const jitterY = Math.sin(time * 0.0017 + particle.phase) * 0.85;
        const rotation = Math.sin(time * 0.0008 + particle.phase) * 0.08;

        context.save();
        context.translate(particle.x + jitterX, particle.y + jitterY);
        context.rotate(rotation);
        context.globalAlpha = Math.max(
          config.opacity.min,
          Math.min(config.opacity.max, particle.opacity + flicker),
        );
        context.fillStyle = particle.color;
        context.font = `${particle.size}px var(--font-geist-mono), ui-monospace, monospace`;
        context.fillText(particle.char, 0, 0);
        context.restore();
      }
    };

    const tick = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;
      update(delta, time);
      draw(time);
      animationFrame = window.requestAnimationFrame(tick);
    };

    resize();
    animationFrame = window.requestAnimationFrame(tick);
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
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
