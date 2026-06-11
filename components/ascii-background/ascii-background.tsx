const rainColumns = [
  "01╔║╚10",
  "#%+--=01",
  "░▒▓█▓▒░",
  "[]{}<>//",
  "ASCII001",
  "┌─┐│└─┘",
  "1100:011",
  "@@@###%%",
  "╬═╬║╬═╬",
  "++--==..",
];

const clouds = [
  "@ # % & * + = - . : / \\\\ | _ [ ] { } < > 0 1",
  "░ ▒ ▓ █ ║ ═ ╔ ╗ ╚ ╝ ┌ ┐ └ ┘",
  "0101 1100 ASCII MATRIX TERMINAL",
  "LOAD / CONVERT / EXPORT / SEND",
];

export function ASCIIBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-black"
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,102,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,102,0.035)_1px,transparent_1px)] bg-[size:22px_22px]" />

      <div className="ascii-rain absolute inset-x-0 top-[-18%] flex h-[135%] justify-between px-2 text-[0.58rem] leading-4 text-ascii-green/18 sm:text-xs">
        {rainColumns.map((column, index) => (
          <pre
            className="m-0 whitespace-pre-wrap break-all font-mono"
            key={column + index}
            style={{
              animationDelay: String(index * -1.7) + "s",
              animationDuration: String(22 + index * 2) + "s",
              width: "1.15rem",
            }}
          >
            {Array.from({ length: 11 }, () => column).join("\n")}
          </pre>
        ))}
      </div>

      {clouds.map((cloud, index) => (
        <div
          className="ascii-cloud absolute left-[-45%] w-[190%] whitespace-nowrap text-[0.7rem] leading-7 tracking-normal text-ascii-white/10"
          key={cloud}
          style={{
            animationDelay: String(index * -6) + "s",
            animationDuration: String(34 + index * 9) + "s",
            top: String(12 + index * 21) + "%",
          }}
        >
          {Array.from({ length: 9 }, (_, itemIndex) => (
            <span className="mx-3" key={itemIndex}>
              {cloud}
            </span>
          ))}
        </div>
      ))}

      <div className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(242,242,242,0.035)_0,rgba(242,242,242,0.035)_1px,transparent_1px,transparent_5px)]" />
      <div className="absolute inset-0 border-x border-ascii-green/10" />
    </div>
  );
}
