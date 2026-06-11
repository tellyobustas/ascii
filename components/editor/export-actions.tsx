type ExportActionsProps = {
  disabled?: boolean;
};

export function ExportActions({ disabled = false }: ExportActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button className="border border-ascii-muted px-3 py-3 text-xs text-ascii-green disabled:opacity-40" disabled={disabled} type="button">
        Download
      </button>
      <button className="border border-ascii-muted px-3 py-3 text-xs text-ascii-green disabled:opacity-40" disabled={disabled} type="button">
        Send
      </button>
    </div>
  );
}
