const cloudLines = [
  "@ # % & * + = - . : / \\\\ | _ [ ] { } < > 0 1",
  "░ ▒ ▓ █ ║ ═ ╔ ╗ ╚ ╝ ┌ ┐ └ ┘",
  "0101 1100 ASCII MATRIX TERMINAL",
];

export function ASCIIBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,255,102,0.12),transparent_38%),linear-gradient(180deg,#020403_0%,#000_100%)]" />
      {cloudLines.map((line, index) => (
        <div
          className="absolute left-1/2 w-[42rem] -translate-x-1/2 whitespace-pre-wrap text-center text-xs leading-7 text-ascii-green/15 blur-[0.2px]"
          key={line}
          style={{
            top: String(16 + index * 24) + "%",
            transform: "translateX(-50%) rotate(" + (index % 2 === 0 ? -4 : 5) + "deg)",
          }}
        >
          {Array.from({ length: 8 }, (_, itemIndex) => (
            <span key={itemIndex}>{line} </span>
          ))}
        </div>
      ))}
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(0,255,102,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,102,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />
    </div>
  );
}
