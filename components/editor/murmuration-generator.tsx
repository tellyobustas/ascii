"use client";

import { useEffect, useRef, useState } from "react";
import { GenerateButton } from "@/components/editor/generate-button";
import { PresetButton } from "@/components/editor/preset-button";
import { StatusPill } from "@/components/editor/status-pill";
import {
  MURMURATION_GLYPHS,
  MURMURATION_STYLES,
  type MurmurationStyleId,
} from "@/lib/ascii/murmuration";
import {
  getBotStartUrl,
  getTelegramInitData,
  getTelegramSendErrorCopy,
  openBotStartUrl,
  type TelegramSendResponse,
} from "@/lib/telegram/client-export";

type Point = { alpha: number; glyph: string; homeX: number; homeY: number; phase: number; size: number; vx: number; vy: number };
type RenderResponse =
  | { ok: true; durationSeconds: number; fileName: string; styleId: MurmurationStyleId; video: { base64: string; fileName: string; mimeType: "video/mp4" } }
  | { ok: false; message: string };

const styleEntries = Object.entries(MURMURATION_STYLES) as Array<
  [MurmurationStyleId, (typeof MURMURATION_STYLES)[MurmurationStyleId]]
>;

function random(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

async function pointsFromFile(file: File, maxSize: number) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(maxSize / bitmap.width, maxSize / bitmap.height, 1);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const source = document.createElement("canvas");
  source.width = width;
  source.height = height;
  const context = source.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas is unavailable.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const pixels = context.getImageData(0, 0, width, height).data;
  const points: Point[] = [];
  const step = Math.max(4, Math.round(Math.sqrt((width * height) / 520)));
  const seed = Date.now() % 10000;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const offset = (y * width + x) * 4;
      const luma = (pixels[offset] * 0.2126 + pixels[offset + 1] * 0.7152 + pixels[offset + 2] * 0.0722) / 255;
      const chance = 0.16 + luma * 0.84;
      const localSeed = seed + x * 0.17 + y * 17.1;
      if (random(localSeed) > chance) continue;
      points.push({
        alpha: 0.2 + luma * 0.72,
        glyph: MURMURATION_GLYPHS[Math.min(MURMURATION_GLYPHS.length - 1, Math.floor(luma * MURMURATION_GLYPHS.length))] ?? "+",
        homeX: x / width,
        homeY: y / height,
        phase: random(localSeed + 1) * Math.PI * 2,
        size: 7 + luma * 8 + random(localSeed + 2) * 3,
        vx: (random(localSeed + 3) - 0.5) * 2,
        vy: (random(localSeed + 4) - 0.5) * 2,
      });
    }
  }
  return points.slice(0, 600);
}

function MurmurationPreview({ file, style }: { file: File | null; style: MurmurationStyleId }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<Point[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!file) return;
    pointsFromFile(file, 320).then((nextPoints) => {
      if (!cancelled) setPoints(nextPoints);
    }).catch(() => {
      if (!cancelled) setPoints([]);
    });
    return () => { cancelled = true; };
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frame = 0;
    let animationFrame = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const draw = (time: number) => {
      const rect = canvas.getBoundingClientRect();
      const { width, height } = rect;
      context.fillStyle = "rgba(0,0,0,0.32)";
      context.fillRect(0, 0, width, height);
      const now = reducedMotion ? 0.4 : time / 1000;
      const intensity = MURMURATION_STYLES[style].intensity;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.shadowBlur = 8;
      context.shadowColor = MURMURATION_STYLES[style].color;
      for (let index = 0; index < points.length; index += 1) {
        const point = points[index];
        const wave = Math.sin(now * 2.1 + point.phase);
        const curl = Math.cos(now * 1.7 + point.phase * 1.8);
        const burst = style === "shatter" && Math.sin(now * 4) > 0.78 && index % 13 === 0 ? 24 : 0;
        const x = point.homeX * width + wave * (8 + intensity * 8) * point.vx + burst * point.vx;
        const y = point.homeY * height + curl * (8 + intensity * 8) * point.vy + burst * point.vy;
        context.font = `${point.size}px ui-monospace, monospace`;
        context.fillStyle = MURMURATION_STYLES[style].color;
        context.globalAlpha = Math.max(0.12, point.alpha * (0.72 + wave * 0.2));
        context.fillText(point.glyph, x, y);
      }
      context.globalAlpha = 1;
      context.shadowBlur = 0;
      frame += 1;
      if (!reducedMotion || frame < 2) animationFrame = requestAnimationFrame(draw);
    };
    animationFrame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animationFrame); observer.disconnect(); };
  }, [points, style]);

  return <canvas aria-label="Live murmuration portrait preview" className="aspect-square w-full bg-black" ref={canvasRef} />;
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
      <p className="text-xs leading-5 text-ascii-white/58">Your image becomes a living cloud of symbols. The portrait never disappears: it drifts, glitches, and reforms.</p>
      <div className="grid grid-cols-3 gap-2">
        {styleEntries.map(([id, preset]) => <PresetButton active={id === style} key={id} onClick={() => { setStyle(id); setResult(null); setStatus(file ? "style changed" : "load portrait"); }}>{preset.shortLabel}</PresetButton>)}
      </div>
      <label className="flex min-h-24 cursor-pointer items-center justify-center border border-dashed border-ascii-green/40 bg-black/70 px-5 text-center text-sm uppercase tracking-[0.12em] text-ascii-white/65 transition hover:border-ascii-green hover:text-ascii-green">
        <input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const next = event.target.files?.[0] ?? null; setFile(next); setResult(null); setError(""); setSendError(""); setSendHelpUrl(""); setSendStatus("send to telegram"); setStatus(next ? "portrait mapped" : "load portrait"); }} type="file" />
        {file ? "portrait mapped / tap to replace" : "drop / select portrait"}
      </label>
      <div className="overflow-hidden bg-black">
        <MurmurationPreview key={file ? `${file.name}-${file.lastModified}` : "empty"} file={file} style={style} />
      </div>
      {resultUrl ? <video autoPlay className="aspect-square w-full bg-black object-contain" controls loop muted playsInline src={resultUrl} /> : null}
      <div className="grid grid-cols-[1fr_auto] items-center gap-3"><StatusPill label={status} /><span className="text-[0.62rem] uppercase text-ascii-white/42">4 sec / silent mp4</span></div>
      {error ? <div className="border border-red-500/45 bg-black px-3 py-2 text-xs uppercase leading-5 tracking-[0.1em] text-red-300">{error}</div> : null}
      {sendError ? <div className="border border-red-500/45 bg-black px-3 py-2 text-xs uppercase leading-5 tracking-[0.1em] text-red-300">{sendError}{sendHelpUrl ? <button className="mt-2 block min-h-9 w-full border border-red-300/70 bg-black px-3 text-xs font-black uppercase tracking-[0.12em] text-red-200" onClick={() => openBotStartUrl(sendHelpUrl)} type="button">start bot</button> : null}</div> : null}
      <GenerateButton disabled={!file || status === "rendering 4 sec"} onClick={renderPortrait}>{status === "rendering 4 sec" ? "rendering murmuration" : "make murmuration"}</GenerateButton>
      <button className="min-h-10 w-full border border-ascii-green/45 bg-black px-3 text-xs font-black uppercase tracking-[0.1em] text-ascii-green disabled:cursor-not-allowed disabled:border-ascii-muted disabled:text-ascii-white/35" disabled={!resultUrl || sendStatus === "sending"} onClick={sendToTelegram} type="button">{sendStatus}</button>
    </div>
  );
}
