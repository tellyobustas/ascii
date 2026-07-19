"use client";

import { useEffect, useState } from "react";
import { AsciilographMark } from "@/components/editor/asciilograph-mark";
import { ImageGenerator } from "@/components/editor/image-generator";
import { TextGenerator } from "@/components/editor/text-generator";
import { VideoGenerator } from "@/components/editor/video-generator";
import {
  getTelegramInitData,
  loadTelegramWebAppSdk,
} from "@/lib/telegram/client-export";

const tabs = ["TEXT", "IMAGE", "VIDEO"] as const;
const BRAND = "ASCIILOGRAPH";
const GLITCH_GLYPHS = "#$%*+/\\<>[]{}01";
const PUBLIC_REQUIRED_CHANNEL_URL =
  process.env.NEXT_PUBLIC_REQUIRED_CHANNEL_URL ?? "";
const PUBLIC_REQUIRED_CHANNEL_TITLE =
  process.env.NEXT_PUBLIC_REQUIRED_CHANNEL_TITLE ?? "";

type TabName = (typeof tabs)[number];
type AccessStatus = "checking" | "granted" | "locked" | "telegram-required";

type TelegramValidateResponse =
  | {
      ok: true;
      subscription: {
        channelTitle: string;
        channelUrl: string;
        ok: boolean;
        required: boolean;
      };
      user: {
        id: number;
        username?: string;
      };
    }
  | {
      message: string;
      ok: false;
    };

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

function openTelegramUrl(url: string) {
  if (!url || typeof window === "undefined") return;

  window.Telegram?.WebApp?.openTelegramLink?.(url);

  if (!window.Telegram?.WebApp?.openTelegramLink) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function AccessPanel({
  channelTitle,
  channelUrl,
  message,
  onRetry,
  status,
}: {
  channelTitle: string;
  channelUrl: string;
  message: string;
  onRetry: () => void;
  status: AccessStatus;
}) {
  const isTelegramRequired = status === "telegram-required";

  return (
    <section className="terminal-scanlines mt-3 bg-black/58 p-3 backdrop-blur-[1px]">
      <div className="bg-black/72 p-4">
        <p className="text-[0.62rem] uppercase tracking-[0.18em] text-ascii-green/72">
          access gate
        </p>
        <h2 className="mt-3 text-xl font-black uppercase leading-tight text-ascii-green">
          {status === "checking"
            ? "checking access"
            : isTelegramRequired
              ? "open in telegram"
              : "subscribe to unlock"}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ascii-white/68">
          {message}
        </p>

        {!isTelegramRequired && channelTitle ? (
          <p className="mt-3 text-[0.68rem] uppercase tracking-[0.12em] text-ascii-white/46">
            required channel / {channelTitle}
          </p>
        ) : null}

        <div className="mt-5 grid gap-3 min-[380px]:grid-cols-2">
          {channelUrl ? (
            <button
              className="min-h-12 border border-ascii-green bg-ascii-green px-4 text-xs font-black uppercase tracking-[0.14em] text-black"
              onClick={() => openTelegramUrl(channelUrl)}
              type="button"
            >
              subscribe
            </button>
          ) : null}
          <button
            className="min-h-12 border border-ascii-green/72 bg-black/65 px-4 text-xs font-black uppercase tracking-[0.14em] text-ascii-green disabled:opacity-45"
            onClick={onRetry}
            type="button"
          >
            {status === "checking" ? "check again" : "check"}
          </button>
        </div>
      </div>
    </section>
  );
}

export function MiniAppHome() {
  const [activeTab, setActiveTab] = useState<TabName>("TEXT");
  const [accessStatus, setAccessStatus] = useState<AccessStatus>("checking");
  const [accessMessage, setAccessMessage] = useState("Checking Telegram access...");
  const [requiredChannel, setRequiredChannel] = useState({
    title: PUBLIC_REQUIRED_CHANNEL_TITLE,
    url: PUBLIC_REQUIRED_CHANNEL_URL,
  });

  const validateAccess = async () => {
    setAccessStatus("checking");
    setAccessMessage("Checking Telegram access...");

    try {
      await loadTelegramWebAppSdk();
      const initData = getTelegramInitData();

      if (!initData) {
        setAccessStatus("telegram-required");
        setAccessMessage("Open ASCIILOGRAPH from Telegram to verify access.");
        return;
      }

      const response = await fetch("/api/telegram/validate", {
        body: JSON.stringify({ initData }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as TelegramValidateResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "Could not verify access." : payload.message);
      }

      setRequiredChannel({
        title: payload.subscription.channelTitle,
        url: payload.subscription.channelUrl,
      });

      if (payload.subscription.required && !payload.subscription.ok) {
        setAccessStatus("locked");
        setAccessMessage(
          `Subscribe to ${payload.subscription.channelTitle}, then press CHECK.`,
        );
        return;
      }

      setAccessStatus("granted");
      setAccessMessage("");
    } catch (error) {
      setAccessStatus("telegram-required");
      setAccessMessage(
        error instanceof Error
          ? error.message
          : "Could not verify Telegram access.",
      );
    }
  };

  useEffect(() => {
    let isMounted = true;

    void loadTelegramWebAppSdk()
      .catch(() => undefined)
      .then(() => {
        if (!isMounted) return;

        window.Telegram?.WebApp?.ready();
        window.Telegram?.WebApp?.expand();
        void validateAccess();
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeLabel = activeTab.toLowerCase();
  const hasAccess = accessStatus === "granted";

  return (
    <main className="relative min-h-dvh overflow-hidden bg-transparent text-ascii-white">
      <section className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="bg-black/30 p-3 backdrop-blur-[1px]">
          <div className="grid gap-3">
            <AsciilographMark />
            <div className="min-w-0 text-center">
              <GlitchBrand />
              <p className="mt-2 text-[0.54rem] uppercase text-ascii-white/62 min-[390px]:text-[0.62rem]">
                text / image / video ascii converter
              </p>
            </div>
          </div>
        </header>

        {hasAccess ? (
          <>
            <nav
              aria-label="ASCIILOGRAPH generator mode"
              className="mt-3 grid grid-cols-3 bg-black/72"
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
          </>
        ) : (
          <AccessPanel
            channelTitle={requiredChannel.title || PUBLIC_REQUIRED_CHANNEL_TITLE}
            channelUrl={requiredChannel.url || PUBLIC_REQUIRED_CHANNEL_URL}
            message={accessMessage}
            onRetry={() => void validateAccess()}
            status={accessStatus}
          />
        )}

        <footer className="mt-auto pt-4 text-center text-[0.62rem] uppercase tracking-[0.18em] text-ascii-white/38">
          ASCIILOGRAPH / MADE BY GESSWRLDWIDE
        </footer>
      </section>
    </main>
  );
}
