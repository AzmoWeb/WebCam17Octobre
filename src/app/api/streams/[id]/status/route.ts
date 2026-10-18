import { NextResponse } from "next/server";
import { z } from "zod";
import { isStreamLive } from "@/lib/mediamtx";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = z.string().uuid().safeParse((await params).id);
  const live = id.success ? await isStreamLive(id.data) : false;
  return NextResponse.json({ live }, { headers: { "cache-control": "no-store" } });
}
