import { NextResponse } from "next/server";
import {
  BRAILLE_DOT_MAP,
  IMAGE_ASCII_PRESETS,
  IMAGE_CHARACTER_SETS,
  IMAGE_LIMITS,
  IMAGE_RENDER_MODES,
} from "@/lib/ascii/image";
import { renderImageToAsciiPng } from "@/lib/ascii/image-renderer";
import { authorizeTelegramRequest } from "@/lib/telegram/authorize";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    brailleDotMap: BRAILLE_DOT_MAP,
    characterSets: IMAGE_CHARACTER_SETS,
    limits: IMAGE_LIMITS,
    modes: IMAGE_RENDER_MODES,
    presets: IMAGE_ASCII_PRESETS,
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    await authorizeTelegramRequest(String(formData.get("initData") ?? ""));
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Upload an image file first.",
        },
        { status: 400 },
      );
    }

    const normalizedName = file.name.toLowerCase();
    const supportedByType = ["image/jpeg", "image/png", "image/webp"].includes(
      file.type,
    );
    const supportedByExtension = [".jpg", ".jpeg", ".png", ".webp"].some(
      (extension) => normalizedName.endsWith(extension),
    );

    if (!supportedByType && !supportedByExtension) {
      return NextResponse.json(
        {
          ok: false,
          message: "Supported image types: JPG, PNG, WebP.",
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rendered = await renderImageToAsciiPng(buffer, {
      invert: formData.get("invert") === "true",
      presetId: String(formData.get("presetId") ?? "matrixAscii"),
      width: Number(formData.get("width") ?? 0) || undefined,
    });

    return NextResponse.json({
      ok: true,
      asciiText: rendered.asciiText,
      fileName: file.name,
      image: {
        base64: rendered.png.toString("base64"),
        height: rendered.height,
        mimeType: rendered.mimeType,
        width: rendered.width,
      },
      presetId: rendered.presetId,
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
