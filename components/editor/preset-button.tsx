import type { ButtonHTMLAttributes, ReactNode } from "react";

type PresetButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  children: ReactNode;
};

export function PresetButton({ active = false, children, className = "", ...props }: PresetButtonProps) {
  return (
    <button
      className={"min-h-11 border px-3 text-xs font-bold uppercase tracking-[0.12em] transition " + (
        active
          ? "border-ascii-green bg-ascii-green text-black"
          : "border-ascii-muted/70 bg-black/50 text-ascii-green hover:border-ascii-green"
      ) + " " + className}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
