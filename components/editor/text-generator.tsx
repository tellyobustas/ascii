"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ASCII_FONT_PROFILES,
  ASCII_FONTS,
  TEXT_CANVAS_PRESETS,
  TEXT_FONT_GROUPS,
  TEXT_VIDEO_COLORS,
  type AsciiFontName,
  type TextCanvasPresetId,
  type TextVideoColorId,
} from "@/lib/ascii/text";
import type { FitAsciiTextResult } from "@/lib/canvas/fit";
import {
  getBotStartUrl,
  getTelegramInitData,
  getTelegramSendErrorCopy,
  openBotStartUrl,
  type TelegramSendResponse,
} from "@/lib/telegram/client-export";
import { encodeInlineTextQuery } from "@/lib/telegram/inline-text";

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

type TextVideoResponse =
  | {
      ok: true;
      color: TextVideoColorId;
      durationSeconds: number;
      fileName: string;
      video: {
        base64: string;
        fileName: string;
        mimeType: "video/mp4";
      };
    }
  | {
      ok: false;
      message: string;
    };

type PreparedTextPostResponse =
  | {
      expiresAt: number;
      id: string;
      ok: true;
    }
  | {
      message: string;
      ok: false;
    };

const canvasPresetEntries = Object.entries(TEXT_CANVAS_PRESETS) as Array<
  [TextCanvasPresetId, (typeof TEXT_CANVAS_PRESETS)[TextCanvasPresetId]]
>;
const textVideoColorEntries = Object.entries(TEXT_VIDEO_COLORS) as Array<
  [TextVideoColorId, (typeof TEXT_VIDEO_COLORS)[TextVideoColorId]]
>;

function getTelegramSendLabel(sendStatus: string) {
  if (sendStatus === "sending") return "sending";
  if (sendStatus === "done") return "sent";
  if (sendStatus === "start bot") return "start bot";

  return "send to telegram";
}

