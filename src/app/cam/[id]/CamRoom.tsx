"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CalendarClock,
  CalendarDays,
  Eye,
  MapPin,
  MessageCircle,
  PlayCircle,
  RectangleHorizontal,
  Scissors,
  Settings,
  Share2,
  Tag,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTrackViewer } from "@/lib/presence";
import { useUI } from "@/components/UIProvider";
import Avatar from "@/components/Avatar";
import FavoriteButton from "@/components/FavoriteButton";
import FollowButton from "@/components/FollowButton";
import { ClipList, ReplayList, type ClipItem, type ReplayItem } from "@/components/MediaLists";
import { categoryLabel, cn, formatDate, formatDateTime } from "@/lib/utils";
import Player, { type Reaction } from "./Player";
import Chat, { type Comment } from "./Chat";
import ClipDialog from "./ClipDialog";

export type CamInfo = {
  id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  created_at: string;
  owner_id: string;
  owner: string;
  favorites: number;
  scheduledAt: string | null;
  event: { id: string; title: string } | null;
};

type Props = {
  cam: CamInfo;
  initiallyLive: boolean;
  comments: Comment[];
  currentUserId: string | null;
  isFavorite: boolean;
  isBanned: boolean;
  isFollowing: boolean;
  followers: number;
  clips: ClipItem[];
  replays: ReplayItem[];
};

const REACTIONS = ["❤️", "🔥", "👏", "✊", "😮", "😂"];

