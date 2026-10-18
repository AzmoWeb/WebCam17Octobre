import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, Film, PlayCircle, Radio, Trash2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ActionButton from "@/components/ActionButton";
import Avatar from "@/components/Avatar";
import ShareButton from "@/components/ShareButton";
import { formatDateTime, formatDuration, secondsBetween } from "@/lib/utils";
import { deleteReplay } from "@/app/cam/[id]/actions";
import ReplayPlayer from "./ReplayPlayer";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Params = { params: Promise<{ id: string }> };

type Row = {
  id: string;
  started_at: string;
  ended_at: string | null;
  peak_viewers: number;
  stream: { id: string; title: string; owner_id: string; owner: { username: string } | null } | null;
};

async function loadReplay(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("broadcasts")
    .select("id, started_at, ended_at, peak_viewers, stream:streams(id, title, owner_id, owner:profiles!owner_id(username))")
    .eq("id", id)
    .maybeSingle();
  return data as unknown as Row | null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const r = await loadReplay((await params).id);
  return { title: r?.stream ? `Replay : ${r.stream.title}` : "Replay introuvable" };
}

export default async function ReplayPage({ params }: Params) {
  const { id } = await params;
  const replay = await loadReplay(id);
  if (!replay?.ended_at || !replay.stream) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const stream = replay.stream;
  const owner = stream.owner?.username ?? "inconnu";
  const duration = secondsBetween(replay.started_at, replay.ended_at);

  async function afterDelete() {
    "use server";
    redirect(`/cam/${stream.id}`);
  }

  return (
    <div className="stack-lg" style={{ maxWidth: 1080, margin: "0 auto" }}>
      <ReplayPlayer id={replay.id} duration={duration} />
      <div className="card card-body stack">
        <div className="row between" style={{ alignItems: "flex-start" }}>
          <div className="stack" style={{ gap: 8 }}>
            <span className="badge badge-accent" style={{ alignSelf: "flex-start" }}>
              <PlayCircle size={12} /> REPLAY
            </span>
            <h1 className="cam-title">{stream.title}</h1>
            <div className="row muted small" style={{ gap: 14 }}>
              <span className="row" style={{ gap: 6 }}>
                <CalendarDays size={14} /> {formatDateTime(replay.started_at)}
              </span>
              <span className="row" style={{ gap: 6 }}>
                <Film size={14} /> {formatDuration(duration)}
              </span>
              <span className="row" style={{ gap: 6 }}>
                <Users size={14} /> pic de {replay.peak_viewers} spectateurs
              </span>
            </div>
          </div>
          <div className="row">
            <ShareButton title={`Replay : ${stream.title}`} />
            {user?.id === stream.owner_id && (
              <ActionButton
                action={deleteReplay}
                fields={{ id: replay.id }}
                className="btn btn-danger btn-icon"
                title="Retirer ce replay"
                confirm={{
                  title: "Retirer ce replay ?",
                  message: "Il ne sera plus listé sur ta caméra. Les fichiers sont effacés du serveur à expiration.",
                  confirmLabel: "Retirer",
                  danger: true,
                }}
                onDone={afterDelete}
              >
                <Trash2 size={16} />
              </ActionButton>
            )}
          </div>
        </div>
        <div className="owner-row">
          <Avatar name={owner} size={40} />
          <div className="grow">
            <Link href={`/u/${owner}`} style={{ fontWeight: 700 }}>
              @{owner}
            </Link>
          </div>
          <Link href={`/cam/${stream.id}`} className="btn btn-primary">
            <Radio size={16} /> Voir la caméra
          </Link>
        </div>
      </div>
    </div>
  );
}
