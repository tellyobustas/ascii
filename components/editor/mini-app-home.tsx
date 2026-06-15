"use client";

import { useEffect, useState } from "react";
import { AsciilographMark } from "@/components/editor/asciilograph-mark";
import { ImageGenerator } from "@/components/editor/image-generator";
import { TextGenerator } from "@/components/editor/text-generator";
import { VideoGenerator } from "@/components/editor/video-generator";
import { loadTelegramWebAppSdk } from "@/lib/telegram/client-export";

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
      className="ascii-logo ascii-logo-glitch whitespace-nowrap text-[0.92rem] font-black leading-none text-ascii-green min-[370px]:text-[1rem] min-[420px]:text-[1.16rem] sm:text-4xl"
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
    let isMounted = true;

    void loadTelegramWebAppSdk()
      .catch(() => undefined)
      .then(() => {
        if (!isMounted) return;

        window.Telegram?.WebApp?.ready();
        window.Telegram?.WebApp?.expand();
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeLabel = activeTab.toLowerCase();

  return (
    <main className="relative min-h-dvh overflow-hidden bg-transparent text-ascii-white">
      <section className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="bg-black/45 p-3 shadow-[0_0_18px_rgba(0,255,102,0.06)] backdrop-blur-[1px]">
          <div className="flex items-center gap-2 min-[390px]:gap-3">
            <AsciilographMark />
            <div className="min-w-0 flex-1">
              <GlitchBrand />
              <p className="mt-2 text-[0.54rem] uppercase text-ascii-white/62 min-[390px]:text-[0.62rem]">
                text / image / video ascii converter
              </p>
            </div>
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

        <section className="terminal-scanlines mt-3 bg-black/58 p-3 backdrop-blur-[1px]">
          <div className="flex items-center justify-between gap-3 pb-2">
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
          ASCIILOGRAPH / MADE BY GESSWRLDWIDE
        </footer>
      </section>
    </main>
  );
}
