"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Camera,
  Check,
  Gauge,
  Maximize,
  Scissors,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RectangleHorizontal,
  Volume2,
  VolumeX,
  WifiOff,
} from "lucide-react";
import { useUI } from "@/components/UIProvider";
import Countdown from "@/components/Countdown";
import { cn, formatDateTime } from "@/lib/utils";

export type Reaction = { id: number; emoji: string; left: number; drift: number };

type Props = {
  streamId: string;
  title: string;
  initiallyLive: boolean;
  onLiveChange?: (live: boolean) => void;
  theater: boolean;
  onToggleTheater: () => void;
  reactions: Reaction[];
  scheduledAt?: string | null;
  onClip?: () => void;
};

const QUALITY_OPTIONS = [
  { value: "", label: "Source" },
  { value: "720", label: "720p" },
  { value: "480", label: "480p (économie de données)" },
];

// Attend que la caméra soit en direct (polling du statut), puis lit le flux HLS
// avec des contrôles maison : direct, volume, qualité, clip, capture, PiP, mode cinéma, plein écran.
export default function Player({
  streamId,
  title,
  initiallyLive,
  onLiveChange,
  theater,
  onToggleTheater,
  reactions,
  scheduledAt,
  onClip,
}: Props) {
  const { toast } = useUI();
  const [quality, setQuality] = useState("");
  const [qualityMenu, setQualityMenu] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [live, setLiveState] = useState(initiallyLive);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [fullscreen, setFullscreen] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

  const setLive = useCallback(
    (v: boolean) => {
      setLiveState(v);
      onLiveChange?.(v);
    },
    [onLiveChange],
  );

  // Polling du statut tant que la caméra est hors ligne.
  useEffect(() => {
    if (live) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/streams/${streamId}/status`, { cache: "no-store" });
        const { live } = (await res.json()) as { live: boolean };
        if (live) setLive(true);
      } catch {
        // Réessaie au prochain tour.
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [live, streamId, setLive]);

  // Lecture HLS.
  useEffect(() => {
    const video = videoRef.current;
    if (!live || !video) return;
    const src = `/api/hls/${streamId}/${quality ? `q${quality}/` : ""}index.m3u8`;

    if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true, liveSyncDurationCount: 2, manifestLoadingTimeOut: 20000 });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
        else if (quality) {
          // Qualité réduite indisponible (ffmpeg absent sur le serveur ?) : retour à la source.
          toast("Cette qualité n'est pas disponible pour le moment.", "error");
          setQuality("");
        } else setLive(false);
      });
      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.play().catch(() => {});
      const onError = () => setLive(false);
      video.addEventListener("error", onError);
      return () => {
        video.removeEventListener("error", onError);
        video.removeAttribute("src");
        video.load();
      };
    }
  }, [live, streamId, setLive, quality, toast]);

  // Latence par rapport au direct.
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => {
      const hls = hlsRef.current;
      setLatency(hls && Number.isFinite(hls.latency) ? hls.latency : null);
    }, 1000);
    return () => clearInterval(timer);
  }, [live]);

  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    if (!v.muted && v.volume === 0) v.volume = 0.5;
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else wrapRef.current?.requestFullscreen().catch(() => {});
  }, []);

  function goLive() {
    const v = videoRef.current;
    const hls = hlsRef.current;
    if (!v) return;
    if (hls?.liveSyncPosition) v.currentTime = hls.liveSyncPosition;
    else if (Number.isFinite(v.duration)) v.currentTime = v.duration - 1;
    v.play().catch(() => {});
  }

  async function pip() {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {
      toast("Picture-in-picture indisponible sur ce navigateur.", "error");
    }
  }

  function screenshot() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return toast("Aucune image à capturer.", "error");
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")?.drawImage(v, 0, 0);
    const a = document.createElement("a");
    a.download = `${title.replace(/[^\w-]+/g, "_")}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
    toast("Capture enregistrée");
  }

  // Raccourcis clavier (hors champs de saisie).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.ctrlKey || e.metaKey) return;
      const k = e.key.toLowerCase();
      if (k === "k" || (k === " " && e.target === document.body)) {
        e.preventDefault();
        togglePlay();
      } else if (k === "m") toggleMute();
      else if (k === "f") toggleFullscreen();
      else if (k === "t") onToggleTheater();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [togglePlay, toggleMute, toggleFullscreen, onToggleTheater]);

  const atEdge = latency === null || latency < 6;

  return (
    <div ref={wrapRef} className={cn("player", !playing && "paused")}>
      <video
        ref={videoRef}
        muted={muted}
        playsInline
        autoPlay
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onVolumeChange={(e) => {
          setMuted(e.currentTarget.muted);
          setVolume(e.currentTarget.volume);
        }}
      />

      <div className="reactions-layer">
        {reactions.map((r) => (
          <span
            key={r.id}
            className="floating-reaction"
            style={{ left: `${r.left}%`, ["--drift" as string]: `${r.drift}px` }}
          >
            {r.emoji}
          </span>
        ))}
      </div>

      {live ? (
        <>
          <div className="player-top">
            <span className="badge badge-live">EN DIRECT</span>
          </div>
          <div className="player-controls">
            <button className="pc-btn" onClick={togglePlay} title={playing ? "Pause (k)" : "Lecture (k)"}>
              {playing ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button className="pc-btn" onClick={toggleMute} title="Son (m)">
              {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input
              className="volume"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              aria-label="Volume"
              onChange={(e) => {
                const v = videoRef.current;
                if (!v) return;
                v.volume = Number(e.target.value);
                v.muted = v.volume === 0;
              }}
            />
            <button className={cn("pc-live", atEdge && "at-edge")} onClick={goLive} title="Revenir au direct">
              <span className="live-dot" /> DIRECT
            </button>
            {latency !== null && <span className="pc-info">Délai {latency.toFixed(1)} s</span>}
            <span className="grow" />
            {onClip && (
              <button className="pc-btn" onClick={onClip} title="Créer un clip des dernières secondes">
                <Scissors size={19} />
              </button>
            )}
            <div style={{ position: "relative" }}>
              <button className="pc-btn" onClick={() => setQualityMenu((o) => !o)} title="Qualité">
                <Gauge size={19} />
              </button>
              {qualityMenu && (
                <div className="dropdown-menu" style={{ bottom: "calc(100% + 8px)", top: "auto", minWidth: 220 }}>
                  {QUALITY_OPTIONS.map((q) => (
                    <button
                      key={q.value}
                      className="dropdown-item"
                      onClick={() => {
                        setQuality(q.value);
                        setQualityMenu(false);
                      }}
                    >
                      <span style={{ width: 16 }}>{quality === q.value && <Check size={15} />}</span>
                      {q.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="pc-btn" onClick={screenshot} title="Capture d'écran">
              <Camera size={19} />
            </button>
            <button className="pc-btn" onClick={pip} title="Picture-in-picture">
              <PictureInPicture2 size={19} />
            </button>
            <button className="pc-btn" onClick={onToggleTheater} title={theater ? "Mode normal (t)" : "Mode cinéma (t)"}>
              <RectangleHorizontal size={19} />
            </button>
            <button className="pc-btn" onClick={toggleFullscreen} title="Plein écran (f)">
              {fullscreen ? <Minimize size={19} /> : <Maximize size={19} />}
            </button>
          </div>
        </>
      ) : (
        <div className="player-offline">
          <div className="offline-icon">
            <WifiOff size={30} />
          </div>
          {scheduledAt && new Date(scheduledAt).getTime() > Date.now() ? (
            <>
              <strong style={{ fontSize: 18, color: "#fff" }}>Direct prévu {formatDateTime(scheduledAt)}</strong>
              <Countdown to={scheduledAt} />
            </>
          ) : (
            <strong style={{ fontSize: 18, color: "#fff" }}>Caméra hors ligne</strong>
          )}
          <span className="row small" style={{ justifyContent: "center" }}>
            <span className="spinner" /> En attente du direct — la vidéo démarrera automatiquement
          </span>
        </div>
      )}
    </div>
  );
}
