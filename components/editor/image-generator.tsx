"use client";

import { useEffect, useMemo, useState } from "react";
import { GenerateButton } from "@/components/editor/generate-button";
import { PresetButton } from "@/components/editor/preset-button";
import { StatusPill } from "@/components/editor/status-pill";
import {
  IMAGE_ASCII_PRESETS,
  type ImageAsciiPresetId,
} from "@/lib/ascii/image";

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

const imagePresetEntries = Object.entries(IMAGE_ASCII_PRESETS) as Array<
  [ImageAsciiPresetId, (typeof IMAGE_ASCII_PRESETS)[ImageAsciiPresetId]]
>;

function downloadDataUrl(dataUrl: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}

export function ImageGenerator() {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [presetId, setPresetId] = useState<ImageAsciiPresetId>("brailleColor");
  const [result, setResult] = useState<ImageRenderResponse | null>(null);
  const [status, setStatus] = useState("idle");
  const [copyStatus, setCopyStatus] = useState("copy ascii");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!fileUrl) return;

    return () => URL.revokeObjectURL(fileUrl);
  }, [fileUrl]);

  const resultDataUrl =
    result?.ok === true
      ? `data:${result.image.mimeType};base64,${result.image.base64}`
      : "";
  const activePreset = IMAGE_ASCII_PRESETS[presetId];
  const canGenerate = Boolean(file) && status !== "rendering";
  const selectedFileMeta = useMemo(() => {
    if (!file) return "no file";

    return `${file.name} / ${(file.size / 1024 / 1024).toFixed(2)} MB`;
  }, [file]);

  const renderImage = async () => {
    if (!file) {
      setError("Upload an image first.");
      return;
    }

    setStatus("rendering");
    setError("");

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
    } catch {
      setResult({
        ok: false,
        message: "Image render failed.",
      });
      setError("Image render failed.");
      setStatus("error");
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
            setFile(nextFile);
            setFileUrl(nextFile ? URL.createObjectURL(nextFile) : "");
            setResult(null);
            setError("");
            setStatus(nextFile ? "image loaded" : "idle");
          }}
          type="file"
        />
        {file ? selectedFileMeta : "drop / select JPG PNG WEBP"}
      </label>

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

      <GenerateButton disabled={!canGenerate} onClick={renderImage}>
        {status === "rendering" ? "rendering image" : "generate image"}
      </GenerateButton>

      <div className="grid grid-cols-2 gap-2">
        <button
          className="min-h-10 border border-ascii-green/45 bg-black px-3 text-xs font-black uppercase tracking-[0.1em] text-ascii-green disabled:cursor-not-allowed disabled:border-ascii-muted disabled:text-ascii-white/35"
          disabled={!resultDataUrl}
          onClick={() => downloadDataUrl(resultDataUrl, "ascii-image.png")}
          type="button"
        >
          download png
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
    </div>
  );
}
