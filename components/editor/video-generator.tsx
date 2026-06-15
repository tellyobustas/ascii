"use client";

import { useEffect, useState } from "react";
import { GenerateButton } from "@/components/editor/generate-button";
import { PresetButton } from "@/components/editor/preset-button";
import { StatusPill } from "@/components/editor/status-pill";
import {
  VIDEO_ASCII_PRESETS,
  VIDEO_RENDER_LIMITS,
  type VideoAsciiPresetId,
} from "@/lib/ascii/video";
import {
  getBotStartUrl,
  getTelegramInitData,
  getTelegramSendErrorCopy,
  openBotStartUrl,
  type TelegramSendResponse,
} from "@/lib/telegram/client-export";

type VideoRenderResponse =
  | {
      ok: true;
      fileName: string;
      presetId: VideoAsciiPresetId;
      video: {
        base64: string;
        durationSeconds: number;
        estimatedFrames: number;
        fileName: string;
        mimeType: "video/mp4";
        renderedFrames: number;
        sourceDurationSeconds: number;
        wasTrimmed: boolean;
      };
    }
  | {
      ok: false;
      message: string;
    };

const videoPresetEntries = Object.entries(VIDEO_ASCII_PRESETS) as Array<
  [VideoAsciiPresetId, (typeof VIDEO_ASCII_PRESETS)[VideoAsciiPresetId]]
>;
const videoMaxMegabytes = VIDEO_RENDER_LIMITS.maxInputFileBytes / 1024 / 1024;

function formatMegabytes(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(2);
}

function getTelegramSendLabel(sendStatus: string) {
  if (sendStatus === "sending") return "sending";
  if (sendStatus === "done") return "done";
  if (sendStatus === "start bot") return "start bot";

  return "send to telegram";
}

