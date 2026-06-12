import { NextResponse } from "next/server";
import { validateTelegramInitData } from "@/lib/telegram/validate-init-data";

export const runtime = "nodejs";

type ResultType = "imagePng" | "textVideo" | "videoMp4";
type TelegramSendErrorCode =
  | "BOT_CHAT_NOT_STARTED"
  | "TELEGRAM_SEND_FAILED";

type TelegramSendResultRequest = {
  caption?: string;
  fileName?: string;
  imageBase64?: string;
  initData?: string;
  mimeType?: string;
  resultType?: ResultType;
  videoBase64?: string;
};

const MAX_TELEGRAM_FILE_BYTES = 50 * 1024 * 1024;

class TelegramSendError extends Error {
  code: TelegramSendErrorCode;

  constructor(message: string, code: TelegramSendErrorCode) {
    super(message);
    this.name = "TelegramSendError";
    this.code = code;
  }
}

function resolveBotStartUrl() {
  const username = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(
    /^@/,
    "",
  ).trim();

  return username ? `https://t.me/${username}?start=ascii_export` : "";
}

function normalizeTelegramError(description?: string) {
  const lowerDescription = description?.toLowerCase() ?? "";

  if (
    lowerDescription.includes("chat not found") ||
    lowerDescription.includes("bot was blocked") ||
    lowerDescription.includes("can't initiate conversation") ||
    lowerDescription.includes("user is deactivated")
  ) {
    return new TelegramSendError(
      "Start the ASCII bot once, then return to the Mini App and export again.",
      "BOT_CHAT_NOT_STARTED",
    );
  }

  return new TelegramSendError(
    description ?? "Telegram send failed.",
    "TELEGRAM_SEND_FAILED",
  );
}

function decodeBase64File(base64: unknown, noun: string) {
  if (typeof base64 !== "string" || !base64) {
    throw new Error(`Rendered ${noun} is missing.`);
  }

  const buffer = Buffer.from(base64, "base64");

  if (buffer.byteLength === 0) {
    throw new Error(`Rendered ${noun} is empty.`);
  }

  if (buffer.byteLength > MAX_TELEGRAM_FILE_BYTES) {
    throw new Error(`Rendered ${noun} is over Telegram 50 MB limit.`);
  }

  return buffer;
}

function normalizeResultType(resultType?: string): ResultType {
  if (
    resultType === "imagePng" ||
    resultType === "textVideo" ||
    resultType === "videoMp4"
  ) {
    return resultType;
  }

  throw new Error("Unsupported result type.");
}

async function callTelegramMultipart(
  method: "sendAnimation" | "sendDocument" | "sendPhoto" | "sendVideo",
  token: string,
  formData: FormData,
) {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      body: formData,
      method: "POST",
    },
  );
  const payload = (await response.json()) as {
    description?: string;
    ok: boolean;
  };

  if (!response.ok || !payload.ok) {
    throw normalizeTelegramError(
      payload.description ?? `Telegram ${method} failed.`,
    );
  }

  return payload;
}

function buildMediaFormData({
  buffer,
  caption,
  chatId,
  fileField,
  fileName,
  mimeType,
}: {
  buffer: Buffer;
  caption?: string;
  chatId: number;
  fileField: "animation" | "document" | "photo" | "video";
  fileName: string;
  mimeType: string;
}) {
  const formData = new FormData();
  const blob = new Blob([buffer as unknown as BlobPart], {
    type: mimeType,
  });

  formData.append("chat_id", String(chatId));
  formData.append(fileField, blob, fileName);

  if (fileField === "video") {
    formData.append("supports_streaming", "true");
  }

  if (caption) {
    formData.append("caption", caption.slice(0, 1024));
  }

  return formData;
}

async function sendVideoResult({
  buffer,
  caption,
  chatId,
  fileName,
  mimeType,
  token,
}: {
  buffer: Buffer;
  caption: string;
  chatId: number;
  fileName: string;
  mimeType: string;
  token: string;
}) {
  try {
    await callTelegramMultipart(
      "sendAnimation",
      token,
      buildMediaFormData({
        buffer,
        caption,
        chatId,
        fileField: "animation",
        fileName,
        mimeType,
      }),
    );
  } catch {
    await callTelegramMultipart(
      "sendVideo",
      token,
      buildMediaFormData({
        buffer,
        caption,
        chatId,
        fileField: "video",
        fileName,
        mimeType,
      }),
    );
  }
}

async function sendImageResult({
  buffer,
  caption,
  chatId,
  fileName,
  mimeType,
  token,
}: {
  buffer: Buffer;
  caption: string;
  chatId: number;
  fileName: string;
  mimeType: string;
  token: string;
}) {
  try {
    await callTelegramMultipart(
      "sendPhoto",
      token,
      buildMediaFormData({
        buffer,
        caption,
        chatId,
        fileField: "photo",
        fileName,
        mimeType,
      }),
    );
  } catch {
    await callTelegramMultipart(
      "sendDocument",
      token,
      buildMediaFormData({
        buffer,
        caption,
        chatId,
        fileField: "document",
        fileName,
        mimeType,
      }),
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TelegramSendResultRequest;
    const token = process.env.BOT_TOKEN ?? "";

    if (!token) {
      throw new Error("BOT_TOKEN is not configured.");
    }

    const resultType = normalizeResultType(body.resultType);
    const session = await validateTelegramInitData(body.initData ?? "", token);

    if (resultType === "imagePng") {
      await sendImageResult({
        buffer: decodeBase64File(body.imageBase64, "image"),
        caption: body.caption ?? "ASCII image",
        chatId: session.userId,
        fileName: body.fileName?.endsWith(".png")
          ? body.fileName
          : "ascii-image.png",
        mimeType: body.mimeType === "image/png" ? body.mimeType : "image/png",
        token,
      });
    } else {
      await sendVideoResult({
        buffer: decodeBase64File(body.videoBase64, "video"),
        caption:
          body.caption ??
          (resultType === "videoMp4"
            ? "ASCII video animation"
            : "ASCII text animation"),
        chatId: session.userId,
        fileName: body.fileName?.endsWith(".mp4")
          ? body.fileName
          : resultType === "videoMp4"
            ? "ascii-animation.mp4"
            : "ascii-text-glitch.mp4",
        mimeType: body.mimeType === "video/mp4" ? body.mimeType : "video/mp4",
        token,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Sent to Telegram",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const code =
      error instanceof TelegramSendError ? error.code : undefined;

    return NextResponse.json(
      {
        code,
        ok: false,
        message,
        startUrl:
          code === "BOT_CHAT_NOT_STARTED" ? resolveBotStartUrl() : undefined,
      },
      { status: 400 },
    );
  }
}
