"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageGenerator } from "@/components/editor/image-generator";
import { StatusPill } from "@/components/editor/status-pill";
import { TextGenerator } from "@/components/editor/text-generator";
import { VideoGenerator } from "@/components/editor/video-generator";
import { IMAGE_ASCII_PRESETS } from "@/lib/ascii/image";
import { VIDEO_ASCII_PRESETS, VIDEO_RENDER_LIMITS } from "@/lib/ascii/video";

const tabs = ["TEXT", "IMAGE", "VIDEO"] as const;

type TabName = (typeof tabs)[number];

const imagePresetBadges = [
  IMAGE_ASCII_PRESETS.brailleColor.shortLabel,
  IMAGE_ASCII_PRESETS.bayerDither.shortLabel,
  IMAGE_ASCII_PRESETS.blocks.shortLabel,
];

const videoPresetBadges = [
  VIDEO_ASCII_PRESETS.telegramLoop.shortLabel,
  VIDEO_ASCII_PRESETS.bayerMotion.shortLabel,
  String(VIDEO_RENDER_LIMITS.defaultFps) + " FPS",
];

const tabMeta: Record<
  TabName,
  {
    command: string;
    copy: string;
    details: string[];
    presets: string[];
    status: string;
  }
> = {
  TEXT: {
    command: "figlet --font graffiti --fit tg-post",
    copy: "ASCII text posters with searchable figlet faces and canvas fitting.",
    details: ["font search", "live fit", "copy ASCII"],
    presets: ["Standard", "Slant", "Doom"],
    status: "text module online",
  },
  IMAGE: {
    command: "sharp input.png | braille --lit-color --threshold 50",
    copy: "Image engine presets are prepared for braille, bitmap and dither output.",
    details: ["2x4 braille map", "lit-pixel color", "contrast + sharpen"],
    presets: imagePresetBadges,
    status: "image engine mapped",
  },
  VIDEO: {
    command: "ffmpeg -i clip.mp4 -an -pix_fmt yuv420p -movflags +faststart",
    copy: "Video job contract is ready for short silent Telegram MP4 animations.",
    details: ["job stages", "ascii container", "worker-ready"],
    presets: videoPresetBadges,
    status: "video pipeline mapped",
  },
};

export function MiniAppHome() {
  const [activeTab, setActiveTab] = useState<TabName>("TEXT");
  const activeMeta = tabMeta[activeTab];

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
  }, []);

  const bootLines = useMemo(
    () => [
      "ASCII/OS v0.2",
      "MEM 640K OK",
      "DISPLAY: TELEGRAM_WEBAPP",
      "STYLE: BLACK GREEN WHITE",
      "READY.",
    ],
    [],
  );

  return (
    <main className="relative min-h-dvh overflow-hidden bg-transparent text-ascii-white">
      <section className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="border border-ascii-green/45 bg-black/82 p-3 shadow-[0_0_0_1px_rgba(0,0,0,0.95),0_0_24px_rgba(0,255,102,0.08)]">
          <div className="flex items-center justify-between gap-3 border-b border-ascii-green/25 pb-2">
            <StatusPill label="mini app" />
            <span className="text-[0.65rem] uppercase tracking-[0.18em] text-ascii-white/55">
              online
            </span>
          </div>

          <div className="pt-4">
            <h1 className="ascii-logo text-5xl font-black leading-none tracking-normal text-ascii-green sm:text-6xl">
              ASCII
            </h1>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-ascii-white/75">
              text / image / video converter
            </p>
          </div>

          <pre className="mt-4 overflow-hidden border border-ascii-green/20 bg-black px-3 py-2 text-[0.68rem] leading-5 text-ascii-green/78">
            {bootLines.map((line) => "> " + line).join("\n")}
          </pre>
        </header>

        <nav
          aria-label="ASCII generator mode"
          className="mt-3 grid grid-cols-3 border border-ascii-green/45 bg-black/90"
        >
          {tabs.map((tab) => {
            const isActive = tab === activeTab;

            return (
              <button
                aria-pressed={isActive}
                className={
                  "min-h-12 border-r border-ascii-green/25 px-2 text-sm font-black tracking-[0.1em] transition last:border-r-0 " +
                  (isActive
                    ? "bg-ascii-green text-black"
                    : "bg-black text-ascii-green hover:bg-ascii-green/10")
                }
                key={tab}
                onClick={() => setActiveTab(tab)}
                type="button"
              >
                {tab}
              </button>
            );
          })}
        </nav>

        <section className="terminal-scanlines mt-3 border border-ascii-green/45 bg-black/86 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.18em] text-ascii-green/75">
                active process
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-normal text-ascii-white">
                {activeTab} GENERATOR
              </h2>
            </div>
            <StatusPill label={activeTab} />
          </div>

          <div className="mt-4 border border-ascii-green/25 bg-black/82 p-3">
            <p className="text-xs leading-5 text-ascii-white/72">
              {activeMeta.copy}
            </p>
            <code className="mt-3 block overflow-hidden text-ellipsis whitespace-nowrap border-t border-ascii-green/20 pt-3 text-[0.68rem] text-ascii-green">
              $ {activeMeta.command}
            </code>
          </div>

          {activeTab === "TEXT" ? <TextGenerator /> : null}
          {activeTab === "IMAGE" ? <ImageGenerator /> : null}
          {activeTab === "VIDEO" ? <VideoGenerator /> : null}
        </section>

        <footer className="mt-auto pt-4 text-center text-[0.62rem] uppercase tracking-[0.18em] text-ascii-white/38">
          ascii terminal lab / tg mini app
        </footer>
      </section>
    </main>
  );
}