export function TextGenerator() {
  const [text, setText] = useState("Send Nudes");
  const [font, setFont] = useState<AsciiFontName>("Graffiti");
  const [fontQuery, setFontQuery] = useState("");
  const [canvasPreset, setCanvasPreset] =
    useState<TextCanvasPresetId>("telegramPost");
  const [videoColor, setVideoColor] = useState<TextVideoColorId>("green");
  const [renderResult, setRenderResult] = useState<TextRenderResponse | null>(
    null,
  );
  const [videoResult, setVideoResult] = useState<TextVideoResponse | null>(null);
  const [status, setStatus] = useState("rendering");
  const [videoStatus, setVideoStatus] = useState("ready for mp4");
  const [sendStatus, setSendStatus] = useState("send to telegram");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendHelpUrl, setSendHelpUrl] = useState("");
  const [textPostStatus, setTextPostStatus] = useState("publish text");
  const [copyTextStatus, setCopyTextStatus] = useState("copy tg code");
  const [textPostError, setTextPostError] = useState("");
  const [videoProgress, setVideoProgress] = useState(0);
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

  const filteredFonts = useMemo(() => {
    const query = fontQuery.trim().toLowerCase();

    if (!query) return ASCII_FONTS;

    return ASCII_FONTS.filter((fontName) => {
      const profile = ASCII_FONT_PROFILES[fontName];
      const searchBlob = [
        fontName,
        profile.mood,
        profile.sample,
        ...profile.searchTags,
      ]
        .join(" ")
        .toLowerCase();

      return searchBlob.includes(query);
    });
  }, [fontQuery]);

  const resetTextVideo = () => {
    setVideoResult(null);
    setVideoStatus("ready for mp4");
    setSendStatus("send to telegram");
    setSendError(null);
    setSendHelpUrl("");
    setTextPostStatus("publish text");
    setCopyTextStatus("copy tg code");
    setTextPostError("");
    setVideoProgress(0);
  };

  const copyTelegramCodeBlock = async () => {
    if (!renderResult?.ok) return;

    try {
      await navigator.clipboard.writeText(
        "```\n" + renderResult.fit.fittedLines.join("\n") + "\n```",
      );
      setCopyTextStatus("copied");
      setTextPostError("");
    } catch {
      setCopyTextStatus("copy failed");
    }

    window.setTimeout(() => setCopyTextStatus("copy tg code"), 1400);
  };

  const openInlineFallback = () => {
    const switchInlineQuery = window.Telegram?.WebApp?.switchInlineQuery;

    if (!switchInlineQuery) {
      throw new Error("Inline publish is not supported in this Telegram client.");
    }

    switchInlineQuery(
      encodeInlineTextQuery({
        canvasPreset,
        font,
        text: renderResult?.ok ? renderResult.text : text,
      }),
      ["users", "groups", "channels"],
    );
  };

  const publishTextInline = async () => {
    if (!renderResult?.ok) return;

    const webApp = window.Telegram?.WebApp;
    const initData = getTelegramInitData();

    if (!webApp) {
      setTextPostStatus("open in tg");
      setTextPostError("Open ASCIILOGRAPH inside Telegram and try PUBLISH TEXT again.");
      return;
    }

    try {
      setTextPostStatus("preparing");
      setTextPostError("");

      if (webApp.shareMessage && initData) {
        const response = await fetch("/api/telegram/prepare-text-post", {
          body: JSON.stringify({
            font,
            initData,
            text: renderResult.text,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        const payload = (await response.json()) as PreparedTextPostResponse;

        if (!response.ok || !payload.ok) {
          throw new Error(payload.ok ? "Could not prepare text post." : payload.message);
        }

        setTextPostStatus("share dialog");
        webApp.shareMessage(payload.id, (isSent) => {
          setTextPostStatus(isSent ? "done" : "publish text");
        });
        window.setTimeout(() => {
          setTextPostStatus((currentStatus) =>
            currentStatus === "share dialog" ? "publish text" : currentStatus,
          );
        }, 5000);
        return;
      }

      setTextPostStatus("opening inline");
      openInlineFallback();
      window.setTimeout(() => setTextPostStatus("publish text"), 1800);
    } catch (error) {
      try {
        setTextPostStatus("opening inline");
        openInlineFallback();
        window.setTimeout(() => setTextPostStatus("publish text"), 1800);
      } catch {
        setTextPostStatus("publish text");
        setTextPostError(
          error instanceof Error
            ? error.message
            : "Could not open Telegram publishing.",
        );
      }
    }
  };

  const generateTextVideo = async () => {
    if (!renderResult?.ok) return;

    let progressTimer: number | undefined;

    try {
      setVideoStatus("rendering mp4");
      setVideoResult(null);
      setSendStatus("send to telegram");
      setSendError(null);
      setSendHelpUrl("");
      setVideoProgress(4);

      progressTimer = window.setInterval(() => {
        setVideoProgress((currentProgress) => {
          if (currentProgress >= 94) return currentProgress;

          const nextProgress =
            currentProgress + Math.max(1, Math.round((96 - currentProgress) * 0.08));

          return Math.min(94, nextProgress);
        });
      }, 260);

      const response = await fetch("/api/text/video", {
        body: JSON.stringify({
          canvasPreset,
          color: videoColor,
          font,
          text,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as TextVideoResponse;

      if (!response.ok || !payload.ok) {
        setVideoResult(payload);
        setVideoStatus("video error");
        setVideoProgress(0);
        return;
      }

      setVideoResult(payload);
      setVideoStatus("mp4 ready");
      setVideoProgress(100);
    } catch (error) {
      setVideoResult({
        ok: false,
        message:
          error instanceof Error ? error.message : "Could not render MP4.",
      });
      setVideoStatus("video error");
      setVideoProgress(0);
    } finally {
      if (progressTimer) {
        window.clearInterval(progressTimer);
      }
    }
  };

  const sendTextVideoToTelegram = async () => {
    if (!videoResult?.ok) return;

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
      setSendError(null);
      setSendHelpUrl("");

      const response = await fetch("/api/telegram/send-result", {
        body: JSON.stringify({
          caption: "ASCII text animation",
          fileName: videoResult.video.fileName,
          initData,
          mimeType: videoResult.video.mimeType,
          resultType: "textVideo",
          videoBase64: videoResult.video.base64,
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
                message: "Could not send MP4 to Telegram.",
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
          getTelegramSendErrorCopy(
            failedPayload,
            "Could not send MP4 to Telegram.",
          ),
        );
        return;
      }

      setSendStatus("done");
    } catch (error) {
      setSendStatus("send to telegram");
      setSendHelpUrl("");
      setSendError(
        error instanceof Error
          ? error.message
          : "Could not send MP4 to Telegram.",
      );
    }
  };

  const activeCanvas =
    renderResult?.ok === true
      ? renderResult.canvas
      : TEXT_CANVAS_PRESETS[canvasPreset];
  const activeFontProfile = ASCII_FONT_PROFILES[font];
  const visibleFonts =
    filteredFonts.length > 0
      ? Array.from(new Set<AsciiFontName>([font, ...filteredFonts]))
      : ASCII_FONTS;
  const fontCountLabel =
    fontQuery.trim() && filteredFonts.length === 0
      ? "0 hits"
      : String(filteredFonts.length || ASCII_FONTS.length) + " faces";
  const scale = previewWidth > 0 ? previewWidth / activeCanvas.width : 0;
  const activeVideoColor = TEXT_VIDEO_COLORS[videoColor];
  const isVideoRendering = videoStatus === "rendering mp4";
  const isSending = sendStatus === "sending";

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
            resetTextVideo();
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
              resetTextVideo();
              setFont(event.target.value as AsciiFontName);
            }}
            value={font}
          >
            {visibleFonts.map((fontName) => (
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
              resetTextVideo();
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

      <div className="grid gap-2">
        <label className="block">
          <span className="mb-2 block text-[0.65rem] uppercase tracking-[0.16em] text-ascii-white/55">
            font grep
          </span>
          <input
            className="min-h-10 w-full border border-ascii-green/25 bg-black px-3 text-xs uppercase tracking-[0.1em] text-ascii-white placeholder:text-ascii-green/28 focus:border-ascii-green focus:ring-0"
            onChange={(event) => setFontQuery(event.target.value)}
            placeholder="poster / terminal / graffiti"
            spellCheck={false}
            value={fontQuery}
          />
        </label>

        <div className="flex flex-wrap gap-1.5">
          {TEXT_FONT_GROUPS.map((group) => (
            <button
              className="border border-ascii-green/25 bg-black px-2 py-1 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-ascii-green/70 transition hover:border-ascii-green hover:text-ascii-green"
              key={group.label}
              onClick={() => {
                setStatus("rendering");
                resetTextVideo();
                setFont(group.fonts[0]);
              }}
              type="button"
            >
              {group.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {visibleFonts.slice(0, 6).map((fontName) => {
            const profile = ASCII_FONT_PROFILES[fontName];
            const isActive = fontName === font;

            return (
              <button
                className={
                  "min-h-14 border px-2 py-2 text-left transition " +
                  (isActive
                    ? "border-ascii-green bg-ascii-green text-black"
                    : "border-ascii-green/25 bg-black text-ascii-green hover:border-ascii-green")
                }
                key={fontName}
                onClick={() => {
                  setStatus("rendering");
                  resetTextVideo();
                  setFont(fontName);
                }}
                type="button"
              >
                <span className="block truncate text-[0.68rem] font-black uppercase tracking-[0.1em]">
                  {fontName}
                </span>
                <span
                  className={
                    "mt-1 block truncate text-[0.62rem] " +
                    (isActive ? "text-black/70" : "text-ascii-white/45")
                  }
                >
                  {profile.sample}
                </span>
              </button>
            );
          })}
        </div>

        <div className="border border-ascii-green/25 bg-black px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-ascii-green">
              {font}
            </span>
            <span className="text-[0.58rem] uppercase tracking-[0.12em] text-ascii-white/45">
              {fontCountLabel}
            </span>
          </div>
          <p className="mt-1 text-[0.68rem] leading-4 text-ascii-white/55">
            {activeFontProfile.mood}
          </p>
        </div>
      </div>

      <div className="border border-ascii-green/25 bg-black p-3">
        <div className="mb-2 text-[0.65rem] uppercase tracking-[0.16em] text-ascii-white/55">
          text video color
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {textVideoColorEntries.map(([colorId, color]) => {
            const isActive = colorId === videoColor;

            return (
              <button
                className={
                  "min-h-10 border px-1 text-[0.55rem] font-black uppercase tracking-[0.08em] transition " +
                  (isActive
                    ? "border-ascii-white text-black"
                    : "border-ascii-green/25 bg-black text-ascii-white/65 hover:border-ascii-green")
                }
                key={colorId}
                onClick={() => {
                  resetTextVideo();
                  setVideoColor(colorId);
                }}
                style={{
                  backgroundColor: isActive ? color.hex : undefined,
                }}
                type="button"
              >
                {color.label}
              </button>
            );
          })}
        </div>
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
              color: activeVideoColor.hex,
              fontSize: renderResult.fit.fontSize * scale,
              left: renderResult.fit.x * scale,
              lineHeight: renderResult.fit.lineHeight * scale + "px",
              textShadow: `0 0 8px ${activeVideoColor.glow}`,
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

      {videoResult?.ok ? (
        <video
          className="w-full border border-ascii-green/30 bg-black"
          controls
          loop
          muted
          playsInline
          src={`data:${videoResult.video.mimeType};base64,${videoResult.video.base64}`}
        />
      ) : null}

      {videoResult && !videoResult.ok ? (
        <div className="border border-red-500/45 bg-black px-3 py-2 text-xs uppercase leading-5 tracking-[0.1em] text-red-300">
          {videoResult.message}
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

      {textPostError ? (
        <div className="border border-red-500/45 bg-black px-3 py-2 text-xs uppercase leading-5 tracking-[0.1em] text-red-300">
          {textPostError}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          className="min-h-10 border border-ascii-green/45 bg-black px-3 text-xs font-black uppercase tracking-[0.1em] text-ascii-green transition hover:bg-ascii-green hover:text-black disabled:cursor-not-allowed disabled:border-ascii-muted disabled:text-ascii-white/35"
          disabled={!renderResult?.ok}
          onClick={copyTelegramCodeBlock}
          type="button"
        >
          {copyTextStatus}
        </button>
        <button
          className="min-h-10 border border-ascii-green/45 bg-black px-3 text-xs font-black uppercase tracking-[0.1em] text-ascii-green transition hover:bg-ascii-green hover:text-black disabled:cursor-not-allowed disabled:border-ascii-muted disabled:text-ascii-white/35"
          disabled={!renderResult?.ok}
          onClick={publishTextInline}
          type="button"
        >
          {textPostStatus}
        </button>
      </div>

      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
        <div className="border border-ascii-green/25 bg-black px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-ascii-green/70">
          {isVideoRendering
            ? videoStatus + " " + videoProgress + "%"
            : status + " / " + videoStatus + " / " + sendStatus}
        </div>
        <button
          className="relative min-h-10 overflow-hidden border border-ascii-green bg-black px-4 text-xs font-black uppercase tracking-[0.12em] text-ascii-green transition hover:bg-ascii-green hover:text-black disabled:cursor-not-allowed disabled:border-ascii-muted disabled:text-ascii-white/35"
          disabled={!renderResult?.ok || isVideoRendering}
          onClick={generateTextVideo}
          type="button"
        >
          {isVideoRendering ? (
            <span
              className="absolute inset-y-0 left-0 bg-ascii-green/20"
              style={{ width: videoProgress + "%" }}
            />
          ) : null}
          <span className="relative z-10">
            {isVideoRendering ? videoProgress + "%" : "make video"}
          </span>
        </button>
        <button
          className="min-h-10 border border-ascii-green bg-black px-4 text-xs font-black uppercase tracking-[0.12em] text-ascii-green transition hover:bg-ascii-green hover:text-black disabled:cursor-not-allowed disabled:border-ascii-muted disabled:text-ascii-white/35"
          disabled={!videoResult?.ok || isSending}
          onClick={sendTextVideoToTelegram}
          type="button"
        >
          {getTelegramSendLabel(sendStatus)}
        </button>
      </div>

      {sendStatus === "done" ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            className="min-h-10 border border-ascii-green/35 bg-black px-3 text-xs font-black uppercase tracking-[0.1em] text-ascii-green transition hover:bg-ascii-green hover:text-black"
            onClick={() => {
              setVideoResult(null);
              setVideoStatus("ready for mp4");
              setSendStatus("send to telegram");
              setSendError(null);
              setSendHelpUrl("");
              setVideoProgress(0);
            }}
            type="button"
          >
            try another style
          </button>
          <button
            className="min-h-10 border border-ascii-green/35 bg-black px-3 text-xs font-black uppercase tracking-[0.1em] text-ascii-green transition hover:bg-ascii-green hover:text-black"
            onClick={sendTextVideoToTelegram}
            type="button"
          >
            post again
          </button>
        </div>
      ) : null}
    </div>
  );
}
