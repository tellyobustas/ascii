import { ASCIIBackground } from "@/components/ascii-background/ascii-background";
import { StatusPill } from "@/components/editor/status-pill";
import { GenerateButton } from "@/components/editor/generate-button";

const tabs = ["TEXT", "IMAGE", "VIDEO"] as const;

export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-ascii-black text-ascii-white">
      <ASCIIBackground />
      <section className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-6">
        <header className="pt-6">
          <StatusPill label="setup ready" />
          <h1 className="mt-5 text-5xl font-black tracking-normal text-ascii-green drop-shadow-[0_0_18px_rgba(0,255,102,0.35)]">
            ASCII
          </h1>
          <p className="mt-2 text-sm uppercase tracking-[0.18em] text-ascii-white/70">
            text / image / video converter
          </p>
        </header>

        <div className="mt-8 grid grid-cols-3 gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              className="min-h-12 border border-ascii-muted/70 bg-black/50 px-3 text-sm font-bold text-ascii-green shadow-terminal transition hover:border-ascii-green hover:bg-ascii-green/10"
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>

        <section className="terminal-scanlines mt-6 rounded border border-ascii-muted/60 bg-black/70 p-4 shadow-terminal">
          <p className="text-xs uppercase tracking-[0.18em] text-ascii-green/80">
            project scaffold
          </p>
          <p className="mt-3 text-sm leading-6 text-ascii-white/78">
            Базовая структура готова. Следующий этап добавит Telegram bot и
            кнопку OPEN ASCII.
          </p>
          <div className="mt-5">
            <GenerateButton disabled>awaiting stage 2</GenerateButton>
          </div>
        </section>
      </section>
    </main>
  );
}
