import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";

const requireFromRuntime = createRequire(path.join(process.cwd(), "runtime.cjs"));

export function resolveFfmpegPath(packagePath: string | null | undefined) {
  const candidates = new Set<string>();

  if (packagePath) candidates.add(packagePath);

  try {
    const packageEntry = requireFromRuntime.resolve("ffmpeg-static");
    candidates.add(path.join(path.dirname(packageEntry), "ffmpeg"));
    candidates.add(path.join(path.dirname(packageEntry), "ffmpeg.exe"));
  } catch {
    // The package entry can be externalized differently in serverless bundles.
  }

  candidates.add(path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg"));
  candidates.add(path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg.exe"));

  const resolved = [...candidates].find((candidate) => existsSync(candidate));

  if (!resolved) {
    throw new Error(
      `FFmpeg binary was not found at runtime. Checked: ${[...candidates].join(", ")}`,
    );
  }

  return resolved;
}
