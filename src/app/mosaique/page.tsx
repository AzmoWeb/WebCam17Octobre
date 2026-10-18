import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { getStreamSummaries } from "@/lib/streams";
import MosaicClient from "./MosaicClient";

export const metadata: Metadata = { title: "Mosaïque" };

const query = z.object({
  cams: z.string().max(400).catch(""),
  layout: z.coerce.number().int().catch(4),
});

export default async function MosaicPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { cams, layout } = query.parse(await searchParams);
  const streams = await getStreamSummaries();
  const known = new Set(streams.map((s) => s.id));
  let ids = cams.split(",").filter((id) => known.has(id));
  if (ids.length === 0) ids = streams.filter((s) => s.live).map((s) => s.id);

  return (
    <Suspense>
      <MosaicClient streams={streams} initialIds={ids} initialSize={layout} />
    </Suspense>
  );
}
