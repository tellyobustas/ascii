"use client";

import { useEffect, useState } from "react";
import { ImageGenerator } from "@/components/editor/image-generator";
import { TextGenerator } from "@/components/editor/text-generator";
import { VideoGenerator } from "@/components/editor/video-generator";

const tabs = ["TEXT", "IMAGE", "VIDEO"] as const;
const BRAND = "ASCIILOGRAPH";
const GLITCH_GLYPHS = "#$%*+/\\<>[]{}01";

type TabName = (typeof tabs)[number];

function GlitchBrand() {
  const [chars, setChars] = useState(() => BRAND.split(""));

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const timers = new Set<number>();
    const scheduleLetter = (letterIndex: number, delay: number) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        setChars((currentChars) =>
          currentChars.map((char, index) =>
            index === letterIndex
              ? GLITCH_GLYPHS[Math.floor(Math.random() * GLITCH_GLYPHS.length)]
              : char,
          ),
        );

        const resetTimer = window.setTimeout(() => {
          timers.delete(resetTimer);
          setChars((currentChars) =>
            currentChars.map((char, index) =>
              index === letterIndex ? BRAND[index] : char,
            ),
          );
          scheduleLetter(letterIndex, 520 + Math.random() * 1900);
        }, 70 + Math.random() * 180);

        timers.add(resetTimer);
      }, delay);

      timers.add(timer);
    };

    BRAND.split("").forEach((_, index) => {
      scheduleLetter(index, 160 + Math.random() * 1800 + index * 27);
    });

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  return (
    <h1
      aria-label={BRAND}
      className="ascii-logo ascii-logo-glitch text-[2.45rem] font-black leading-none text-ascii-green sm:text-5xl"
    >
      {chars.map((char, index) => (
        <span
          className="inline-block min-w-[0.62em]"
          key={BRAND[index] + String(index)}
        >
          {char}
        </span>
      ))}
    </h1>
  );
}

export function MiniAppHome() {
  const [activeTab, setActiveTab] = useState<TabName>("TEXT");

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
  }, []);

  const activeLabel = activeTab.toLowerCase();

  return (
    <main className="relative min-h-dvh overflow-hidden bg-transparent text-ascii-white">
      <section className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="border border-ascii-green/30 bg-black/70 p-3 shadow-[0_0_18px_rgba(0,255,102,0.06)] backdrop-blur-[1px]">
          <div className="flex items-center justify-between gap-3 text-[0.58rem] uppercase text-ascii-white/50">
            <span>mini app</span>
            <span>online</span>
          </div>

          <div className="pt-3">
            <GlitchBrand />
            <p className="mt-2 text-[0.7rem] uppercase text-ascii-white/62">
              text / image / video converter
            </p>
          </div>
        </header>

        <nav
          aria-label="ASCIILOGRAPH generator mode"
          className="mt-3 grid grid-cols-3 border border-ascii-green/30 bg-black/72"
        >
          {tabs.map((tab) => {
            const isActive = tab === activeTab;

            return (
              <button
                aria-pressed={isActive}
                className={
                  "min-h-11 border-r border-ascii-green/20 px-2 text-xs font-black transition last:border-r-0 " +
                  (isActive
                    ? "bg-ascii-green text-black"
                    : "bg-transparent text-ascii-green/78 hover:bg-ascii-green/10 hover:text-ascii-green")
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

        <section className="terminal-scanlines mt-3 border border-ascii-green/30 bg-black/74 p-3 backdrop-blur-[1px]">
          <div className="flex items-center justify-between gap-3 border-b border-ascii-green/18 pb-2">
            <h2 className="text-sm font-black uppercase text-ascii-white/78">
              {activeTab} GENERATOR
            </h2>
            <span className="text-[0.58rem] uppercase text-ascii-green/62">
              / {activeLabel}
            </span>
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
