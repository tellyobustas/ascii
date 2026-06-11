type UploadCardProps = {
  label: string;
};

export function UploadCard({ label }: UploadCardProps) {
  return (
    <div className="flex min-h-40 items-center justify-center border border-dashed border-ascii-muted/80 bg-black/60 p-5 text-center text-sm text-ascii-white/65">
      {label}
    </div>
  );
}
