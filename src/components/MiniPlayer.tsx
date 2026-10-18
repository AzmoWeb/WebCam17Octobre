"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Hls from "hls.js";
import { ExternalLink, Maximize, Volume2, VolumeX, WifiOff, X } from "lucide-react";

type Props = {
  streamId: string;
  title: string;
  owner: string;
  initiallyLive: boolean;
  audible: boolean;
  onToggleAudio: () => void;
  onRemove?: () => void;
};

/** Lecteur compact pour la mosaïque : muet par défaut, un seul flux audible à la fois. */
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
    <div ref={wrapRef} className={audible ? "mosaic-tile audible" : "mosaic-tile"}>
      <video ref={videoRef} muted playsInline autoPlay />
      {!live && (
        <div className="player-offline" style={{ gap: 8 }}>
          <WifiOff size={26} />
          <span className="small">Hors ligne</span>
        </div>
      )}
      <div className="mosaic-overlay">
        <div className="row" style={{ gap: 6, minWidth: 0 }}>
          {live && <span className="badge badge-live">LIVE</span>}
          <span className="mosaic-title truncate">
            {title} <span style={{ opacity: 0.7 }}>· @{owner}</span>
          </span>
        </div>
        <div className="row" style={{ gap: 2, flexWrap: "nowrap" }}>
          <button className="pc-btn" onClick={onToggleAudio} title={audible ? "Couper le son" : "Écouter ce flux"}>
            {audible ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          <button
            className="pc-btn"
            onClick={() => wrapRef.current?.requestFullscreen().catch(() => {})}
            title="Plein écran"
          >
            <Maximize size={17} />
          </button>
          <Link href={`/cam/${streamId}`} className="pc-btn" title="Ouvrir la page">
            <ExternalLink size={17} />
          </Link>
          {onRemove && (
            <button className="pc-btn" onClick={onRemove} title="Retirer">
              <X size={17} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
