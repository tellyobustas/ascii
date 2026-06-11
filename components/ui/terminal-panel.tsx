import type { ReactNode } from "react";

type TerminalPanelProps = {
  children: ReactNode;
};

export function TerminalPanel({ children }: TerminalPanelProps) {
  return (
    <section className="terminal-scanlines border border-ascii-muted/60 bg-black/70 p-4 shadow-terminal">
      {children}
    </section>
  );
}
