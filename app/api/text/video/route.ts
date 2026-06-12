import { NextResponse } from "next/server";
import { renderAsciiTextVideo } from "@/lib/ascii/text-video-renderer";

export const runtime = "nodejs";

type TextVideoRequest = {
  canvasPreset?: string;
  color?: string;
  font?: string;
  text?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TextVideoRequest;
    const rendered = await renderAsciiTextVideo(body);

    return NextResponse.json({
      ok: true,
      canvas: rendered.canvas,
      color: rendered.color,
      durationSeconds: rendered.durationSeconds,
      fileName: rendered.fileName,
      font: rendered.font,
      text: rendered.text,
      video: {
        base64: rendered.mp4.toString("base64"),
        fileName: rendered.fileName,
        mimeType: rendered.mimeType,
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
