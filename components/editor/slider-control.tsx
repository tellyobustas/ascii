type SliderControlProps = {
  label: string;
  max: number;
  min: number;
  value: number;
};

export function SliderControl({ label, max, min, value }: SliderControlProps) {
  return (
    <label className="block text-xs uppercase tracking-[0.14em] text-ascii-white/70">
      <span className="flex items-center justify-between">
        <span>{label}</span>
        <span className="text-ascii-green">{value}</span>
      </span>
      <input
        className="mt-3 w-full accent-ascii-green"
        max={max}
        min={min}
        readOnly
        type="range"
        value={value}
      />
    </label>
  );
}
