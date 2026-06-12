import { NextResponse } from "next/server";
import { validateTelegramInitData } from "@/lib/telegram/validate-init-data";

export const runtime = "nodejs";

type TelegramSendResultRequest = {
  caption?: string;
  fileName?: string;
  initData?: string;
  mimeType?: string;
  resultType?: "textVideo";
  videoBase64?: string;
};

const MAX_TELEGRAM_FILE_BYTES = 50 * 1024 * 1024;

function decodeBase64File(base64: unknown) {
  if (typeof base64 !== "string" || !base64) {
    throw new Error("Rendered video is missing.");
  }

  const buffer = Buffer.from(base64, "base64");

  if (buffer.byteLength === 0) {
    throw new Error("Rendered video is empty.");
  }

  if (buffer.byteLength > MAX_TELEGRAM_FILE_BYTES) {
    throw new Error("Rendered video is over Telegram 50 MB limit.");
  }

  return buffer;
}

async function callTelegramMultipart(
  method: "sendAnimation" | "sendVideo",
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
    throw new Error(payload.description ?? `Telegram ${method} failed.`);
  }

  return payload;
}

function buildVideoFormData({
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
  fileField: "animation" | "video";
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TelegramSendResultRequest;
    const token = process.env.BOT_TOKEN ?? "";

    if (!token) {
      throw new Error("BOT_TOKEN is not configured.");
    }

    if (body.resultType !== "textVideo") {
      throw new Error("Unsupported result type.");
    }

    const session = await validateTelegramInitData(body.initData ?? "", token);
    const videoBuffer = decodeBase64File(body.videoBase64);
    const mimeType = body.mimeType === "video/mp4" ? body.mimeType : "video/mp4";
    const fileName = body.fileName?.endsWith(".mp4")
      ? body.fileName
      : "ascii-text-glitch.mp4";
    const caption = body.caption ?? "ASCII text animation";

    try {
      await callTelegramMultipart(
        "sendAnimation",
        token,
        buildVideoFormData({
          buffer: videoBuffer,
          caption,
          chatId: session.userId,
          fileField: "animation",
          fileName,
          mimeType,
        }),
      );
    } catch {
      await callTelegramMultipart(
        "sendVideo",
        token,
        buildVideoFormData({
          buffer: videoBuffer,
          caption,
          chatId: session.userId,
          fileField: "video",
          fileName,
          mimeType,
        }),
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Sent to Telegram",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 400 },
    );
  }
}