export default function CamRoom(props: Props) {
  const { cam, initiallyLive, comments, currentUserId, isFavorite, isBanned, isFollowing, followers, clips, replays } = props;
  const router = useRouter();
  const { toast } = useUI();
  const viewers = useTrackViewer(cam.id);
  const [live, setLive] = useState(initiallyLive);
  const [theater, setTheater] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [clipping, setClipping] = useState(false);
  const [mediaTab, setMediaTab] = useState<"clips" | "replays">("clips");
  const isOwner = currentUserId === cam.owner_id;

  // Réactions : diffusées à tous les spectateurs via Supabase Realtime Broadcast.
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSent = useRef(0);
  const nextId = useRef(0);

  const spawn = useCallback((emoji: string) => {
    const id = ++nextId.current;
    const r = { id, emoji, left: 70 + Math.random() * 25, drift: (Math.random() - 0.5) * 80 };
    setReactions((prev) => [...prev.slice(-40), r]);
    setTimeout(() => setReactions((prev) => prev.filter((x) => x.id !== id)), 2700);
  }, []);

  useEffect(() => {
    const channel = supabase.channel(`room:${cam.id}`, { config: { broadcast: { self: false } } });
    channel.on("broadcast", { event: "reaction" }, ({ payload }) => {
      if (REACTIONS.includes(payload?.emoji)) spawn(payload.emoji);
    });
    channel.subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, cam.id, spawn]);

  // Statistiques d'audience : pic de spectateurs + un point par minute pendant le direct.
  const viewersRef = useRef(viewers);
  viewersRef.current = viewers;
  useEffect(() => {
    if (!live) return;
    const report = () => supabase.rpc("report_viewers", { p_stream: cam.id, p_viewers: viewersRef.current });
    const first = setTimeout(report, 5000);
    const timer = setInterval(report, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [live, supabase, cam.id]);

  function react(emoji: string) {
    const now = Date.now();
    if (now - lastSent.current < 250) return; // anti-spam
    lastSent.current = now;
    spawn(emoji);
    channelRef.current?.send({ type: "broadcast", event: "reaction", payload: { emoji } });
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: cam.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Lien copié dans le presse-papiers");
      }
    } catch {
      // Partage annulé.
    }
  }

  function startClip() {
    if (!currentUserId) {
      toast("Connecte-toi pour créer un clip.", "info");
      return router.push("/login");
    }
    setClipping(true);
  }

  const toggleTheater = useCallback(() => setTheater((t) => !t), []);
  const scheduled = cam.scheduledAt && new Date(cam.scheduledAt).getTime() > Date.now() ? cam.scheduledAt : null;

  return (
    <div className={cn("cam-layout", theater && "theater")}>
      <div className="stack-lg" style={{ gap: 16, minWidth: 0 }}>
        <Player
          streamId={cam.id}
          title={cam.title}
          initiallyLive={initiallyLive}
          onLiveChange={setLive}
          theater={theater}
          onToggleTheater={toggleTheater}
          reactions={reactions}
          scheduledAt={cam.scheduledAt}
          onClip={startClip}
        />

        <div className="card cam-info">
          <div className="row between" style={{ alignItems: "flex-start", gap: 16 }}>
            <div className="grow stack" style={{ gap: 10 }}>
              <h1 className="cam-title">{cam.title}</h1>
              <div className="row">
                {live ? (
                  <span className="stat-pill live">
                    <span className="live-dot on" /> En direct
                  </span>
                ) : scheduled ? (
                  <span className="stat-pill" style={{ color: "var(--accent)" }}>
                    <CalendarClock size={14} /> Prévu {formatDateTime(scheduled)}
                  </span>
                ) : (
                  <span className="stat-pill">
                    <span className="live-dot" /> Hors ligne
                  </span>
                )}
                <span className="stat-pill">
                  <Eye size={14} /> {viewers} {viewers > 1 ? "spectateurs" : "spectateur"}
                </span>
                <span className="stat-pill">
                  <Tag size={14} /> {categoryLabel(cam.category)}
                </span>
                {cam.city && (
                  <span className="stat-pill">
                    <MapPin size={14} /> {cam.city}
                  </span>
                )}
                {cam.event && (
                  <Link href={`/events/${cam.event.id}`} className="stat-pill" style={{ color: "var(--accent)" }}>
                    <CalendarDays size={14} /> {cam.event.title}
                  </Link>
                )}
              </div>
            </div>

            <div className="row">
              <FavoriteButton streamId={cam.id} initial={isFavorite} count={cam.favorites} loggedIn={!!currentUserId} />
              {live && (
                <button className="btn" onClick={startClip} title="Clip des dernières secondes">
                  <Scissors size={16} /> Clip
                </button>
              )}
              <button className="btn" onClick={share}>
                <Share2 size={16} /> Partager
              </button>
              <button className={cn("btn btn-icon", theater && "active")} onClick={toggleTheater} title="Mode cinéma (t)">
                <RectangleHorizontal size={16} />
              </button>
              {isOwner && (
                <Link href={`/dashboard?cam=${cam.id}`} className="btn btn-primary">
                  <Settings size={16} /> Gérer
                </Link>
              )}
            </div>
          </div>

          <div className="row" style={{ marginTop: 16 }}>
            <span className="muted small" style={{ marginRight: 4 }}>
              Réagir :
            </span>
            <div className="reaction-bar">
              {REACTIONS.map((e) => (
                <button key={e} className="reaction-btn" onClick={() => react(e)} aria-label={`Réagir ${e}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="owner-row">
            <Link href={`/u/${cam.owner}`}>
              <Avatar name={cam.owner} size={44} />
            </Link>
            <div className="grow">
              <Link href={`/u/${cam.owner}`} style={{ fontWeight: 700 }}>
                @{cam.owner}
              </Link>
              <div className="muted small row" style={{ gap: 6 }}>
                <Calendar size={13} /> Caméra créée le {formatDate(cam.created_at)}
              </div>
            </div>
            {!isOwner && (
              <>
                {currentUserId && (
                  <Link href={`/messages/${cam.owner}`} className="btn btn-sm" title="Message privé">
                    <MessageCircle size={14} /> Message
                  </Link>
                )}
                <FollowButton
                  userId={cam.owner_id}
                  username={cam.owner}
                  initial={isFollowing}
                  followers={followers}
                  loggedIn={!!currentUserId}
                  small
                />
              </>
            )}
          </div>

          {cam.description && (
            <p className="description" style={{ marginTop: 16 }}>
              {cam.description}
            </p>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="tabs">
              <button className={cn("tab", mediaTab === "clips" && "active")} onClick={() => setMediaTab("clips")}>
                <Scissors size={14} /> Clips <span className="count">{clips.length}</span>
              </button>
              <button className={cn("tab", mediaTab === "replays" && "active")} onClick={() => setMediaTab("replays")}>
                <PlayCircle size={14} /> Replays <span className="count">{replays.length}</span>
              </button>
            </div>
          </div>
          <div className="card-body">
            {mediaTab === "clips" ? (
              <ClipList clips={clips} empty="Aucun clip. Pendant un direct, clique sur « Clip » pour garder un moment fort." />
            ) : (
              <ReplayList replays={replays} empty="Les directs terminés apparaîtront ici." />
            )}
          </div>
        </div>
      </div>

      <Chat
        streamId={cam.id}
        ownerId={cam.owner_id}
        initialComments={comments}
        currentUserId={currentUserId}
        isOwner={isOwner}
        isBanned={isBanned}
        viewers={viewers}
      />

      {clipping && <ClipDialog streamId={cam.id} streamTitle={cam.title} onClose={() => setClipping(false)} />}
    </div>
  );
}
