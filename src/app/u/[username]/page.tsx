import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Heart, MessageCircle, PlayCircle, Radio, Scissors, Settings, ShieldAlert, Users, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStreamSummaries } from "@/lib/streams";
import { formatDate, gradientFor } from "@/lib/utils";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";
import { ClipList, ReplayList, type ClipItem, type ReplayItem } from "@/components/MediaLists";
import ProfileStreams from "./ProfileStreams";

type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: `@${decodeURIComponent((await params).username)}` };
}

export default async function ProfilePage({ params }: Params) {
  const username = decodeURIComponent((await params).username);
  if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) notFound();

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
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
  const liveCount = streams.filter((s) => s.live).length;
  const totalFavs = streams.reduce((n, s) => n + s.favorites, 0);

  type ClipRow = Omit<ClipItem, "creator" | "streamTitle"> & { creator: { username: string } | null; stream: { title: string } | null };
  const clipItems: ClipItem[] = ((clips.data ?? []) as unknown as ClipRow[]).map((c) => ({
    ...c,
    creator: c.creator?.username ?? "inconnu",
    streamTitle: c.stream?.title,
  }));
  type ReplayRow = Omit<ReplayItem, "streamTitle"> & { stream: { title: string } | null };
  const replayItems: ReplayItem[] = ((replays.data ?? []) as unknown as ReplayRow[]).map((r) => ({
    ...r,
    streamTitle: r.stream?.title,
  }));

  return (
    <div className="stack-lg">
      <div>
        <div className="profile-banner" style={{ background: gradientFor(profile.username) }} />
        <div className="profile-head">
          <Avatar name={profile.username} size={112} />
          <div className="grow stack" style={{ gap: 6, paddingBottom: 6 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800 }}>@{profile.username}</h1>
            <div className="row muted small" style={{ gap: 14 }}>
              <span className="row" style={{ gap: 6 }}>
                <Users size={14} /> <strong style={{ color: "var(--text)" }}>{followers.count ?? 0}</strong> abonnés ·{" "}
                <strong style={{ color: "var(--text)" }}>{following.count ?? 0}</strong> abonnements
              </span>
              <span className="row" style={{ gap: 6 }}>
                <Video size={14} /> {streams.length} caméra{streams.length > 1 ? "s" : ""}
              </span>
              <span className="row" style={{ gap: 6 }}>
                <Heart size={14} /> {totalFavs}
              </span>
              <span className="row" style={{ gap: 6 }}>
                <Calendar size={14} /> Membre depuis le {formatDate(profile.created_at)}
              </span>
              {liveCount > 0 && (
                <span className="badge badge-live">
                  <Radio size={12} /> EN DIRECT
                </span>
              )}
              {profile.is_banned && (
                <span className="badge badge-warning">
                  <ShieldAlert size={12} /> Compte suspendu
                </span>
              )}
            </div>
          </div>
          <div className="row" style={{ paddingBottom: 6, marginRight: 4 }}>
            {isMe ? (
              <>
                <Link href="/settings" className="btn">
                  <Settings size={16} /> Modifier le profil
                </Link>
                <Link href="/dashboard" className="btn btn-primary">
                  <Video size={16} /> Studio
                </Link>
              </>
            ) : (
              <>
                {user && (
                  <Link href={`/messages/${profile.username}`} className="btn">
                    <MessageCircle size={16} /> Message
                  </Link>
                )}
                <FollowButton userId={profile.id} username={profile.username} initial={!!isFollowing.data} loggedIn={!!user} />
              </>
            )}
          </div>
        </div>
      </div>

      {profile.bio ? (
        <p className="card card-body description">{profile.bio}</p>
      ) : (
        isMe && (
          <p className="muted">
            Tu n&apos;as pas encore de bio.{" "}
            <Link href="/settings" style={{ color: "var(--accent)" }}>
              Ajoute-en une
            </Link>
            .
          </p>
        )
      )}

      <h2 className="section-title">
        <Video size={20} /> Caméras
      </h2>
      <ProfileStreams streams={streams} loggedIn={!!user} />

      {replayItems.length > 0 && (
        <>
          <h2 className="section-title">
            <PlayCircle size={20} /> Derniers replays
          </h2>
          <ReplayList replays={replayItems} />
        </>
      )}

      {clipItems.length > 0 && (
        <>
          <h2 className="section-title">
            <Scissors size={20} /> Clips créés
          </h2>
          <ClipList clips={clipItems} />
        </>
      )}
    </div>
  );
}
