"use client";

import { useEffect, useRef, useState } from "react";
import { GenerateButton } from "@/components/editor/generate-button";
import { PresetButton } from "@/components/editor/preset-button";
import { StatusPill } from "@/components/editor/status-pill";
import {
  buildMurmurationCells,
  getMurmurationGridSize,
  getMurmurationMotion,
  MURMURATION_LIMITS,
  MURMURATION_STYLES,
  type MurmurationCell,
  type MurmurationGridSize,
  type MurmurationStyleId,
} from "@/lib/ascii/murmuration";
import {
  getBotStartUrl,
  getTelegramInitData,
  getTelegramSendErrorCopy,
  openBotStartUrl,
  type TelegramSendResponse,
} from "@/lib/telegram/client-export";

type PreviewMap = { cells: MurmurationCell[]; size: MurmurationGridSize };
type RenderResponse =
  | { ok: true; durationSeconds: number; fileName: string; styleId: MurmurationStyleId; video: { base64: string; fileName: string; mimeType: "video/mp4" } }
  | { ok: false; message: string };

const styleEntries = Object.entries(MURMURATION_STYLES) as Array<
  [MurmurationStyleId, (typeof MURMURATION_STYLES)[MurmurationStyleId]]
>;

async function mapPortrait(file: File): Promise<PreviewMap> {
  const bitmap = await createImageBitmap(file);
  const size = getMurmurationGridSize(bitmap.width, bitmap.height);
  const source = document.createElement("canvas");
  source.width = size.columns;
  source.height = size.rows;
  const context = source.getContext("2d", { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    throw new Error("Canvas is unavailable.");
  }
  context.drawImage(bitmap, 0, 0, size.columns, size.rows);
  bitmap.close();
  const rgba = context.getImageData(0, 0, size.columns, size.rows).data;
  const gray = new Uint8Array(size.columns * size.rows);
  for (let index = 0; index < gray.length; index += 1) {
    const offset = index * 4;
    gray[index] = Math.round(
      rgba[offset] * 0.2126 + rgba[offset + 1] * 0.7152 + rgba[offset + 2] * 0.0722,
    );
  }
  return { cells: buildMurmurationCells(gray, size.columns, size.rows), size };
}

function MurmurationPreview({ file, style }: { file: File | null; style: MurmurationStyleId }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [map, setMap] = useState<PreviewMap | null>(null);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!file) return;
    mapPortrait(file).then((nextMap) => {
      if (!cancelled) {
        setMapError("");
        setMap(nextMap);
      }
    }).catch(() => {
      if (!cancelled) setMapError("Could not map this portrait.");
    });
    return () => { cancelled = true; };
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let animationFrame = 0;
    let previousFrame = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const ratio = map ? map.size.width / map.size.height : 0.8;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round((rect.width / ratio) * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      canvas.style.height = `${rect.width / ratio}px`;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const draw = (time: number) => {
      if (!reducedMotion && time - previousFrame < 32) {
        animationFrame = requestAnimationFrame(draw);
        return;
      }
      previousFrame = time;
      const rect = canvas.getBoundingClientRect();
      const { width, height } = rect;
      context.fillStyle = "#000000";
      context.fillRect(0, 0, width, height);
      const progress = reducedMotion ? 0.12 : (time % 4000) / 4000;
      const scaleX = width / (map?.size.width ?? width);
      const scaleY = height / (map?.size.height ?? height);
      context.textAlign = "center";
      context.textBaseline = "alphabetic";
      context.font = `${(map?.size.fontSize ?? 16) * scaleY}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.shadowBlur = 2.5 * scaleY;
      context.shadowColor = MURMURATION_STYLES[style].color;
      if (map) {
        for (const cell of map.cells) {
          const motion = getMurmurationMotion(cell, progress, style);
          const x = map.size.paddingX + (cell.column + 0.5 + motion.dx) * map.size.cellWidth;
          const y = map.size.paddingY + (cell.row + 0.82 + motion.dy) * map.size.cellHeight;
          context.globalAlpha = Math.min(0.98, 0.28 + motion.opacity * 0.68);
          context.fillStyle = MURMURATION_STYLES[style].color;
          context.fillText(motion.glyph, x * scaleX, y * scaleY);
        }
      } else {
        context.font = `${12 * scaleY}px ui-monospace, monospace`;
        context.globalAlpha = 0.32;
        context.fillStyle = MURMURATION_STYLES[style].color;
        context.fillText(file ? "MAPPING PORTRAIT" : "SELECT PORTRAIT", width / 2, height / 2);
      }
      context.globalAlpha = 1;
      context.shadowBlur = 0;
      context.fillStyle = "rgba(255,255,255,0.035)";
      for (let y = 0; y < height; y += 7) context.fillRect(0, y, width, 1);
      if (!reducedMotion) animationFrame = requestAnimationFrame(draw);
    };
    animationFrame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animationFrame); observer.disconnect(); };
  }, [file, map, style]);

  return (
    <div className="bg-black">
      <canvas
        aria-label="Live murmuration portrait preview"
        className="block w-full bg-black"
        ref={canvasRef}
      />
      {mapError ? <p className="px-3 py-2 text-xs uppercase text-red-300">{mapError}</p> : null}
    </div>
  );
}

export function MurmurationGenerator() {
  const [file, setFile] = useState<File | null>(null);
  const [style, setStyle] = useState<MurmurationStyleId>("signal");
  const [result, setResult] = useState<RenderResponse | null>(null);
  const [status, setStatus] = useState("load portrait");
  const [error, setError] = useState("");
  const [sendStatus, setSendStatus] = useState("send to telegram");
  const [sendError, setSendError] = useState("");
  const [sendHelpUrl, setSendHelpUrl] = useState("");

  const resultUrl = result?.ok ? `data:${result.video.mimeType};base64,${result.video.base64}` : "";
  const maxFileMegabytes = MURMURATION_LIMITS.maxFileBytes / 1024 / 1024;
  const renderPortrait = async () => {
    if (!file) return;
    setStatus("rendering 4 sec");
    setError("");
    setResult(null);
    setSendStatus("send to telegram");
    const formData = new FormData();
    formData.set("file", file);
    formData.set("style", style);
    try {
      const response = await fetch("/api/murmuration/render", { method: "POST", body: formData });
      const payload = await response.json() as RenderResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.ok ? "Render failed." : payload.message);
      setResult(payload);
      setStatus("mp4 ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Murmuration render failed.");
      setStatus("error");
    }
  };

  const sendToTelegram = async () => {
    if (!result?.ok) return;
    const initData = getTelegramInitData();
    if (!initData) {
      setSendStatus("start bot");
      setSendHelpUrl(getBotStartUrl());
      setSendError("Open ASCIILOGRAPH from Telegram and try again.");
      return;
    }
    try {
      setSendStatus("sending");
      setSendError("");
      const response = await fetch("/api/telegram/send-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: "ASCIILOGRAPH / murmuration portrait",
          fileName: result.video.fileName,
          initData,
          mimeType: result.video.mimeType,
          resultType: "videoMp4",
          videoBase64: result.video.base64,
        }),
      });
      const payload = await response.json() as TelegramSendResponse;
      if (!response.ok || !payload.ok) {
        const failed = payload.ok ? { ok: false as const, message: "Could not send portrait." } : payload;
        setSendStatus(failed.code === "BOT_CHAT_NOT_STARTED" ? "start bot" : "send to telegram");
        setSendHelpUrl(failed.code === "BOT_CHAT_NOT_STARTED" ? failed.startUrl || getBotStartUrl() : "");
        setSendError(getTelegramSendErrorCopy(failed, "Could not send portrait."));
        return;
      }
      setSendStatus("done");
    } catch {
      setSendStatus("send to telegram");
      setSendError("Could not send portrait.");
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs leading-5 text-ascii-white/58">A readable ASCII portrait moves as one flock. The shape stays recognizable while the signal flows through it.</p>
      <div className="grid grid-cols-3 gap-2">
        {styleEntries.map(([id, preset]) => <PresetButton active={id === style} key={id} onClick={() => { setStyle(id); setResult(null); setStatus(file ? "style changed" : "load portrait"); }}>{preset.shortLabel}</PresetButton>)}
      </div>
      <label className="flex min-h-24 cursor-pointer items-center justify-center border border-dashed border-ascii-green/40 bg-black/70 px-5 text-center text-sm uppercase tracking-[0.12em] text-ascii-white/65 transition hover:border-ascii-green hover:text-ascii-green">
        <input
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            const next = event.target.files?.[0] ?? null;
            if (next && next.size > MURMURATION_LIMITS.maxFileBytes) {
              setFile(null);
              setResult(null);
              setStatus("file too large");
              setError(`Portrait must be ${maxFileMegabytes} MB or smaller.`);
              event.target.value = "";
              return;
            }
            setFile(next);
            setResult(null);
            setError("");
            setSendError("");
            setSendHelpUrl("");
            setSendStatus("send to telegram");
            setStatus(next ? "portrait mapped" : "load portrait");
          }}
          type="file"
        />
        <span className="space-y-2">
          <span className="block">{file ? "portrait mapped / tap to replace" : "drop / select portrait"}</span>
          <span className="block text-[0.62rem] text-ascii-white/42">JPG PNG WEBP / MAX {maxFileMegabytes} MB</span>
        </span>
      </label>
      <div className="overflow-hidden bg-black">
        <MurmurationPreview key={file ? `${file.name}-${file.lastModified}` : "empty"} file={file} style={style} />
      </div>
      {resultUrl ? <video autoPlay className="w-full bg-black object-contain" controls loop muted playsInline src={resultUrl} /> : null}
      <div className="grid grid-cols-[1fr_auto] items-center gap-3"><StatusPill label={status} /><span className="text-[0.62rem] uppercase text-ascii-white/42">4 sec / silent mp4</span></div>
      {error ? <div className="border border-red-500/45 bg-black px-3 py-2 text-xs uppercase leading-5 tracking-[0.1em] text-red-300">{error}</div> : null}
      {sendError ? <div className="border border-red-500/45 bg-black px-3 py-2 text-xs uppercase leading-5 tracking-[0.1em] text-red-300">{sendError}{sendHelpUrl ? <button className="mt-2 block min-h-9 w-full border border-red-300/70 bg-black px-3 text-xs font-black uppercase tracking-[0.12em] text-red-200" onClick={() => openBotStartUrl(sendHelpUrl)} type="button">start bot</button> : null}</div> : null}
      <GenerateButton disabled={!file || status === "rendering 4 sec"} onClick={renderPortrait}>{status === "rendering 4 sec" ? "rendering murmuration" : "make murmuration"}</GenerateButton>
      <button className="min-h-10 w-full border border-ascii-green/45 bg-black px-3 text-xs font-black uppercase tracking-[0.1em] text-ascii-green disabled:cursor-not-allowed disabled:border-ascii-muted disabled:text-ascii-white/35" disabled={!resultUrl || sendStatus === "sending"} onClick={sendToTelegram} type="button">{sendStatus}</button>
    </div>
  );
}
