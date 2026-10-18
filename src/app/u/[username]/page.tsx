import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Heart, Radio, Settings, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStreamSummaries } from "@/lib/streams";
import { formatDate, gradientFor } from "@/lib/utils";
import Avatar from "@/components/Avatar";
import ProfileStreams from "./ProfileStreams";

type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: `@${decodeURIComponent((await params).username)}` };
}

export default async function ProfilePage({ params }: Params) {
  const username = decodeURIComponent((await params).username);
  if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) notFound();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, bio, created_at")
    .eq("username", username)
    .maybeSingle();
  if (!profile) notFound();

  const [
    streams,
    {
      data: { user },
    },
  ] = await Promise.all([getStreamSummaries({ ownerId: profile.id }), supabase.auth.getUser()]);
  const isMe = user?.id === profile.id;
  const liveCount = streams.filter((s) => s.live).length;
  const totalFavs = streams.reduce((n, s) => n + s.favorites, 0);

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
                <Calendar size={14} /> Membre depuis le {formatDate(profile.created_at)}
              </span>
              <span className="row" style={{ gap: 6 }}>
                <Video size={14} /> {streams.length} caméra{streams.length > 1 ? "s" : ""}
              </span>
              <span className="row" style={{ gap: 6 }}>
                <Heart size={14} /> {totalFavs} favori{totalFavs > 1 ? "s" : ""}
              </span>
              {liveCount > 0 && (
                <span className="badge badge-live">
                  <Radio size={12} /> EN DIRECT
                </span>
              )}
            </div>
          </div>
          {isMe && (
            <div className="row" style={{ paddingBottom: 6, marginRight: 4 }}>
              <Link href="/settings" className="btn">
                <Settings size={16} /> Modifier le profil
              </Link>
              <Link href="/dashboard" className="btn btn-primary">
                <Video size={16} /> Studio
              </Link>
            </div>
          )}
        </div>
      </div>

      {profile.bio ? (
        <p className="card card-body description">{profile.bio}</p>
      ) : (
        isMe && (
          <p className="muted">
            Tu n&apos;as pas encore de bio. <Link href="/settings" style={{ color: "var(--accent)" }}>Ajoute-en une</Link>.
          </p>
        )
      )}

      <h2 className="section-title">
        <Video size={20} /> Caméras
      </h2>
      <ProfileStreams streams={streams} loggedIn={!!user} />
    </div>
  );
}
