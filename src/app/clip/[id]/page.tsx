import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Clock, Download, Radio, Scissors, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ActionButton from "@/components/ActionButton";
import Avatar from "@/components/Avatar";
import RecordedVideo from "@/components/RecordedVideo";
import ShareButton from "@/components/ShareButton";
import { formatDateTime } from "@/lib/utils";
import { deleteClip } from "@/app/cam/[id]/actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Params = { params: Promise<{ id: string }> };

type Row = {
  id: string;
  title: string;
  duration: number;
  start_at: string;
  created_at: string;
  creator_id: string;
  creator: { username: string } | null;
  stream: { id: string; title: string; owner_id: string } | null;
};

async function loadClip(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("clips")
    .select("id, title, duration, start_at, created_at, creator_id, creator:profiles!creator_id(username), stream:streams(id, title, owner_id)")
    .eq("id", id)
    .maybeSingle();
  return data as unknown as Row | null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const clip = await loadClip((await params).id);
  return { title: clip ? `Clip : ${clip.title}` : "Clip introuvable" };
}

export default async function ClipPage({ params }: Params) {
  const { id } = await params;
  const clip = await loadClip(id);
  if (!clip) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canDelete = !!user && (user.id === clip.creator_id || user.id === clip.stream?.owner_id);
  const creator = clip.creator?.username ?? "inconnu";

  async function afterDelete() {
    "use server";
    redirect(clip?.stream ? `/cam/${clip.stream.id}` : "/");
  }

  return (
    <div className="stack-lg" style={{ maxWidth: 980, margin: "0 auto" }}>
      <RecordedVideo src={`/api/clips/${clip.id}/video`} autoPlay />
      <div className="card card-body stack">
        <div className="row between" style={{ alignItems: "flex-start" }}>
          <div className="stack" style={{ gap: 8 }}>
            <span className="badge badge-accent" style={{ alignSelf: "flex-start" }}>
              <Scissors size={12} /> CLIP
            </span>
            <h1 className="cam-title">{clip.title}</h1>
            <div className="row muted small" style={{ gap: 14 }}>
              <span className="row" style={{ gap: 6 }}>
                <Clock size={14} /> {clip.duration} s
              </span>
              <span>Moment du {formatDateTime(clip.start_at)}</span>
            </div>
          </div>
          <div className="row">
            <ShareButton title={clip.title} />
            <a href={`/api/clips/${clip.id}/video?download`} className="btn">
              <Download size={16} /> Télécharger
            </a>
            {canDelete && (
              <ActionButton
                action={deleteClip}
                fields={{ id: clip.id }}
                className="btn btn-danger btn-icon"
                title="Supprimer le clip"
                confirm={{ title: "Supprimer ce clip ?", confirmLabel: "Supprimer", danger: true }}
                onDone={afterDelete}
              >
                <Trash2 size={16} />
              </ActionButton>
            )}
          </div>
        </div>
        <div className="owner-row">
          <Avatar name={creator} size={40} />
          <div className="grow">
            <div>
              Clip créé par{" "}
              <Link href={`/u/${creator}`} style={{ fontWeight: 700 }}>
                @{creator}
              </Link>
            </div>
            {clip.stream && <div className="muted small">depuis la caméra « {clip.stream.title} »</div>}
          </div>
          {clip.stream && (
            <Link href={`/cam/${clip.stream.id}`} className="btn btn-primary">
              <Radio size={16} /> Voir la caméra
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
