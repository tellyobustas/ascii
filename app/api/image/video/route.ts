import { NextResponse } from "next/server";
import { IMAGE_LIMITS } from "@/lib/ascii/image";
import { renderImageToAsciiGlitchVideo } from "@/lib/ascii/image-video-renderer";
import { videoQueue } from "@/lib/queue";

export const runtime = "nodejs";

function isSupportedImage(file: File) {
  const normalizedName = file.name.toLowerCase();
  const supportedByType = ["image/jpeg", "image/png", "image/webp"].includes(
    file.type,
  );
  const supportedByExtension = [".jpg", ".jpeg", ".png", ".webp"].some(
    (extension) => normalizedName.endsWith(extension),
  );

  return supportedByType || supportedByExtension;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
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

    if (!isSupportedImage(file)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Supported image types: JPG, PNG, WebP.",
        },
        { status: 400 },
      );
    }

    if (file.size > IMAGE_LIMITS.maxFileBytes) {
      return NextResponse.json(
        {
          ok: false,
          message: "Image file is too large. Maximum size is 12 MB.",
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rendered = await videoQueue.add(() =>
      renderImageToAsciiGlitchVideo(buffer, {
        invert: formData.get("invert") === "true",
        presetId: String(formData.get("presetId") ?? "brailleColor"),
        width: Number(formData.get("width") ?? 0) || undefined,
      }),
    );

    if (!rendered) {
      throw new Error("Image glitch video render failed.");
    }

    return NextResponse.json({
      ok: true,
      asciiText: rendered.asciiText,
      fileName: file.name,
      presetId: rendered.presetId,
      video: {
        base64: rendered.mp4.toString("base64"),
        durationSeconds: rendered.durationSeconds,
        fileName: rendered.fileName,
        fps: rendered.fps,
        height: rendered.height,
        mimeType: rendered.mimeType,
        renderedFrames: rendered.renderedFrames,
        width: rendered.width,
      },
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
