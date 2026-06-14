"use client";

import { useEffect, useState } from "react";
import { GenerateButton } from "@/components/editor/generate-button";
import { PresetButton } from "@/components/editor/preset-button";
import { StatusPill } from "@/components/editor/status-pill";
import {
  IMAGE_ASCII_PRESETS,
  IMAGE_LIMITS,
  type ImageAsciiPresetId,
} from "@/lib/ascii/image";
import {
  getBotStartUrl,
  getTelegramInitData,
  getTelegramSendErrorCopy,
  openBotStartUrl,
  type TelegramSendResponse,
} from "@/lib/telegram/client-export";

type ImageRenderResponse =
  | {
      ok: true;
      asciiText: string;
      fileName: string;
      image: {
        base64: string;
        height: number;
        mimeType: "image/png";
        width: number;
      };
      presetId: ImageAsciiPresetId;
    }
  | {
      ok: false;
      message: string;
    };

type ImageVideoResponse =
  | {
      ok: true;
      asciiText: string;
      fileName: string;
      presetId: ImageAsciiPresetId;
      video: {
        base64: string;
        durationSeconds: number;
        fileName: string;
        fps: number;
        height: number;
        mimeType: "video/mp4";
        renderedFrames: number;
        width: number;
      };
    }
  | {
      ok: false;
      message: string;
    };

type ImageQualityReport = {
  metrics: {
    brightness: number;
    clipping: number;
    contrast: number;
    detail: number;
    dimensions: string;
  };
  recommendation: string;
  recommendedPresetId: ImageAsciiPresetId;
  score: number;
  tone: string;
  verdict: string;
  warnings: string[];
};

const imagePresetEntries = Object.entries(IMAGE_ASCII_PRESETS) as Array<
  [ImageAsciiPresetId, (typeof IMAGE_ASCII_PRESETS)[ImageAsciiPresetId]]
>;
const imageMaxMegabytes = IMAGE_LIMITS.maxFileBytes / 1024 / 1024;

function formatMegabytes(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(2);
}

function getTelegramSendLabel(sendStatus: string) {
  if (sendStatus === "sending") return "sending";
  if (sendStatus === "done") return "sent";
  if (sendStatus === "start bot") return "start bot";

  return "send to telegram";
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not analyze image."));
    image.src = src;
  });
}

