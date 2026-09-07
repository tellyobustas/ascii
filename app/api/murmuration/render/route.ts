import { NextResponse } from "next/server";
import { renderMurmurationPortrait } from "@/lib/ascii/murmuration-renderer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: "Upload a portrait first." }, { status: 400 });
    }

    if (!(["image/jpeg", "image/png", "image/webp"].includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name))) {
      return NextResponse.json({ ok: false, message: "Supported portrait types: JPG, PNG, WebP." }, { status: 400 });
    }

    const rendered = await renderMurmurationPortrait(
      Buffer.from(await file.arrayBuffer()),
      String(formData.get("style") ?? "signal"),
    );

    return NextResponse.json({
      ok: true,
      durationSeconds: rendered.durationSeconds,
      fileName: rendered.fileName,
      styleId: rendered.styleId,
      video: { base64: rendered.mp4.toString("base64"), fileName: rendered.fileName, mimeType: rendered.mimeType },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Murmuration render failed." }, { status: 400 });
  }
}
