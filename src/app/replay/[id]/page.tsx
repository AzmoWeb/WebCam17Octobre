import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CalendarDays, Film, PlayCircle, Radio, Trash2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ActionButton from "@/components/ActionButton";
import Avatar from "@/components/Avatar";
import ShareButton from "@/components/ShareButton";
import { Badge, buttonClass, Card } from "@/components/ui";
import { formatDateTime, formatDuration, secondsBetween } from "@/lib/utils";
import { deleteReplay } from "@/app/cam/[id]/actions";
import ReplayPlayer from "./ReplayPlayer";

type Params = { params: Promise<{ id: string }> };

type Row = {
  id: string;
  started_at: string;
  ended_at: string | null;
  peak_viewers: number;
  stream: { id: string; title: string; owner_id: string; disabled: boolean; owner: { username: string } | null } | null;
};

async function loadReplay(id: string) {
  if (!z.string().uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("broadcasts")
    .select("id, started_at, ended_at, peak_viewers, stream:streams(id, title, owner_id, disabled, owner:profiles!owner_id(username))")
    .eq("id", id)
    .maybeSingle();
  return data as unknown as Row | null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const r = await loadReplay((await params).id);
  return { title: r?.stream ? `Replay : ${r.stream.title}` : "Replay introuvable" };
}

export default async function ReplayPage({ params }: Params) {
  const replay = await loadReplay((await params).id);
  if (!replay?.ended_at || !replay.stream || replay.stream.disabled) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const stream = replay.stream;
  const owner = stream.owner?.username ?? "inconnu";
  const duration = secondsBetween(replay.started_at, replay.ended_at);

  return (
    <div className="mx-auto -mx-3 -mt-5 flex max-w-5xl flex-col gap-5 sm:mx-auto sm:mt-0">
      <ReplayPlayer id={replay.id} duration={duration} />
      <Card className="mx-3 flex flex-col gap-4 p-4 sm:mx-0 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <Badge tone="brand" className="self-start">
              <PlayCircle className="size-3" /> Replay
            </Badge>
            <h1 className="text-xl font-extrabold sm:text-2xl">{stream.title}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-dim">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" /> {formatDateTime(replay.started_at)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Film className="size-3.5" /> {formatDuration(duration)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-3.5" /> pic de {replay.peak_viewers} spectateurs
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <ShareButton title={`Replay : ${stream.title}`} />
            {user?.id === stream.owner_id && (
              <ActionButton
                action={deleteReplay}
                fields={{ id: replay.id }}
                variant="danger"
                size="md"
                icon
                title="Retirer ce replay"
                confirm={{
                  title: "Retirer ce replay ?",
                  message: "Il ne sera plus listé. Les fichiers sont effacés du serveur à expiration.",
                  confirmLabel: "Retirer",
                  danger: true,
                }}
                redirectTo={`/cam/${stream.id}`}
              >
                <Trash2 className="size-4" />
              </ActionButton>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-line pt-4">
          <Avatar name={owner} />
          <Link href={`/u/${owner}`} className="flex-1 font-bold hover:text-brand-hover">
            {owner}
          </Link>
          <Link href={`/cam/${stream.id}`} className={buttonClass({ variant: "primary" })}>
            <Radio className="size-4" /> Voir la caméra
          </Link>
        </div>
      </Card>
    </div>
  );
}
