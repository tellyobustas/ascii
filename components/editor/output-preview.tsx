type OutputPreviewProps = {
  label?: string;
};

export function OutputPreview({ label = "Preview" }: OutputPreviewProps) {
  return (
    <div className="flex aspect-square items-center justify-center bg-black/70 p-4 text-center text-xs uppercase tracking-[0.16em] text-ascii-white/45">
      {label}
    </div>
  );
}
