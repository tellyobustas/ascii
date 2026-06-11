"use client";

import { useEffect, useRef, useState } from "react";
import {
  ASCII_FONTS,
  TEXT_CANVAS_PRESETS,
  type AsciiFontName,
  type TextCanvasPresetId,
} from "@/lib/ascii/text";
import type { FitAsciiTextResult } from "@/lib/canvas/fit";

type TextRenderResponse =
  | {
      ok: true;
      asciiText: string;
      canvas: {
        height: number;
        label: string;
        shortLabel: string;
        width: number;
      };
      canvasPreset: TextCanvasPresetId;
      fit: FitAsciiTextResult;
      font: AsciiFontName;
      text: string;
    }
  | {
      ok: false;
      message: string;
    };

const canvasPresetEntries = Object.entries(TEXT_CANVAS_PRESETS) as Array<
  [TextCanvasPresetId, (typeof TEXT_CANVAS_PRESETS)[TextCanvasPresetId]]
>;

export function TextGenerator() {
  const [text, setText] = useState("Type Something");
  const [font, setFont] = useState<AsciiFontName>("Graffiti");
  const [canvasPreset, setCanvasPreset] =
    useState<TextCanvasPresetId>("telegramPost");
  const [renderResult, setRenderResult] = useState<TextRenderResponse | null>(
    null,
  );
  const [status, setStatus] = useState("rendering");
  const [copyStatus, setCopyStatus] = useState("copy");
  const [previewWidth, setPreviewWidth] = useState(0);
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = previewRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setPreviewWidth(entry.contentRect.width);
    });

    resizeObserver.observe(element);
    setPreviewWidth(element.getBoundingClientRect().width);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/text/render", {
          body: JSON.stringify({
            canvasPreset,
            font,
            text,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
          signal: controller.signal,
        });
        const payload = (await response.json()) as TextRenderResponse;

        if (!response.ok || !payload.ok) {
          setRenderResult(payload);
          setStatus("error");
          return;
        }

        setRenderResult(payload);
        setStatus("live preview");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setRenderResult({
          ok: false,
          message: "Could not render ASCII text.",
        });
        setStatus("error");
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [canvasPreset, font, text]);

  const copyAsciiText = async () => {
    if (!renderResult?.ok) return;

    try {
      await navigator.clipboard.writeText(renderResult.asciiText);
      setCopyStatus("copied");
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = renderResult.asciiText;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.append(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
      setCopyStatus("copied");
    }

    window.setTimeout(() => setCopyStatus("copy"), 1400);
  };

  const activeCanvas =
    renderResult?.ok === true
      ? renderResult.canvas
      : TEXT_CANVAS_PRESETS[canvasPreset];
  const scale = previewWidth > 0 ? previewWidth / activeCanvas.width : 0;

  return (
    <div className="mt-4 space-y-3">
      <label className="block">
        <span className="mb-2 block text-[0.65rem] uppercase tracking-[0.16em] text-ascii-white/55">
          text input
        </span>
        <textarea
          className="min-h-24 w-full resize-none border border-ascii-green/35 bg-black px-3 py-3 text-sm text-ascii-green placeholder:text-ascii-green/35 focus:border-ascii-green focus:ring-0"
          maxLength={96}
          onChange={(event) => {
            setStatus("rendering");
            setText(event.target.value);
          }}
          spellCheck={false}
          value={text}
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-2 block text-[0.65rem] uppercase tracking-[0.16em] text-ascii-white/55">
            font select
          </span>
          <select
            className="min-h-11 w-full border border-ascii-green/35 bg-black px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-ascii-green focus:border-ascii-green focus:ring-0"
            onChange={(event) => {
              setStatus("rendering");
              setFont(event.target.value as AsciiFontName);
            }}
            value={font}
          >
            {ASCII_FONTS.map((fontName) => (
              <option key={fontName} value={fontName}>
                {fontName}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-[0.65rem] uppercase tracking-[0.16em] text-ascii-white/55">
            canvas ratio
          </span>
          <select
            className="min-h-11 w-full border border-ascii-green/35 bg-black px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-ascii-green focus:border-ascii-green focus:ring-0"
            onChange={(event) => {
              setStatus("rendering");
              setCanvasPreset(event.target.value as TextCanvasPresetId);
            }}
            value={canvasPreset}
          >
            {canvasPresetEntries.map(([id, preset]) => (
              <option key={id} value={id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        className="relative overflow-hidden border border-ascii-green/40 bg-black shadow-[inset_0_0_0_1px_rgba(0,255,102,0.08)]"
        ref={previewRef}
        style={{
          aspectRatio: activeCanvas.width + " / " + activeCanvas.height,
        }}
      >
        <div className="absolute inset-[7%] border border-dashed border-ascii-green/25" />
        <div className="absolute left-2 top-2 border border-ascii-green/25 bg-black/80 px-2 py-1 text-[0.58rem] uppercase tracking-[0.14em] text-ascii-white/45">
          {activeCanvas.shortLabel} safe area
        </div>

        {renderResult?.ok ? (
          <pre
            className="absolute m-0 whitespace-pre font-mono text-ascii-green [text-shadow:0_0_8px_rgba(0,255,102,0.22)]"
            style={{
              fontSize: renderResult.fit.fontSize * scale,
              left: renderResult.fit.x * scale,
              lineHeight: renderResult.fit.lineHeight * scale + "px",
              textAlign: renderResult.fit.align,
              top: renderResult.fit.y * scale,
            }}
          >
            {renderResult.fit.fittedLines.join("\n")}
          </pre>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs uppercase tracking-[0.14em] text-ascii-white/45">
            {renderResult?.message ?? "rendering ascii"}
          </div>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto] items-center gap-2">
        <div className="border border-ascii-green/25 bg-black px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-ascii-green/70">
          {status}
        </div>
        <button
          className="min-h-10 border border-ascii-green bg-black px-4 text-xs font-black uppercase tracking-[0.12em] text-ascii-green transition hover:bg-ascii-green hover:text-black disabled:cursor-not-allowed disabled:border-ascii-muted disabled:text-ascii-white/35"
          disabled={!renderResult?.ok}
          onClick={copyAsciiText}
          type="button"
        >
          {copyStatus}
        </button>
      </div>
    </div>
  );
}
