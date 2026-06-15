type StatusPillProps = {
  label: string;
};

export function StatusPill({ label }: StatusPillProps) {
  return (
    <span className="inline-flex bg-black/45 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-ascii-green">
      {label}
    </span>
  );
}
