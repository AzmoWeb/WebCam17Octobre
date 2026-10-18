import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Clock, Download, Radio, Scissors, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ActionButton from "@/components/ActionButton";
import Avatar from "@/components/Avatar";
import RecordedVideo from "@/components/RecordedVideo";
import ShareButton from "@/components/ShareButton";
import { Badge, buttonClass, Card } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { deleteClip } from "@/app/cam/[id]/actions";

type Params = { params: Promise<{ id: string }> };

type Row = {
  id: string;
  title: string;
  duration: number;
  start_at: string;
  creator_id: string;
  creator: { username: string } | null;
  stream: { id: string; title: string; owner_id: string } | null;
};

async function loadClip(id: string) {
  if (!z.string().uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("clips")
    .select("id, title, duration, start_at, creator_id, creator:profiles!creator_id(username), stream:streams(id, title, owner_id)")
    .eq("id", id)
    .maybeSingle();
  return data as unknown as Row | null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const clip = await loadClip((await params).id);
  return { title: clip ? `Clip : ${clip.title}` : "Clip introuvable" };
}

export default async function ClipPage({ params }: Params) {
  const clip = await loadClip((await params).id);
  if (!clip) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canDelete = !!user && (user.id === clip.creator_id || user.id === clip.stream?.owner_id);
  const creator = clip.creator?.username ?? "inconnu";

  return (
    <div className="mx-auto -mx-3 -mt-5 flex max-w-5xl flex-col gap-5 sm:mx-auto sm:mt-0">
      <RecordedVideo src={`/api/clips/${clip.id}/video`} autoPlay />
      <Card className="mx-3 flex flex-col gap-4 p-4 sm:mx-0 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <Badge tone="brand" className="self-start">
              <Scissors className="size-3" /> Clip
            </Badge>
            <h1 className="text-xl font-extrabold sm:text-2xl">{clip.title}</h1>
            <div className="flex flex-wrap gap-x-4 text-sm text-ink-dim">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" /> {clip.duration} s
              </span>
              <span>Moment du {formatDateTime(clip.start_at)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ShareButton title={clip.title} />
            <a href={`/api/clips/${clip.id}/video?download`} className={buttonClass()}>
              <Download className="size-4" /> Télécharger
            </a>
            {canDelete && (
              <ActionButton
                action={deleteClip}
                fields={{ id: clip.id }}
                variant="danger"
                size="md"
                icon
                title="Supprimer le clip"
                confirm={{ title: "Supprimer ce clip ?", confirmLabel: "Supprimer", danger: true }}
                redirectTo={clip.stream ? `/cam/${clip.stream.id}` : "/"}
              >
                <Trash2 className="size-4" />
              </ActionButton>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <Avatar name={creator} />
          <div className="min-w-0 flex-1 text-sm">
            <div>
              Clip créé par{" "}
              <Link href={`/u/${creator}`} className="font-bold text-brand-hover hover:underline">
                {creator}
              </Link>
            </div>
            {clip.stream && <div className="truncate text-ink-dim">depuis « {clip.stream.title} »</div>}
          </div>
          {clip.stream && (
            <Link href={`/cam/${clip.stream.id}`} className={buttonClass({ variant: "primary" })}>
              <Radio className="size-4" /> Voir la caméra
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