async function analyzeImageQuality(
  src: string,
  fileBytes: number,
): Promise<ImageQualityReport> {
  const image = await loadImageElement(src);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const scale = Math.min(160 / sourceWidth, 160 / sourceHeight, 1);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Could not analyze image.");
  }

  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const lumas = new Array<number>(width * height);
  let lumaSum = 0;
  let colorSum = 0;
  let darkPixels = 0;
  let lightPixels = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index] ?? 0;
    const green = pixels[index + 1] ?? 0;
    const blue = pixels[index + 2] ?? 0;
    const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const pixelIndex = index / 4;

    lumas[pixelIndex] = luma;
    lumaSum += luma;
    colorSum += Math.max(red, green, blue) - Math.min(red, green, blue);

    if (luma < 24) darkPixels += 1;
    if (luma > 232) lightPixels += 1;
  }

  const pixelCount = Math.max(1, lumas.length);
  const brightness = lumaSum / pixelCount;
  const variance =
    lumas.reduce((total, luma) => total + (luma - brightness) ** 2, 0) /
    pixelCount;
  const contrast = Math.sqrt(variance);
  let edgeSum = 0;
  let edgeSamples = 0;

  for (let y = 1; y < height; y += 1) {
    for (let x = 1; x < width; x += 1) {
      const index = y * width + x;
      edgeSum +=
        Math.abs((lumas[index] ?? 0) - (lumas[index - 1] ?? 0)) +
        Math.abs((lumas[index] ?? 0) - (lumas[index - width] ?? 0));
      edgeSamples += 1;
    }
  }

  const detail = edgeSamples > 0 ? edgeSum / edgeSamples / 255 : 0;
  const clipping = (darkPixels + lightPixels) / pixelCount;
  const colorfulness = colorSum / pixelCount;
  const shortSide = Math.min(sourceWidth, sourceHeight);
  const aspectRatio = sourceWidth / Math.max(1, sourceHeight);
  const warnings: string[] = [];
  let score = 100;

  if (fileBytes > IMAGE_LIMITS.maxFileBytes * 0.85) score -= 6;
  if (shortSide < 360) {
    score -= 16;
    warnings.push("low resolution: use a sharper source");
  }
  if (contrast < 26) {
    score -= 28;
    warnings.push("low contrast: use FLOYD or edit contrast first");
  } else if (contrast < 40) {
    score -= 12;
    warnings.push("soft contrast: FLOYD keeps gradients cleaner");
  }
  if (brightness < 48) {
    score -= 18;
    warnings.push("dark source: MATRIX or MONO will read better");
  } else if (brightness > 210) {
    score -= 16;
    warnings.push("bright source: crop away white background");
  }
  if (clipping > 0.55) {
    score -= 20;
    warnings.push("large flat areas: BLOCKS or MONO will be cleaner");
  } else if (clipping > 0.35) {
    score -= 9;
  }
  if (detail < 0.035) {
    score -= 20;
    warnings.push("low detail: crop closer to the subject");
  } else if (detail > 0.24) {
    score -= 8;
    warnings.push("busy detail: crop tighter or use BAYER");
  }
  if (aspectRatio > 2.2 || aspectRatio < 0.45) {
    score -= 7;
    warnings.push("wide/tall frame: square crop will render stronger");
  }

  let recommendedPresetId: ImageAsciiPresetId = "brailleColor";
  let recommendation = "BRAILLE COLOR should preserve detail and color best.";
  let tone = "good source";

  if (contrast < 30 || detail < 0.04) {
    recommendedPresetId = "floydSteinberg";
    recommendation = "FLOYD rescues soft gradients and low detail.";
    tone = "soft / low contrast";
  } else if (clipping > 0.42 && detail > 0.055) {
    recommendedPresetId = colorfulness > 34 ? "blocks" : "brailleMono";
    recommendation =
      colorfulness > 34
        ? "BLOCKS keeps the strong silhouette readable."
        : "MONO keeps hard edges clean without color noise.";
    tone = "logo / silhouette";
  } else if (brightness < 62) {
    recommendedPresetId = "matrixAscii";
    recommendation = "MATRIX makes dark sources survive in green terminal mode.";
    tone = "dark source";
  } else if (detail > 0.2) {
    recommendedPresetId = "bayerDither";
    recommendation = "BAYER calms busy texture with stable ordered dither.";
    tone = "busy detail";
  } else if (colorfulness < 18) {
    recommendedPresetId = "brailleMono";
    recommendation = "MONO is cleaner for low-color images.";
    tone = "low color";
  }

  const qualityScore = clampScore(score);
  const verdict =
    qualityScore >= 82
      ? "excellent for ascii"
      : qualityScore >= 64
        ? "good with suggested preset"
        : qualityScore >= 44
          ? "needs crop or contrast"
          : "weak source for ascii";

  return {
    metrics: {
      brightness: Math.round(brightness),
      clipping: Math.round(clipping * 100),
      contrast: Math.round(contrast),
      detail: Math.round(detail * 100),
      dimensions: `${sourceWidth}x${sourceHeight}`,
    },
    recommendation,
    recommendedPresetId,
    score: qualityScore,
    tone,
    verdict,
    warnings: warnings.slice(0, 3),
  };
}

