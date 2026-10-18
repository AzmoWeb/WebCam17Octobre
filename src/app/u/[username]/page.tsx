import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Heart, MessageCircle, PlayCircle, Scissors, Settings, Users, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStreamSummaries } from "@/lib/streams";
import { username as usernameSchema } from "@/lib/validation";
import { formatDate, gradientFor } from "@/lib/utils";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";
import { ClipList, ReplayList, type ClipItem, type ReplayItem } from "@/components/MediaLists";
import { Badge, buttonClass, Card, LiveBadge, SectionTitle } from "@/components/ui";
import ProfileStreams from "./ProfileStreams";

type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const name = usernameSchema.safeParse(decodeURIComponent((await params).username));
  return { title: name.success ? name.data : "Profil introuvable" };
}

export default async function ProfilePage({ params }: Params) {
  const name = usernameSchema.safeParse(decodeURIComponent((await params).username));
  if (!name.success) notFound();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, bio, created_at, role, is_banned")
    .eq("username", name.data)
    .maybeSingle();
  if (!profile) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const streams = await getStreamSummaries({ ownerId: profile.id });
  const streamIds = streams.map((s) => s.id);
  const none = Promise.resolve({ data: null });

  const [followers, following, isFollowing, clips, replays] = await Promise.all([
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("followed_id", profile.id),
    supabase.from("follows").select("followed_id", { count: "exact", head: true }).eq("follower_id", profile.id),
    user ? supabase.from("follows").select("followed_id").eq("follower_id", user.id).eq("followed_id", profile.id).maybeSingle() : none,
    supabase
      .from("clips")
      .select("id, title, duration, created_at, creator:profiles!creator_id(username), stream:streams(title)")
      .eq("creator_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(12),
    streamIds.length
      ? supabase
          .from("broadcasts")
          .select("id, started_at, ended_at, peak_viewers, stream:streams(title)")
          .in("stream_id", streamIds)
          .not("ended_at", "is", null)
          .order("started_at", { ascending: false })
          .limit(12)
      : none,
  ]);

  const isMe = user?.id === profile.id;
  const live = streams.some((s) => s.live);
  const totalFavs = streams.reduce((n, s) => n + s.favorites, 0);

  type ClipRow = Omit<ClipItem, "creator" | "streamTitle"> & { creator: { username: string } | null; stream: { title: string } | null };
  const clipItems: ClipItem[] = ((clips.data ?? []) as unknown as ClipRow[]).map((c) => ({
    id: c.id,
    title: c.title,
    duration: c.duration,
    created_at: c.created_at,
    creator: c.creator?.username ?? "inconnu",
    streamTitle: c.stream?.title,
  }));
  type ReplayRow = Omit<ReplayItem, "streamTitle"> & { stream: { title: string } | null };
  const replayItems: ReplayItem[] = ((replays.data ?? []) as unknown as ReplayRow[]).map((r) => ({
    id: r.id,
    started_at: r.started_at,
    ended_at: r.ended_at,
    peak_viewers: r.peak_viewers,
    streamTitle: r.stream?.title,
  }));

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="h-32 rounded-2xl sm:h-44" style={{ background: gradientFor(profile.username) }} />
        <div className="-mt-12 flex flex-col gap-4 px-2 sm:-mt-14 sm:flex-row sm:items-end sm:px-6">
          <Avatar name={profile.username} size="xl" className="border-4 border-canvas" />
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold sm:text-3xl">{profile.username}</h1>
              {live && <LiveBadge />}
              {profile.role !== "user" && <Badge tone="brand">{profile.role}</Badge>}
              {profile.is_banned && <Badge tone="danger">Compte suspendu</Badge>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-dim">
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-4" /> <strong className="text-ink">{followers.count ?? 0}</strong> abonnés ·{" "}
                <strong className="text-ink">{following.count ?? 0}</strong> abonnements
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Video className="size-4" /> {streams.length} caméra{streams.length > 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Heart className="size-4" /> {totalFavs}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-4" /> Depuis le {formatDate(profile.created_at)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:pb-1">
            {isMe ? (
              <>
                <Link href="/settings" className={buttonClass()}>
                  <Settings className="size-4" /> Modifier
                </Link>
                <Link href="/dashboard" className={buttonClass({ variant: "primary" })}>
                  <Video className="size-4" /> Studio
                </Link>
              </>
            ) : (
              <>
                {user && (
                  <Link href={`/messages/${profile.username}`} className={buttonClass()}>
                    <MessageCircle className="size-4" /> Message
                  </Link>
                )}
                <FollowButton userId={profile.id} username={profile.username} initial={!!isFollowing.data} loggedIn={!!user} />
              </>
            )}
          </div>
        </div>
      </section>

      {profile.bio ? (
        <Card className="p-4 text-sm whitespace-pre-wrap text-ink-muted sm:p-5">{profile.bio}</Card>
      ) : (
        isMe && (
          <p className="text-sm text-ink-dim">
            Pas encore de bio.{" "}
            <Link href="/settings" className="font-semibold text-brand-hover">
              Ajoute-en une
            </Link>
            .
          </p>
        )
      )}

      <section className="flex flex-col gap-4">
        <SectionTitle icon={<Video className="size-5" />}>Caméras</SectionTitle>
        <ProfileStreams streams={streams} loggedIn={!!user} />
      </section>

      {replayItems.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionTitle icon={<PlayCircle className="size-5" />}>Derniers replays</SectionTitle>
          <ReplayList replays={replayItems} />
        </section>
      )}

      {clipItems.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionTitle icon={<Scissors className="size-5" />}>Clips créés</SectionTitle>
          <ClipList clips={clipItems} />
        </section>
      )}
    </div>
  );
}
