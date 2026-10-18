"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Camera,
  Check,
  Gauge,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RectangleHorizontal,
  Scissors,
  Volume2,
  VolumeX,
  WifiOff,
} from "lucide-react";
import { useUI } from "@/components/UIProvider";
import Countdown from "@/components/Countdown";
import { LiveBadge } from "@/components/ui";
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
  { value: "480", label: "480p · économie de données" },
];

const ctrl = "grid size-9 place-items-center rounded-md text-white transition hover:bg-white/15";

// Attend que la caméra soit en direct (relève du statut), puis lit le flux HLS
// avec des contrôles maison : direct, volume, qualité, clip, capture, PiP, mode cinéma, plein écran.
export default function Player({ streamId, title, initiallyLive, onLiveChange, theater, onToggleTheater, reactions, scheduledAt, onClip }: Props) {
  const { toast } = useUI();
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [live, setLiveState] = useState(initiallyLive);
  const [buffering, setBuffering] = useState(initiallyLive);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [fullscreen, setFullscreen] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [quality, setQuality] = useState("");
  const [qualityMenu, setQualityMenu] = useState(false);

  const setLive = useCallback(
    (v: boolean) => {
      setLiveState(v);
      onLiveChange?.(v);
    },
    [onLiveChange],
  );

  // Relève du statut tant que la caméra est hors ligne.
  useEffect(() => {
    if (live) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/streams/${streamId}/status`, { cache: "no-store" });
        if (((await res.json()) as { live: boolean }).live) setLive(true);
      } catch {}
    }, 5000);
    return () => clearInterval(timer);
  }, [live, streamId, setLive]);

  // Lecture HLS.
  useEffect(() => {
    const video = videoRef.current;
    if (!live || !video) return;
    setBuffering(true);
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
    a.download = `${title.replace(/[^\w-]+/g, "_").slice(0, 60)}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
    toast("Capture enregistrée");
  }

  // Raccourcis clavier (hors champs de saisie).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "k") togglePlay();
      else if (k === "m") toggleMute();
      else if (k === "f") toggleFullscreen();
      else if (k === "t") onToggleTheater();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [togglePlay, toggleMute, toggleFullscreen, onToggleTheater]);

  const atEdge = latency === null || latency < 6;
  const upcoming = scheduledAt && new Date(scheduledAt).getTime() > Date.now();

  return (
    <div ref={wrapRef} className={cn("group/player relative aspect-video w-full overflow-hidden bg-black sm:rounded-xl", fullscreen && "rounded-none")}>
      <video
        ref={videoRef}
        muted={muted}
        playsInline
        autoPlay
        className="size-full bg-black"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onPlaying={() => setBuffering(false)}
        onWaiting={() => setBuffering(true)}
        onVolumeChange={(e) => {
          setMuted(e.currentTarget.muted);
          setVolume(e.currentTarget.volume);
        }}
      />

      {/* Réactions flottantes */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {reactions.map((r) => (
          <span
            key={r.id}
            className="absolute bottom-16 animate-float-up text-3xl drop-shadow-lg"
            style={{ left: `${r.left}%`, ["--drift" as string]: `${r.drift}px` }}
          >
            {r.emoji}
          </span>
        ))}
      </div>

      {live ? (
        <>
          {buffering && (
            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
              <Loader2 className="size-10 animate-spin text-white/80" />
            </div>
          )}
          <div className="pointer-events-none absolute top-3 left-3 z-20">
            <LiveBadge />
          </div>
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 z-20 flex items-center gap-1 bg-gradient-to-t from-black/85 to-transparent px-2 pt-10 pb-2 transition-opacity sm:px-3",
              playing ? "opacity-0 group-hover/player:opacity-100 focus-within:opacity-100" : "opacity-100",
            )}
          >
            <button className={ctrl} onClick={togglePlay} aria-label={playing ? "Pause (k)" : "Lecture (k)"}>
              {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
            </button>
            <button className={ctrl} onClick={toggleMute} aria-label="Son (m)">
              {muted || volume === 0 ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              aria-label="Volume"
              className="hidden w-20 accent-white sm:block"
              onChange={(e) => {
                const v = videoRef.current;
                if (!v) return;
                v.volume = Number(e.target.value);
                v.muted = v.volume === 0;
              }}
            />
            <button
              onClick={goLive}
              className="ml-1 inline-flex h-7 items-center gap-1.5 rounded-md bg-white/15 px-2 text-xs font-bold text-white hover:bg-white/25"
              title="Revenir au direct"
            >
              <span className={cn("size-2 rounded-full", atEdge ? "bg-live" : "bg-white/50")} /> DIRECT
            </button>
            {latency !== null && <span className="ml-1 hidden text-xs text-white/70 md:inline">Délai {latency.toFixed(1)} s</span>}
            <span className="flex-1" />
            {onClip && (
              <button className={ctrl} onClick={onClip} aria-label="Créer un clip" title="Créer un clip">
                <Scissors className="size-[18px]" />
              </button>
            )}
            <div className="relative">
              <button className={ctrl} onClick={() => setQualityMenu((o) => !o)} aria-label="Qualité" title="Qualité">
                <Gauge className="size-[18px]" />
              </button>
              {qualityMenu && (
                <div className="absolute right-0 bottom-full mb-2 w-56 animate-pop rounded-lg border border-line bg-panel-2 p-1 shadow-2xl">
                  {QUALITY_OPTIONS.map((q) => (
                    <button
                      key={q.value}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-panel-3"
                      onClick={() => {
                        setQuality(q.value);
                        setQualityMenu(false);
                      }}
                    >
                      <span className="w-4">{quality === q.value && <Check className="size-4 text-brand-hover" />}</span>
                      {q.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className={cn(ctrl, "hidden sm:grid")} onClick={screenshot} aria-label="Capture d'écran" title="Capture">
              <Camera className="size-[18px]" />
            </button>
            <button className={cn(ctrl, "hidden sm:grid")} onClick={pip} aria-label="Picture-in-picture" title="Picture-in-picture">
              <PictureInPicture2 className="size-[18px]" />
            </button>
            <button className={cn(ctrl, "hidden lg:grid")} onClick={onToggleTheater} aria-label="Mode cinéma (t)" title={theater ? "Mode normal" : "Mode cinéma"}>
              <RectangleHorizontal className="size-[18px]" />
            </button>
            <button className={ctrl} onClick={toggleFullscreen} aria-label="Plein écran (f)">
              {fullscreen ? <Minimize className="size-[18px]" /> : <Maximize className="size-[18px]" />}
            </button>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_center,rgba(145,71,255,0.25),transparent_60%)] p-5 text-center">
          <div className="grid size-16 place-items-center rounded-full border border-white/10 bg-white/5 text-white/80">
            <WifiOff className="size-7" />
          </div>
          {upcoming ? (
            <>
              <strong className="text-lg text-white">Direct prévu {formatDateTime(scheduledAt!)}</strong>
              <Countdown to={scheduledAt!} />
            </>
          ) : (
            <strong className="text-lg text-white">Caméra hors ligne</strong>
          )}
          <span className="flex items-center gap-2 text-sm text-white/70">
            <Loader2 className="size-4 animate-spin" /> La vidéo démarrera automatiquement
          </span>
        </div>
      )}
    </div>
  );
}