export function ImageGenerator() {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [presetId, setPresetId] = useState<ImageAsciiPresetId>("brailleColor");
  const [result, setResult] = useState<ImageRenderResponse | null>(null);
  const [status, setStatus] = useState("idle");
  const [sendStatus, setSendStatus] = useState("send to telegram");
  const [copyStatus, setCopyStatus] = useState("copy ascii");
  const [error, setError] = useState("");
  const [qualityReport, setQualityReport] =
    useState<ImageQualityReport | null>(null);
  const [qualityStatus, setQualityStatus] = useState("");
  const [sendError, setSendError] = useState("");
  const [sendHelpUrl, setSendHelpUrl] = useState("");
  const [videoResult, setVideoResult] = useState<ImageVideoResponse | null>(
    null,
  );
  const [videoStatus, setVideoStatus] = useState("video idle");
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoError, setVideoError] = useState("");
  const [videoSendStatus, setVideoSendStatus] = useState("send to telegram");
  const [videoSendError, setVideoSendError] = useState("");
  const [videoSendHelpUrl, setVideoSendHelpUrl] = useState("");

  useEffect(() => {
    if (!fileUrl) return;

    return () => URL.revokeObjectURL(fileUrl);
  }, [fileUrl]);

  useEffect(() => {
    if (!file || !fileUrl) {
      return;
    }

    let isCurrent = true;

    void analyzeImageQuality(fileUrl, file.size)
      .then((report) => {
        if (!isCurrent) return;

        setQualityReport(report);
        setQualityStatus("quality ready");
      })
      .catch(() => {
        if (!isCurrent) return;

        setQualityReport(null);
        setQualityStatus("quality unavailable");
      });

    return () => {
      isCurrent = false;
    };
  }, [file, fileUrl]);

  const resultDataUrl =
    result?.ok === true
      ? `data:${result.image.mimeType};base64,${result.image.base64}`
      : "";
  const videoDataUrl =
    videoResult?.ok === true
      ? `data:${videoResult.video.mimeType};base64,${videoResult.video.base64}`
      : "";
  const activePreset = IMAGE_ASCII_PRESETS[presetId];
  const canGenerate = Boolean(file) && status !== "rendering";
  const isRenderingVideo = videoStatus === "rendering video";
  const canGenerateVideo = Boolean(file && result?.ok) && !isRenderingVideo;
  const showVideoProgress = isRenderingVideo || videoProgress > 0;
  const selectedFileMeta = file
    ? `image ready / ${formatMegabytes(file.size)} MB`
    : "drop / select JPG PNG WEBP";

  const resetImageVideo = () => {
    setVideoResult(null);
    setVideoStatus("video idle");
    setVideoProgress(0);
    setVideoError("");
    setVideoSendStatus("send to telegram");
    setVideoSendError("");
    setVideoSendHelpUrl("");
  };

  const renderImage = async () => {
    if (!file) {
      setError("Upload an image first.");
      return;
    }

    setStatus("rendering");
    setSendStatus("send to telegram");
    setError("");
    setSendError("");
    setSendHelpUrl("");
    resetImageVideo();

    const formData = new FormData();
    formData.set("file", file);
    formData.set("presetId", presetId);

    try {
      const response = await fetch("/api/image/render", {
        body: formData,
        method: "POST",
      });
      const payload = (await response.json()) as ImageRenderResponse;

      if (!response.ok || !payload.ok) {
        const message = payload.ok ? "Image render failed." : payload.message;
        setResult(payload);
        setError(message);
        setStatus("error");
        return;
      }

      setResult(payload);
      setStatus("done");
      setSendStatus("send to telegram");
    } catch {
      setResult({
        ok: false,
        message: "Image render failed.",
      });
      setError("Image render failed.");
      setStatus("error");
    }
  };

  const renderImageVideo = async () => {
    if (!file || !result?.ok) {
      setVideoError("Generate an ASCII image first.");
      return;
    }

    setVideoStatus("rendering video");
    setVideoProgress(5);
    setVideoResult(null);
    setVideoError("");
    setVideoSendStatus("send to telegram");
    setVideoSendError("");
    setVideoSendHelpUrl("");

    const progressTimer = window.setInterval(() => {
      setVideoProgress((currentProgress) => {
        if (currentProgress >= 94) return currentProgress;

        const nextProgress =
          currentProgress + Math.max(1, Math.round((96 - currentProgress) * 0.08));

        return Math.min(94, nextProgress);
      });
    }, 280);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("presetId", presetId);

    try {
      const response = await fetch("/api/image/video", {
        body: formData,
        method: "POST",
      });
      const payload = (await response.json()) as ImageVideoResponse;

      if (!response.ok || !payload.ok) {
        const message = payload.ok ? "Glitch video render failed." : payload.message;
        setVideoResult(payload);
        setVideoError(message);
        setVideoStatus("video error");
        setVideoProgress(0);
        return;
      }

      setVideoResult(payload);
      setVideoStatus("mp4 ready");
      setVideoProgress(100);
    } catch {
      setVideoResult({
        ok: false,
        message: "Glitch video render failed.",
      });
      setVideoError("Glitch video render failed.");
      setVideoStatus("video error");
      setVideoProgress(0);
    } finally {
      window.clearInterval(progressTimer);
    }
  };

  const sendImageToTelegram = async () => {
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
          caption: "ASCII image",
          fileName: result.fileName || "ascii-image.png",
          imageBase64: result.image.base64,
          initData,
          mimeType: result.image.mimeType,
          resultType: "imagePng",
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
                message: "Could not send PNG.",
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
          getTelegramSendErrorCopy(failedPayload, "Could not send PNG."),
        );
        return;
      }

      setSendStatus("done");
    } catch (error) {
      setSendStatus("send to telegram");
      setSendHelpUrl("");
      setSendError(
        error instanceof Error ? error.message : "Could not send PNG.",
      );
    }
  };

  const sendImageVideoToTelegram = async () => {
    if (!videoResult?.ok) return;

    const initData = getTelegramInitData();

    if (!initData) {
      setVideoSendStatus("start bot");
      setVideoSendHelpUrl(getBotStartUrl());
      setVideoSendError(
        "Open ASCIILOGRAPH from Telegram and press SEND TO TELEGRAM again.",
      );
      return;
    }

    try {
      setVideoSendStatus("sending");
      setVideoSendError("");
      setVideoSendHelpUrl("");

      const response = await fetch("/api/telegram/send-result", {
        body: JSON.stringify({
          caption: "ASCII image glitch video",
          fileName: videoResult.video.fileName,
          initData,
          mimeType: videoResult.video.mimeType,
          resultType: "videoMp4",
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
                message: "Could not send MP4.",
                ok: false,
              };

        setVideoSendStatus(
          failedPayload.code === "BOT_CHAT_NOT_STARTED"
            ? "start bot"
            : "send to telegram",
        );
        setVideoSendHelpUrl(
          failedPayload.code === "BOT_CHAT_NOT_STARTED"
            ? failedPayload.startUrl || getBotStartUrl()
            : "",
        );
        setVideoSendError(
          getTelegramSendErrorCopy(failedPayload, "Could not send MP4."),
        );
        return;
      }

      setVideoSendStatus("done");
    } catch (error) {
      setVideoSendStatus("send to telegram");
      setVideoSendHelpUrl("");
      setVideoSendError(
        error instanceof Error ? error.message : "Could not send MP4.",
      );
    }
  };

  const copyAscii = async () => {
    if (!result?.ok) return;

    try {
      await navigator.clipboard.writeText(result.asciiText);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("copy failed");
    }

    window.setTimeout(() => setCopyStatus("copy ascii"), 1400);
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {imagePresetEntries.map(([id, preset]) => (
          <PresetButton
            active={id === presetId}
            key={id}
            onClick={() => {
              setPresetId(id);
              setResult(null);
              setError("");
              setSendError("");
              setSendHelpUrl("");
              setSendStatus("send to telegram");
              resetImageVideo();
              setStatus(file ? "style changed" : "idle");
            }}
          >
            {preset.shortLabel}
          </PresetButton>
        ))}
      </div>

      <label className="flex min-h-36 cursor-pointer items-center justify-center border border-dashed border-ascii-green/40 bg-black/70 p-5 text-center text-sm uppercase tracking-[0.12em] text-ascii-white/65 transition hover:border-ascii-green hover:text-ascii-green">
        <input
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            const nextFile = event.target.files?.[0] ?? null;

            if (nextFile && nextFile.size > IMAGE_LIMITS.maxFileBytes) {
              setFile(null);
              setFileUrl("");
              setResult(null);
              setQualityReport(null);
              setQualityStatus("");
              setSendError("");
              setSendHelpUrl("");
              setSendStatus("send to telegram");
              resetImageVideo();
              setStatus("too large");
              setError(`Image must be ${imageMaxMegabytes} MB or smaller.`);
              event.target.value = "";
              return;
            }

            setFile(nextFile);
            setFileUrl(nextFile ? URL.createObjectURL(nextFile) : "");
            setResult(null);
            setQualityReport(null);
            setQualityStatus(nextFile ? "analyzing source" : "");
            setError("");
            setSendError("");
            setSendHelpUrl("");
            setSendStatus("send to telegram");
            resetImageVideo();
            setStatus(nextFile ? "image loaded" : "idle");
          }}
          type="file"
        />
        <span className="space-y-2">
          <span className="block text-ascii-green">{selectedFileMeta}</span>
          <span className="block text-[0.62rem] leading-5 tracking-[0.14em] text-ascii-white/45">
            jpg png webp / max {imageMaxMegabytes} mb / max{" "}
            {IMAGE_LIMITS.maxInputWidth}x{IMAGE_LIMITS.maxInputHeight}px
          </span>
        </span>
      </label>

      {qualityStatus ? (
        <div className="border border-ascii-green/25 bg-black px-3 py-3 text-[0.65rem] uppercase leading-5 tracking-[0.1em] text-ascii-white/58">
          {qualityReport ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-black text-ascii-green">
                  quality meter
                </span>
                <span className="text-ascii-white/72">
                  {qualityReport.score}/100
                </span>
              </div>
              <div className="h-1.5 border border-ascii-green/30 bg-black">
                <div
                  className="h-full bg-ascii-green"
                  style={{ width: `${qualityReport.score}%` }}
                />
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <span>{qualityReport.verdict}</span>
                <span className="text-ascii-green/72">
                  {qualityReport.tone}
                </span>
              </div>
              <div className="border border-ascii-green/20 px-2 py-2 text-ascii-white/68">
                best:{" "}
                <span className="text-ascii-green">
                  {
                    IMAGE_ASCII_PRESETS[qualityReport.recommendedPresetId]
                      .shortLabel
                  }
                </span>{" "}
                / {qualityReport.recommendation}
              </div>
              {qualityReport.recommendedPresetId !== presetId ? (
                <button
                  className="min-h-9 w-full border border-ascii-green/45 bg-black px-3 text-xs font-black uppercase tracking-[0.1em] text-ascii-green transition hover:bg-ascii-green hover:text-black"
                  onClick={() => {
                    setPresetId(qualityReport.recommendedPresetId);
                    setResult(null);
                    setError("");
                    setSendError("");
                    setSendHelpUrl("");
                    setSendStatus("send to telegram");
                    resetImageVideo();
                    setStatus(file ? "style changed" : "idle");
                  }}
                  type="button"
                >
                  apply{" "}
                  {
                    IMAGE_ASCII_PRESETS[qualityReport.recommendedPresetId]
                      .shortLabel
                  }
                </button>
              ) : null}
              <div className="text-ascii-white/42">
                {qualityReport.metrics.dimensions} / contrast{" "}
                {qualityReport.metrics.contrast} / detail{" "}
                {qualityReport.metrics.detail} / clipped{" "}
                {qualityReport.metrics.clipping}%
              </div>
              {qualityReport.warnings.length > 0 ? (
                <div className="space-y-1 text-ascii-white/52">
                  {qualityReport.warnings.map((warning) => (
                    <div key={warning}>- {warning}</div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <span>{qualityStatus}</span>
          )}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <div className="border border-ascii-green/25 bg-black p-2">
          <div className="mb-2 text-[0.58rem] uppercase tracking-[0.14em] text-ascii-white/45">
            original
          </div>
          <div className="flex aspect-square items-center justify-center overflow-hidden bg-black">
            {fileUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Original upload preview"
                className="h-full w-full object-contain"
                src={fileUrl}
              />
            ) : (
              <span className="text-[0.65rem] uppercase tracking-[0.14em] text-ascii-white/35">
                no image
              </span>
            )}
          </div>
        </div>

        <div className="border border-ascii-green/25 bg-black p-2">
          <div className="mb-2 text-[0.58rem] uppercase tracking-[0.14em] text-ascii-white/45">
            ascii png
          </div>
          <div className="flex aspect-square items-center justify-center overflow-hidden bg-black">
            {resultDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="ASCII render preview"
                className="h-full w-full object-contain"
                src={resultDataUrl}
              />
            ) : (
              <span className="px-3 text-center text-[0.65rem] uppercase leading-5 tracking-[0.14em] text-ascii-white/35">
                generate preview
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <StatusPill label={status} />
        <span className="text-[0.65rem] uppercase tracking-[0.12em] text-ascii-white/45">
          {activePreset.label}
        </span>
      </div>

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

      <GenerateButton disabled={!canGenerate} onClick={renderImage}>
        {status === "rendering" ? "rendering image" : "generate image"}
      </GenerateButton>

      <div className="grid grid-cols-2 gap-2">
        <button
          className="min-h-10 border border-ascii-green/45 bg-black px-3 text-xs font-black uppercase tracking-[0.1em] text-ascii-green disabled:cursor-not-allowed disabled:border-ascii-muted disabled:text-ascii-white/35"
          disabled={!resultDataUrl || sendStatus === "sending"}
          onClick={sendImageToTelegram}
          type="button"
        >
          {getTelegramSendLabel(sendStatus)}
        </button>
        <button
          className="min-h-10 border border-ascii-green/45 bg-black px-3 text-xs font-black uppercase tracking-[0.1em] text-ascii-green disabled:cursor-not-allowed disabled:border-ascii-muted disabled:text-ascii-white/35"
          disabled={!result?.ok}
          onClick={copyAscii}
          type="button"
        >
          {copyStatus}
        </button>
      </div>

      {sendStatus === "done" ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            className="min-h-10 border border-ascii-green/35 bg-black px-3 text-xs font-black uppercase tracking-[0.1em] text-ascii-green transition hover:bg-ascii-green hover:text-black"
            onClick={() => {
              setResult(null);
              setSendStatus("send to telegram");
              setSendError("");
              setSendHelpUrl("");
              resetImageVideo();
              setStatus(file ? "style changed" : "idle");
            }}
            type="button"
          >
            try another style
          </button>
          <button
            className="min-h-10 border border-ascii-green/35 bg-black px-3 text-xs font-black uppercase tracking-[0.1em] text-ascii-green transition hover:bg-ascii-green hover:text-black"
            onClick={sendImageToTelegram}
            type="button"
          >
            post again
          </button>
        </div>
      ) : null}

      {result?.ok ? (
        <div className="space-y-3 border border-ascii-green/25 bg-black p-3">
          <div className="grid grid-cols-[1fr_auto] items-center gap-3">
            <span className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-ascii-green">
              glitch video
            </span>
            <span className="text-[0.58rem] uppercase tracking-[0.12em] text-ascii-white/45">
              4 sec / 10 fps
            </span>
          </div>

          <div className="flex aspect-video items-center justify-center overflow-hidden border border-ascii-green/20 bg-black">
            {videoDataUrl ? (
              <video
                className="h-full w-full object-contain"
                controls
                loop
                muted
                playsInline
                src={videoDataUrl}
              />
            ) : (
              <span className="px-3 text-center text-[0.65rem] uppercase leading-5 tracking-[0.14em] text-ascii-white/35">
                same ascii render / glyph drift / scanline glitch
              </span>
            )}
          </div>

          {showVideoProgress ? (
            <div className="text-[0.65rem] uppercase tracking-[0.12em] text-ascii-white/58">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span>{isRenderingVideo ? "rendering mp4" : "mp4 ready"}</span>
                <span className="text-ascii-green">{videoProgress}%</span>
              </div>
              <div className="h-2 border border-ascii-green/30 bg-black">
                <div
                  className="h-full bg-ascii-green shadow-[0_0_16px_rgba(0,255,102,0.35)] transition-[width] duration-300"
                  style={{ width: `${videoProgress}%` }}
                />
              </div>
            </div>
          ) : null}

          {videoResult?.ok ? (
            <div className="border border-ascii-green/20 px-3 py-2 text-[0.62rem] uppercase leading-5 tracking-[0.1em] text-ascii-white/52">
              {videoResult.video.renderedFrames} frames /{" "}
              {videoResult.video.width}x{videoResult.video.height} /{" "}
              {videoResult.video.durationSeconds.toFixed(1)} sec
            </div>
          ) : null}

          {videoError ? (
            <div className="border border-red-500/45 bg-black px-3 py-2 text-xs uppercase leading-5 tracking-[0.1em] text-red-300">
              {videoError}
            </div>
          ) : null}

          {videoSendError ? (
            <div className="border border-red-500/45 bg-black px-3 py-2 text-xs uppercase leading-5 tracking-[0.1em] text-red-300">
              {videoSendError}
              {videoSendHelpUrl ? (
                <button
                  className="mt-2 block min-h-9 w-full border border-red-300/70 bg-black px-3 text-xs font-black uppercase tracking-[0.12em] text-red-200 transition hover:bg-red-300 hover:text-black"
                  onClick={() => openBotStartUrl(videoSendHelpUrl)}
                  type="button"
                >
                  start bot
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              className="min-h-10 border border-ascii-green bg-black px-3 text-xs font-black uppercase tracking-[0.1em] text-ascii-green transition hover:bg-ascii-green hover:text-black disabled:cursor-not-allowed disabled:border-ascii-muted disabled:text-ascii-white/35"
              disabled={!canGenerateVideo}
              onClick={renderImageVideo}
              type="button"
            >
              {isRenderingVideo ? `${videoProgress}%` : "make glitch video"}
            </button>
            <button
              className="min-h-10 border border-ascii-green/45 bg-black px-3 text-xs font-black uppercase tracking-[0.1em] text-ascii-green transition hover:bg-ascii-green hover:text-black disabled:cursor-not-allowed disabled:border-ascii-muted disabled:text-ascii-white/35"
              disabled={!videoDataUrl || videoSendStatus === "sending"}
              onClick={sendImageVideoToTelegram}
              type="button"
            >
              {getTelegramSendLabel(videoSendStatus)}
            </button>
          </div>

          {videoSendStatus === "done" ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                className="min-h-10 border border-ascii-green/35 bg-black px-3 text-xs font-black uppercase tracking-[0.1em] text-ascii-green transition hover:bg-ascii-green hover:text-black"
                onClick={resetImageVideo}
                type="button"
              >
                try another style
              </button>
              <button
                className="min-h-10 border border-ascii-green/35 bg-black px-3 text-xs font-black uppercase tracking-[0.1em] text-ascii-green transition hover:bg-ascii-green hover:text-black"
                onClick={sendImageVideoToTelegram}
                type="button"
              >
                post again
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
