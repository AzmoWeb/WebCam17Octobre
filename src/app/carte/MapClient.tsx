"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Eye, LayoutGrid, MapPin, Radio, Video } from "lucide-react";
import LiveMap, { type LiveMapHandle, type MapStream } from "@/components/LiveMap";
import { useViewerCounts } from "@/lib/presence";
import type { StreamSummary } from "@/lib/streams";
import { cn, gradientFor } from "@/lib/utils";

export default function MapClient({ streams }: { streams: StreamSummary[] }) {
  const viewers = useViewerCounts();
  const mapRef = useRef<LiveMapHandle>(null);
  const [liveOnly, setLiveOnly] = useState(false);

  const located = useMemo(
    () =>
      streams
        .filter((s) => s.lat !== null && s.lng !== null && (!liveOnly || s.live))
        .sort((a, b) => Number(b.live) - Number(a.live) || (viewers[b.id] ?? 0) - (viewers[a.id] ?? 0)),
    [streams, liveOnly, viewers],
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

  const liveIds = located.filter((s) => s.live).map((s) => s.id);
  const unlocated = streams.filter((s) => s.lat === null).length;

  return (
    <div className="map-layout">
      <aside className="card map-sidebar">
        <div className="card-header">
          <h3>
            <MapPin size={18} /> Carte en direct
          </h3>
          <span className="badge badge-live">{streams.filter((s) => s.live).length} live</span>
        </div>
        <div className="row" style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
          <div className="tabs grow">
            <button className={cn("tab grow", !liveOnly && "active")} style={{ justifyContent: "center" }} onClick={() => setLiveOnly(false)}>
              Toutes
            </button>
            <button className={cn("tab grow", liveOnly && "active")} style={{ justifyContent: "center" }} onClick={() => setLiveOnly(true)}>
              <Radio size={14} /> En direct
            </button>
          </div>
          {liveIds.length > 1 && (
            <Link href={`/mosaique?cams=${liveIds.slice(0, 9).join(",")}`} className="btn btn-sm btn-primary" title="Voir les directs en mosaïque">
              <LayoutGrid size={14} /> Mosaïque
            </Link>
          )}
        </div>
        <div className="map-list">
          {located.length === 0 && (
            <p className="muted small" style={{ padding: 16 }}>
              Aucune caméra géolocalisée{liveOnly ? " en direct" : ""}. Les streamers peuvent placer leur caméra sur la
              carte depuis le Studio.
            </p>
          )}
          {located.map((s) => (
            <button key={s.id} className="dash-cam map-item" onClick={() => mapRef.current?.focus(s.id)}>
              <span className="dash-cam-thumb" style={{ background: gradientFor(s.id) }}>
                <Video size={14} />
              </span>
              <span className="grow" style={{ textAlign: "left", minWidth: 0 }}>
                <span className="truncate" style={{ display: "block", fontWeight: 600 }}>
                  {s.title}
                </span>
                <span className="tiny muted row" style={{ gap: 6 }}>
                  <span className={cn("live-dot", s.live && "on")} />
                  {s.live ? (
                    <>
                      <Eye size={11} /> {viewers[s.id] ?? 0}
                    </>
                  ) : (
                    "Hors ligne"
                  )}
                  {s.city && ` · ${s.city}`}
                </span>
              </span>
            </button>
          ))}
        </div>
        {unlocated > 0 && (
          <p className="tiny muted" style={{ padding: "10px 16px", borderTop: "1px solid var(--border)" }}>
            {unlocated} caméra{unlocated > 1 ? "s" : ""} sans position ne {unlocated > 1 ? "sont" : "est"} pas affichée
            {unlocated > 1 ? "s" : ""}.
          </p>
        )}
      </aside>
      <div className="card map-canvas">
        <LiveMap ref={mapRef} streams={mapStreams} />
      </div>
    </div>
  );
}
