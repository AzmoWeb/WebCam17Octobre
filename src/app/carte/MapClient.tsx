"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Eye, LayoutGrid, MapPin, Radio, Video } from "lucide-react";
import LiveMap, { type LiveMapHandle, type MapStream } from "@/components/LiveMap";
import { Badge, buttonClass, Card, LiveDot } from "@/components/ui";
import Tabs from "@/components/ui/Tabs";
import { useViewerCounts } from "@/lib/presence";
import type { StreamSummary } from "@/lib/streams";
import { cn, gradientFor } from "@/lib/utils";

export default function MapClient({ streams }: { streams: StreamSummary[] }) {
  const viewers = useViewerCounts();
  const mapRef = useRef<LiveMapHandle>(null);
  const [filter, setFilter] = useState<"live" | "all">("live");

  const located = useMemo(
    () =>
      streams
        .filter((s) => s.lat !== null && s.lng !== null && (filter === "all" || s.live))
        .sort((a, b) => Number(b.live) - Number(a.live) || (viewers[b.id] ?? 0) - (viewers[a.id] ?? 0)),
    [streams, filter, viewers],
  );

  const mapStreams: MapStream[] = located.map((s) => ({
    id: s.id,
    title: s.title,
    owner: s.owner,
    category: s.category,
    city: s.city,
    lat: s.lat!,
    lng: s.lng!,
    live: s.live,
    viewers: viewers[s.id] ?? 0,
  }));

  const liveCount = streams.filter((s) => s.live && s.lat !== null).length;
  const liveIds = located.filter((s) => s.live).map((s) => s.id);

  return (
    <div className="-mx-3 -mt-5 flex h-[calc(100dvh-3.5rem)] flex-col-reverse sm:-mx-5 sm:-mt-7 lg:mx-0 lg:mt-0 lg:h-[calc(100dvh-6.5rem)] lg:flex-row lg:gap-5">
      <Card className="flex max-h-[40%] min-h-0 flex-col overflow-hidden rounded-none border-x-0 border-b-0 lg:max-h-none lg:w-80 lg:shrink-0 lg:rounded-xl lg:border">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h1 className="flex items-center gap-2 font-bold">
            <MapPin className="size-[18px] text-brand" /> Carte en direct
          </h1>
          <Badge tone="live">
            <LiveDot on={liveCount > 0} /> {liveCount}
          </Badge>
        </div>
        <div className="flex items-center gap-2 border-b border-line p-3">
          <Tabs
            value={filter}
            onChange={setFilter}
            stretch
            className="flex-1"
            items={[
              { value: "live", label: "En direct", icon: <Radio className="size-3.5" /> },
              { value: "all", label: "Toutes" },
            ]}
          />
          {liveIds.length > 1 && (
            <Link
              href={`/mosaique?cams=${liveIds.slice(0, 9).join(",")}`}
              className={buttonClass({ size: "sm", variant: "primary", icon: true })}
              aria-label="Voir en mosaïque"
              title="Voir en mosaïque"
            >
              <LayoutGrid className="size-4" />
            </Link>
          )}
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {located.length === 0 && (
            <li className="p-3 text-sm text-ink-dim">
              {filter === "live" ? "Aucune caméra géolocalisée n'est en direct." : "Aucune caméra géolocalisée."} Les streamers placent leur
              caméra depuis le Studio.
            </li>
          )}
          {located.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => mapRef.current?.focus(s.id)}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-panel-2"
              >
                <span className="grid h-8 w-12 shrink-0 place-items-center rounded-md text-white/85" style={{ background: gradientFor(s.id) }}>
                  <Video className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{s.title}</span>
                  <span className="flex items-center gap-1.5 text-xs text-ink-dim">
                    <LiveDot on={s.live} />
                    {s.live ? (
                      <>
                        <Eye className="size-3" /> {viewers[s.id] ?? 0}
                      </>
                    ) : (
                      "Hors ligne"
                    )}
                    {s.city && <span className="truncate">· {s.city}</span>}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
      <div className={cn("relative min-h-0 flex-1 overflow-hidden lg:rounded-xl lg:border lg:border-line")}>
        <LiveMap ref={mapRef} streams={mapStreams} className="size-full" />
      </div>
    </div>
  );
}
