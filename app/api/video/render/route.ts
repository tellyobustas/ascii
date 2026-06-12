import { NextResponse } from "next/server";
import {
  VIDEO_ASCII_CONTAINER,
  VIDEO_ASCII_PRESETS,
  VIDEO_JOB_STAGES,
  VIDEO_RENDER_LIMITS,
  VIDEO_RENDER_MODES,
} from "@/lib/ascii/video";
import { renderVideoToAsciiMp4 } from "@/lib/ascii/video-renderer";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    container: VIDEO_ASCII_CONTAINER,
    limits: VIDEO_RENDER_LIMITS,
    modes: VIDEO_RENDER_MODES,
    presets: VIDEO_ASCII_PRESETS,
    stages: VIDEO_JOB_STAGES,
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Upload a video file first.",
        },
        { status: 400 },
      );
    }

    const normalizedName = file.name.toLowerCase();
    const supportedByType = ["video/mp4", "video/quicktime", "video/webm"].includes(
      file.type,
    );
    const supportedByExtension = [".mp4", ".mov", ".webm"].some((extension) =>
      normalizedName.endsWith(extension),
    );

    if (!supportedByType && !supportedByExtension) {
      return NextResponse.json(
        {
          ok: false,
          message: "Supported video types: MP4, MOV, WebM.",
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rendered = await renderVideoToAsciiMp4(buffer, {
      fps: Number(formData.get("fps") ?? 0) || undefined,
      presetId: String(formData.get("presetId") ?? "telegramLoop"),
      width: Number(formData.get("width") ?? 0) || undefined,
    });

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      presetId: rendered.presetId,
      video: {
        base64: rendered.mp4.toString("base64"),
        durationSeconds: rendered.durationSeconds,
        estimatedFrames: rendered.estimatedFrames,
        fileName: rendered.fileName,
        mimeType: rendered.mimeType,
        renderedFrames: rendered.renderedFrames,
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
