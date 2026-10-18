"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Calendar, Eye, MapPin, RectangleHorizontal, Settings, Share2, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTrackViewer } from "@/lib/presence";
import { useUI } from "@/components/UIProvider";
import Avatar from "@/components/Avatar";
import FavoriteButton from "@/components/FavoriteButton";
import { categoryLabel, cn, formatDate } from "@/lib/utils";
import Player, { type Reaction } from "./Player";
import Chat, { type Comment } from "./Chat";

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
};

type Props = {
  cam: CamInfo;
  initiallyLive: boolean;
  comments: Comment[];
  currentUserId: string | null;
  isFavorite: boolean;
  isBanned: boolean;
};

const REACTIONS = ["❤️", "🔥", "👏", "✊", "😮", "😂"];

export default function CamRoom({ cam, initiallyLive, comments, currentUserId, isFavorite, isBanned }: Props) {
  const { toast } = useUI();
  const viewers = useTrackViewer(cam.id);
  const [live, setLive] = useState(initiallyLive);
  const [theater, setTheater] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
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

  const toggleTheater = useCallback(() => setTheater((t) => !t), []);

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
              </div>
            </div>

            <div className="row">
              <FavoriteButton streamId={cam.id} initial={isFavorite} count={cam.favorites} loggedIn={!!currentUserId} />
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
            <Link href={`/u/${cam.owner}`} className="btn btn-sm">
              Voir le profil
            </Link>
          </div>

          {cam.description && (
            <p className="description" style={{ marginTop: 16 }}>
              {cam.description}
            </p>
          )}
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
    </div>
  );
}
