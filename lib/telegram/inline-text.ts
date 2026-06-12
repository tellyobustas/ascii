import {
  isAsciiFontName,
  isTextCanvasPresetId,
  type AsciiFontName,
  type TextCanvasPresetId,
} from "../ascii/text";

const INLINE_TEXT_PREFIX = "ascii-txt";
const FALLBACK_FONT: AsciiFontName = "Graffiti";
const FALLBACK_CANVAS: TextCanvasPresetId = "telegramPost";
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

export type InlineTextPayload = {
  canvasPreset: TextCanvasPresetId;
  font: AsciiFontName;
  text: string;
};

function getGlobalBuffer() {
  return (globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer;
}

function encodeBase64Url(value: string) {
  const buffer = getGlobalBuffer();

  if (buffer) {
    return buffer.from(value, "utf8").toString("base64url");
  }

  const bytes = TEXT_ENCODER.encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const buffer = getGlobalBuffer();

  if (buffer) {
    return buffer.from(value, "base64url").toString("utf8");
  }

  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return TEXT_DECODER.decode(bytes);
}

export function encodeInlineTextQuery(payload: InlineTextPayload) {
  const text = encodeBase64Url(payload.text.trim());

  return [
    INLINE_TEXT_PREFIX,
    payload.font,
    payload.canvasPreset,
    text,
  ].join("|");
}

export function parseInlineTextQuery(query: string): InlineTextPayload | null {
  const [prefix, fontValue, canvasValue, encodedText] = query.split("|");

  if (prefix !== INLINE_TEXT_PREFIX || !encodedText) {
    return null;
  }

  const font = isAsciiFontName(fontValue) ? fontValue : FALLBACK_FONT;
  const canvasPreset = isTextCanvasPresetId(canvasValue)
    ? canvasValue
    : FALLBACK_CANVAS;

  try {
    return {
      canvasPreset,
      font,
      text: decodeBase64Url(encodedText),
    };
  } catch {
    return null;
  }
}
