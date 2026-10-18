"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, CalendarDays, Eye, MapPin, MessageCircle, PlayCircle, Scissors, Settings, Share2, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTrackViewer } from "@/lib/presence";
import { useUI } from "@/components/UIProvider";
import Avatar from "@/components/Avatar";
import FavoriteButton from "@/components/FavoriteButton";
import FollowButton from "@/components/FollowButton";
import { ClipList, ReplayList, type ClipItem, type ReplayItem } from "@/components/MediaLists";
import { Button, buttonClass, Card, LiveBadge, Pill } from "@/components/ui";
import Tabs from "@/components/ui/Tabs";
import { categoryLabel, cn, formatDate, formatDateTime } from "@/lib/utils";
import Player, { type Reaction } from "./Player";
import Chat, { type Comment } from "./Chat";
import ClipDialog from "./ClipDialog";
import { reportViewers } from "./actions";

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

  // Réactions : diffusées à tous les spectateurs (Supabase Realtime Broadcast, éphémère).
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSent = useRef(0);
  const nextId = useRef(0);

  const spawn = useCallback((emoji: string) => {
    const id = ++nextId.current;
    setReactions((prev) => [...prev.slice(-40), { id, emoji, left: 70 + Math.random() * 25, drift: (Math.random() - 0.5) * 80 }]);
    setTimeout(() => setReactions((prev) => prev.filter((x) => x.id !== id)), 2700);
  }, []);

  useEffect(() => {
    const channel = supabase.channel(`room:${cam.id}`, { config: { broadcast: { self: false } } });
    channel.on("broadcast", { event: "reaction" }, ({ payload }) => {
      // Seuls les émojis prévus sont affichés (le contenu reçu n'est jamais interprété).
      if (typeof payload?.emoji === "string" && REACTIONS.includes(payload.emoji)) spawn(payload.emoji);
    });
    channel.subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, cam.id, spawn]);

  // Statistiques d'audience : un point par minute pendant le direct (validé côté serveur).
  const viewersRef = useRef(viewers);
  viewersRef.current = viewers;
  useEffect(() => {
    if (!live) return;
    const report = () => reportViewers(cam.id, viewersRef.current);
    const first = setTimeout(report, 5000);
    const timer = setInterval(report, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [live, cam.id]);

  function react(emoji: string) {
    const now = Date.now();
    if (now - lastSent.current < 300) return;
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
        toast("Lien copié");
      }
    } catch {}
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
    // Grille nommée : un seul chat, placé sous les infos sur mobile et à droite sur ordinateur.
    <div
      className={cn(
        "-mx-3 -mt-5 grid grid-cols-1 gap-4 [grid-template-areas:'player''info''chat''media'] sm:-mx-5 sm:-mt-7 lg:mx-0 lg:mt-0 lg:gap-x-5",
        !theater &&
          "lg:grid-cols-[minmax(0,1fr)_340px] lg:[grid-template-areas:'player_chat''info_chat''media_chat'] xl:grid-cols-[minmax(0,1fr)_380px]",
      )}
    >
      <div className="min-w-0 [grid-area:player]">
        <Player
          streamId={cam.id}
          title={cam.title}
          initiallyLive={initiallyLive}
          onLiveChange={setLive}
          theater={theater}
          onToggleTheater={toggleTheater}
          reactions={reactions}
          scheduledAt={cam.scheduledAt}
          onClip={live ? startClip : undefined}
        />
      </div>

        <section className="flex min-w-0 flex-col gap-4 px-3 [grid-area:info] sm:px-5 lg:px-0">
          <div className="flex gap-3 sm:gap-4">
            <Link href={`/u/${cam.owner}`} className="relative shrink-0">
              <Avatar name={cam.owner} size="lg" className={cn(live && "ring-2 ring-live ring-offset-2 ring-offset-canvas")} />
              {live && <LiveBadge label="Live" className="absolute -bottom-2 left-1/2 h-5 -translate-x-1/2 px-1.5 text-[10px]" />}
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg leading-snug font-extrabold sm:text-xl">{cam.title}</h1>
              <Link href={`/u/${cam.owner}`} className="font-semibold text-brand-hover hover:underline">
                {cam.owner}
              </Link>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {live ? (
                  <Pill className="bg-live/15 text-live">
                    <Eye className="size-3.5" /> {viewers} spectateur{viewers > 1 ? "s" : ""}
                  </Pill>
                ) : scheduled ? (
                  <Pill className="text-brand-hover">
                    <CalendarClock className="size-3.5" /> <span suppressHydrationWarning>{formatDateTime(scheduled)}</span>
                  </Pill>
                ) : (
                  <Pill>Hors ligne</Pill>
                )}
                <Pill>
                  <Tag className="size-3.5" /> {categoryLabel(cam.category)}
                </Pill>
                {cam.city && (
                  <Pill>
                    <MapPin className="size-3.5" /> {cam.city}
                  </Pill>
                )}
                {cam.event && (
                  <Link href={`/events/${cam.event.id}`}>
                    <Pill className="text-brand-hover hover:bg-line-strong">
                      <CalendarDays className="size-3.5" /> {cam.event.title}
                    </Pill>
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isOwner && (
              <FollowButton userId={cam.owner_id} username={cam.owner} initial={isFollowing} followers={followers} loggedIn={!!currentUserId} />
            )}
            <FavoriteButton streamId={cam.id} initial={isFavorite} count={cam.favorites} loggedIn={!!currentUserId} />
            {live && (
              <Button onClick={startClip}>
                <Scissors className="size-4" /> Clip
              </Button>
            )}
            <Button onClick={share} aria-label="Partager">
              <Share2 className="size-4" /> <span className="hidden sm:inline">Partager</span>
            </Button>
            {!isOwner && currentUserId && (
              <Link href={`/messages/${cam.owner}`} className={buttonClass({ icon: true })} aria-label="Message privé" title="Message privé">
                <MessageCircle className="size-4" />
              </Link>
            )}
            {isOwner && (
              <Link href={`/dashboard?cam=${cam.id}`} className={buttonClass({ variant: "primary" })}>
                <Settings className="size-4" /> Gérer
              </Link>
            )}
            <div className="flex gap-1 sm:ml-auto">
              {REACTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => react(e)}
                  aria-label={`Réagir ${e}`}
                  className="grid size-10 place-items-center rounded-lg bg-panel-3 text-lg transition hover:-translate-y-0.5 hover:bg-line-strong active:scale-90"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </section>

        <Chat
          className={cn(
            "h-[60vh] min-h-96 border-y [grid-area:chat]",
            theater ? "lg:h-[520px]" : "lg:sticky lg:top-[4.75rem] lg:h-[calc(100dvh-6.5rem)] lg:self-start",
          )}
          streamId={cam.id}
          ownerId={cam.owner_id}
          initialComments={comments}
          currentUserId={currentUserId}
          isOwner={isOwner}
          isBanned={isBanned}
          viewers={viewers}
        />

        <div className="flex min-w-0 flex-col gap-4 px-3 pb-4 [grid-area:media] sm:px-5 lg:px-0">
          <Card className="p-4 sm:p-5">
            <h2 className="mb-2 font-bold">À propos</h2>
            {cam.description ? (
              <p className="text-sm whitespace-pre-wrap text-ink-muted">{cam.description}</p>
            ) : (
              <p className="text-sm text-ink-dim">Pas de description.</p>
            )}
            <p className="mt-3 text-xs text-ink-dim">Caméra créée le {formatDate(cam.created_at)}</p>
          </Card>

          <Card>
            <div className="border-b border-line p-3">
              <Tabs
                value={mediaTab}
                onChange={setMediaTab}
                items={[
                  { value: "clips", label: "Clips", icon: <Scissors className="size-4" />, count: clips.length },
                  { value: "replays", label: "Replays", icon: <PlayCircle className="size-4" />, count: replays.length },
                ]}
              />
            </div>
            <div className="p-4 sm:p-5">
              {mediaTab === "clips" ? (
                <ClipList clips={clips} empty="Aucun clip. Pendant un direct, clique sur « Clip » pour garder un moment fort." />
              ) : (
                <ReplayList replays={replays} empty="Les directs terminés apparaîtront ici." />
              )}
            </div>
          </Card>
        </div>

      {clipping && <ClipDialog streamId={cam.id} streamTitle={cam.title} onClose={() => setClipping(false)} />}
    </div>
  );
}
