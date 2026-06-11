import { NextResponse } from "next/server";

type JobRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: JobRouteContext) {
  const { id } = await context.params;

  return NextResponse.json(
    {
      ok: false,
      id,
      message: "Job storage will be implemented with the queue layer.",
    },
    { status: 501 },
  );
}
