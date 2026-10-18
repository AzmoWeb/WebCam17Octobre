"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Hls from "hls.js";
import { ExternalLink, Maximize, Volume2, VolumeX, WifiOff, X } from "lucide-react";
import { LiveBadge } from "@/components/ui";
import { cn } from "@/lib/utils";

type Props = {
  streamId: string;
  title: string;
  owner: string;
  initiallyLive: boolean;
  audible: boolean;
  onToggleAudio: () => void;
  onRemove?: () => void;
};

const ctrl = "grid size-8 place-items-center rounded-md text-white hover:bg-white/15";

/** Lecteur compact de la mosaïque : muet par défaut, un seul flux audible à la fois. */
export default function MiniPlayer({ streamId, title, owner, initiallyLive, audible, onToggleAudio, onRemove }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [live, setLive] = useState(initiallyLive);

  useEffect(() => {
    if (live) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/streams/${streamId}/status`, { cache: "no-store" });
        if (((await res.json()) as { live: boolean }).live) setLive(true);
      } catch {}
    }, 8000);
    return () => clearInterval(timer);
  }, [live, streamId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!live || !video) return;
    const src = `/api/hls/${streamId}/index.m3u8`;
    if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true, liveSyncDurationCount: 2, capLevelToPlayerSize: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
        else setLive(false);
      });
      return () => hls.destroy();
    }
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.play().catch(() => {});
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }
  }, [live, streamId]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = !audible;
  }, [audible]);

  return (
    <div ref={wrapRef} className={cn("group/tile relative aspect-video overflow-hidden rounded-xl bg-black", audible && "ring-3 ring-brand")}>
      <video ref={videoRef} muted playsInline autoPlay className="size-full object-contain" />
      {!live && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
          <WifiOff className="size-6" />
          <span className="text-sm">Hors ligne</span>
        </div>
      )}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/75 to-transparent p-2 pb-6">
        <div className="flex min-w-0 items-center gap-1.5">
          {live && <LiveBadge label="Live" className="h-5 px-1.5 text-[10px]" />}
          <span className="truncate text-[13px] font-semibold text-white">
            {title} <span className="text-white/60">· {owner}</span>
          </span>
        </div>
        <div className="flex shrink-0 gap-0.5 opacity-100 transition sm:opacity-0 sm:group-hover/tile:opacity-100">
          <button className={ctrl} onClick={onToggleAudio} aria-label={audible ? "Couper le son" : "Écouter ce flux"}>
            {audible ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </button>
          <button className={ctrl} onClick={() => wrapRef.current?.requestFullscreen().catch(() => {})} aria-label="Plein écran">
            <Maximize className="size-4" />
          </button>
          <Link href={`/cam/${streamId}`} className={ctrl} aria-label="Ouvrir la page">
            <ExternalLink className="size-4" />
          </Link>
          {onRemove && (
            <button className={ctrl} onClick={onRemove} aria-label="Retirer">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
