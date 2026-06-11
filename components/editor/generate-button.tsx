import type { ButtonHTMLAttributes, ReactNode } from "react";

type GenerateButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function GenerateButton({ children, className = "", ...props }: GenerateButtonProps) {
  return (
    <button
      className={"min-h-12 w-full border border-ascii-green bg-ascii-green px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-black shadow-[0_0_22px_rgba(0,255,102,0.22)] transition hover:bg-ascii-white disabled:cursor-not-allowed disabled:border-ascii-muted disabled:bg-ascii-muted/25 disabled:text-ascii-white/45 " + className}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
