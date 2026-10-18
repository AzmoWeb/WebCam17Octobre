import { NextResponse } from "next/server";
import { getStreamKey } from "@/lib/supabase/admin";
import { isPathLive, publishPath } from "@/lib/mediamtx";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const key = await getStreamKey(id).catch(() => null);
  const live = key ? await isPathLive(publishPath(key)) : false;
  return NextResponse.json({ live }, { headers: { "cache-control": "no-store" } });
}