export function VideoGenerator() {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [presetId, setPresetId] = useState<VideoAsciiPresetId>("matrixPulse");
  const [fps, setFps] = useState<(typeof VIDEO_RENDER_LIMITS.fpsOptions)[number]>(
    VIDEO_RENDER_LIMITS.defaultFps,
  );
  const [width, setWidth] = useState<
    (typeof VIDEO_RENDER_LIMITS.widthOptions)[number]
  >(VIDEO_RENDER_LIMITS.defaultWidth);
  const [result, setResult] = useState<VideoRenderResponse | null>(null);
  const [status, setStatus] = useState("idle");
  const [renderProgress, setRenderProgress] = useState(0);
  const [error, setError] = useState("");
  const [sendStatus, setSendStatus] = useState("send to telegram");
  const [sendError, setSendError] = useState("");
  const [sendHelpUrl, setSendHelpUrl] = useState("");

  useEffect(() => {
    if (!fileUrl) return;

    return () => URL.revokeObjectURL(fileUrl);
  }, [fileUrl]);

  const resultDataUrl =
    result?.ok === true
      ? `data:${result.video.mimeType};base64,${result.video.base64}`
      : "";
  const canGenerate = Boolean(file) && status !== "processing";
  const selectedFileMeta = file
    ? `video ready / ${formatMegabytes(file.size)} MB`
    : "drop / select MP4 MOV WEBM";
  const isRenderingVideo = status === "processing";
  const showRenderProgress = isRenderingVideo || renderProgress > 0;

  const renderVideo = async () => {
    if (!file) {
      setError("Upload a video first.");
      return;
    }

    setStatus("processing");
    setError("");
    setSendError("");
    setSendHelpUrl("");
    setSendStatus("send to telegram");
    setResult(null);
    setRenderProgress(4);

    const progressTimer = window.setInterval(() => {
      setRenderProgress((currentProgress) => {
        if (currentProgress >= 94) return currentProgress;

        const nextProgress =
          currentProgress + Math.max(1, Math.round((96 - currentProgress) * 0.045));

        return Math.min(94, nextProgress);
      });
    }, 420);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("presetId", presetId);
    formData.set("fps", String(fps));
    formData.set("width", String(width));

    try {
      const response = await fetch("/api/video/render", {
        body: formData,
        method: "POST",
      });
      const payload = (await response.json()) as VideoRenderResponse;

      if (!response.ok || !payload.ok) {
        const message = payload.ok ? "Video render failed." : payload.message;
        setResult(payload);
        setError(message);
        setStatus("error");
        setRenderProgress(0);
        return;
      }

      setResult(payload);
      setStatus("done");
      setSendStatus("send to telegram");
      setRenderProgress(100);
    } catch {
      setResult({
        ok: false,
        message: "Video render failed.",
      });
      setError("Video render failed.");
      setStatus("error");
      setRenderProgress(0);
    } finally {
      window.clearInterval(progressTimer);
    }
  };

  const sendVideoToTelegram = async () => {
    if (!result?.ok) return;

    const initData = getTelegramInitData();

    if (!initData) {
      setSendStatus("start bot");
      setSendHelpUrl(getBotStartUrl());
      setSendError(
        "Open ASCIILOGRAPH from Telegram and press SEND TO TELEGRAM again.",
      );
      return;
    }

    try {
      setSendStatus("sending");
      setSendError("");
      setSendHelpUrl("");

      const response = await fetch("/api/telegram/send-result", {
        body: JSON.stringify({
          caption: "ASCII video animation",
          fileName: result.video.fileName || result.fileName,
          initData,
          mimeType: result.video.mimeType,
          resultType: "videoMp4",
          videoBase64: result.video.base64,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as TelegramSendResponse;

      if (!response.ok || payload.ok === false) {
        const failedPayload: Extract<TelegramSendResponse, { ok: false }> =
          payload.ok === false
            ? payload
            : {
                message: "Could not send MP4.",
                ok: false,
              };

        setSendStatus(
          failedPayload.code === "BOT_CHAT_NOT_STARTED"
            ? "start bot"
            : "send to telegram",
        );
        setSendHelpUrl(
          failedPayload.code === "BOT_CHAT_NOT_STARTED"
            ? failedPayload.startUrl || getBotStartUrl()
            : "",
        );
        setSendError(
          getTelegramSendErrorCopy(failedPayload, "Could not send MP4."),
        );
        return;
      }

      setSendStatus("done");
    } catch (error) {
      setSendStatus("send to telegram");
      setSendHelpUrl("");
      setSendError(
        error instanceof Error ? error.message : "Could not send MP4.",
      );
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {videoPresetEntries.map(([id, preset]) => (
          <PresetButton
            active={id === presetId}
            key={id}
            onClick={() => {
              setPresetId(id);
              setFps(preset.fps);
              setWidth(preset.width);
              setResult(null);
              setError("");
              setSendError("");
              setSendHelpUrl("");
              setSendStatus("send to telegram");
              setRenderProgress(0);
              setStatus(file ? "style changed" : "idle");
            }}
          >
            {preset.shortLabel}
          </PresetButton>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-2 block text-[0.65rem] uppercase tracking-[0.16em] text-ascii-white/55">
            fps
          </span>
          <select
            className="min-h-11 w-full border border-ascii-green/35 bg-black px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-ascii-green focus:border-ascii-green focus:ring-0"
            onChange={(event) =>
              setFps(Number(event.target.value) as typeof fps)
            }
            value={fps}
          >
            {VIDEO_RENDER_LIMITS.fpsOptions.map((option) => (
              <option key={option} value={option}>
                {option} fps
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-[0.65rem] uppercase tracking-[0.16em] text-ascii-white/55">
            width
          </span>
          <select
            className="min-h-11 w-full border border-ascii-green/35 bg-black px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-ascii-green focus:border-ascii-green focus:ring-0"
            onChange={(event) =>
              setWidth(Number(event.target.value) as typeof width)
            }
            value={width}
          >
            {VIDEO_RENDER_LIMITS.widthOptions.map((option) => (
              <option key={option} value={option}>
                {option}px
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex min-h-36 cursor-pointer items-center justify-center border border-dashed border-ascii-green/40 bg-black/70 p-5 text-center text-sm uppercase tracking-[0.12em] text-ascii-white/65 transition hover:border-ascii-green hover:text-ascii-green">
        <input
          accept="video/mp4,video/quicktime,video/webm"
          className="sr-only"
          onChange={(event) => {
            const nextFile = event.target.files?.[0] ?? null;

            if (
              nextFile &&
              nextFile.size > VIDEO_RENDER_LIMITS.maxInputFileBytes
            ) {
              setFile(null);
              setFileUrl("");
              setResult(null);
              setSendError("");
              setSendHelpUrl("");
              setSendStatus("send to telegram");
              setRenderProgress(0);
              setStatus("too large");
              setError(`Video must be ${videoMaxMegabytes} MB or smaller.`);
              event.target.value = "";
              return;
            }

            setFile(nextFile);
            setFileUrl(nextFile ? URL.createObjectURL(nextFile) : "");
            setResult(null);
            setError("");
            setSendError("");
            setSendHelpUrl("");
            setSendStatus("send to telegram");
            setRenderProgress(0);
            setStatus(nextFile ? "video loaded" : "idle");
          }}
          type="file"
        />
        <span className="space-y-2">
          <span className="block text-ascii-green">{selectedFileMeta}</span>
          <span className="block text-[0.62rem] leading-5 tracking-[0.14em] text-ascii-white/45">
            mp4 mov webm / max {videoMaxMegabytes} mb / auto trim{" "}
            {VIDEO_RENDER_LIMITS.maxDurationSeconds} sec
          </span>
        </span>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-black/45 p-2">
          <div className="mb-2 text-[0.58rem] uppercase tracking-[0.14em] text-ascii-white/45">
            original
          </div>
          <div className="flex aspect-square items-center justify-center overflow-hidden bg-black">
            {fileUrl ? (
              <video
                className="h-full w-full object-contain"
                controls
                muted
                playsInline
                src={fileUrl}
              />
            ) : (
              <span className="text-[0.65rem] uppercase tracking-[0.14em] text-ascii-white/35">
                no video
              </span>
            )}
          </div>
        </div>

        <div className="bg-black/45 p-2">
          <div className="mb-2 text-[0.58rem] uppercase tracking-[0.14em] text-ascii-white/45">
            ascii mp4
          </div>
          <div className="flex aspect-square items-center justify-center overflow-hidden bg-black">
            {resultDataUrl ? (
              <video
                className="h-full w-full object-contain"
                controls
                loop
                muted
                playsInline
                src={resultDataUrl}
              />
            ) : (
              <span className="px-3 text-center text-[0.65rem] uppercase leading-5 tracking-[0.14em] text-ascii-white/35">
                generate animation
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <StatusPill label={status} />
        <span className="text-[0.65rem] uppercase tracking-[0.12em] text-ascii-white/45">
          first {VIDEO_RENDER_LIMITS.maxDurationSeconds} sec / output under{" "}
          {VIDEO_RENDER_LIMITS.maxOutputBytes / 1024 / 1024} mb
        </span>
      </div>

      {showRenderProgress ? (
        <div className="bg-black/45 px-3 py-3 text-[0.65rem] uppercase tracking-[0.12em] text-ascii-white/58">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span>{isRenderingVideo ? "rendering mp4" : "render ready"}</span>
            <span className="text-ascii-green">{renderProgress}%</span>
          </div>
          <div className="h-2 border border-ascii-green/30 bg-black">
            <div
              className="h-full bg-ascii-green shadow-[0_0_16px_rgba(0,255,102,0.35)] transition-[width] duration-300"
              style={{ width: `${renderProgress}%` }}
            />
          </div>
        </div>
      ) : null}

      {result?.ok ? (
        <div className="bg-black/45 px-3 py-2 text-[0.65rem] uppercase leading-5 tracking-[0.1em] text-ascii-white/55">
          {result.video.renderedFrames} frames /{" "}
          {result.video.durationSeconds.toFixed(2)} sec
          {result.video.wasTrimmed ? (
            <>
              {" "}
              / auto trimmed from{" "}
              {result.video.sourceDurationSeconds.toFixed(2)} sec
            </>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="border border-red-500/45 bg-black px-3 py-2 text-xs uppercase leading-5 tracking-[0.1em] text-red-300">
          {error}
        </div>
      ) : null}

      {sendError ? (
        <div className="border border-red-500/45 bg-black px-3 py-2 text-xs uppercase leading-5 tracking-[0.1em] text-red-300">
          {sendError}
          {sendHelpUrl ? (
            <button
              className="mt-2 block min-h-9 w-full border border-red-300/70 bg-black px-3 text-xs font-black uppercase tracking-[0.12em] text-red-200 transition hover:bg-red-300 hover:text-black"
              onClick={() => openBotStartUrl(sendHelpUrl)}
              type="button"
            >
              start bot
            </button>
          ) : null}
        </div>
      ) : null}

      <GenerateButton disabled={!canGenerate} onClick={renderVideo}>
        {status === "processing" ? "rendering video" : "generate video"}
      </GenerateButton>

      <button
        className="min-h-10 w-full border border-ascii-green/45 bg-black px-3 text-xs font-black uppercase tracking-[0.1em] text-ascii-green disabled:cursor-not-allowed disabled:border-ascii-muted disabled:text-ascii-white/35"
        disabled={!resultDataUrl || sendStatus === "sending"}
        onClick={sendVideoToTelegram}
        type="button"
      >
        {getTelegramSendLabel(sendStatus)}
      </button>

      {sendStatus === "done" ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            className="min-h-10 border border-ascii-green/35 bg-black px-3 text-xs font-black uppercase tracking-[0.1em] text-ascii-green transition hover:bg-ascii-green hover:text-black"
            onClick={() => {
              setResult(null);
              setSendStatus("send to telegram");
              setSendError("");
              setSendHelpUrl("");
              setRenderProgress(0);
              setStatus(file ? "style changed" : "idle");
            }}
            type="button"
          >
            try another style
          </button>
          <button
            className="min-h-10 border border-ascii-green/35 bg-black px-3 text-xs font-black uppercase tracking-[0.1em] text-ascii-green transition hover:bg-ascii-green hover:text-black"
            onClick={sendVideoToTelegram}
            type="button"
          >
            post again
          </button>
        </div>
      ) : null}
    </div>
  );
}
