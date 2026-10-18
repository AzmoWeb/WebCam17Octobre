import type { Metadata } from "next";
import { Suspense } from "react";
import { getStreamSummaries } from "@/lib/streams";
import MosaicClient from "./MosaicClient";

export const metadata: Metadata = { title: "Mosaïque" };

export default async function MosaicPage({ searchParams }: { searchParams: Promise<{ cams?: string; layout?: string }> }) {
  const { cams, layout } = await searchParams;
  const streams = await getStreamSummaries();
  const known = new Set(streams.map((s) => s.id));
  let ids = (cams ?? "").split(",").filter((id) => known.has(id));
  // Sans sélection : les directs les plus récents.
  if (ids.length === 0) ids = streams.filter((s) => s.live).map((s) => s.id);

  return (
    <Suspense>
      <MosaicClient streams={streams} initialIds={ids} initialSize={Number(layout) || 4} />
    </Suspense>
  );
}
