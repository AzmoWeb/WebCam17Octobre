"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  CalendarClock,
  ExternalLink,
  Eye,
  Flag,
  Heart,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Trash2,
  UserCheck,
  Video,
} from "lucide-react";
import ActionButton from "@/components/ActionButton";
import Avatar from "@/components/Avatar";
import { Alert, Badge, Button, buttonClass, Card, CardHeader, EmptyState, LiveDot, Pill, StatCard } from "@/components/ui";
import Tabs from "@/components/ui/Tabs";
import { useViewerCounts } from "@/lib/presence";
import { categoryLabel, cn, formatDateTime, formatTime, gradientFor, timeAgo } from "@/lib/utils";
import { banUser, deleteComment, deleteStream, dismissReport, unbanUser, type NewKey } from "./actions";
import SetupGuide from "./SetupGuide";
import StatsCard, { type DashBroadcast } from "./StatsCard";
import StreamForm, { type EventOption, type StreamFields } from "./StreamForm";
import StreamKey from "./StreamKey";

export type { DashBroadcast };
export type DashStream = StreamFields & { id: string; created_at: string; favorites: number; live: boolean; disabled: boolean };
export type DashReport = {
  id: number;
  comment_id: number | null;
  reported_user_id: string | null;
  reported_username: string | null;
  content: string | null;
  reason: string | null;
  created_at: string;
};
export type DashBan = { user_id: string; username: string; created_at: string };
export type DashComment = { id: number; user_id: string; username: string; content: string; created_at: string };

type Props = {
  streams: DashStream[];
  selected: DashStream | null;
  reports: DashReport[];
  bans: DashBan[];
  comments: DashComment[];
  commentCount: number;
  pendingReports: Record<string, number>;
  broadcasts: DashBroadcast[];
  samples: { at: string; viewers: number }[];
  events: EventOption[];
  rtmpUrl: string;
};

export default function DashboardView(props: Props) {
  const { streams, selected, pendingReports, events } = props;
  const router = useRouter();
  const [form, setForm] = useState<StreamFields | "new" | null>(null);
  // Clé affichée une seule fois après création / régénération (jamais relue depuis le serveur).
  const [revealed, setRevealed] = useState<NewKey | null>(null);
  const viewers = useViewerCounts();

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-[4.75rem] lg:self-start">
        <Card className="overflow-hidden">
          <CardHeader
            icon={<Video className="size-[18px]" />}
            title="Mes caméras"
            actions={
              <Button size="sm" variant="primary" icon onClick={() => setForm("new")} aria-label="Nouvelle caméra">
                <Plus className="size-4" />
              </Button>
            }
          />
          <nav className="no-scrollbar flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible">
            {streams.length === 0 && <p className="px-2 py-1 text-sm text-ink-dim">Aucune caméra.</p>}
            {streams.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard?cam=${s.id}`}
                className={cn(
                  "flex w-60 shrink-0 items-center gap-3 rounded-lg px-2.5 py-2 transition-colors lg:w-auto",
                  selected?.id === s.id ? "bg-brand/15 text-ink" : "text-ink-muted hover:bg-panel-2 hover:text-ink",
                )}
              >
                <span className="grid h-8 w-12 shrink-0 place-items-center rounded-md text-white/85" style={{ background: gradientFor(s.id) }}>
                  <Video className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{s.title}</span>
                  <span className="flex items-center gap-1.5 text-xs text-ink-dim">
                    <LiveDot on={s.live} />
                    {s.disabled ? "Bloquée" : s.live ? `En direct · ${viewers[s.id] ?? 0}` : "Hors ligne"}
                  </span>
                </span>
                {(pendingReports[s.id] ?? 0) > 0 && <Badge tone="warning">{pendingReports[s.id]}</Badge>}
              </Link>
            ))}
          </nav>
        </Card>
      </aside>

      <div className="flex min-w-0 flex-col gap-5">
        {selected ? (
          <StreamDetail
            {...props}
            key={selected.id}
            selected={selected}
            viewers={viewers[selected.id] ?? 0}
            revealedKey={revealed?.streamId === selected.id ? revealed.key : undefined}
            onEdit={() => setForm(selected)}
          />
        ) : (
          <EmptyState
            icon={<Radio className="size-6" />}
            title="Bienvenue dans ton Studio"
            action={
              <Button variant="primary" size="lg" onClick={() => setForm("new")}>
                <Plus className="size-5" /> Créer ma première caméra
              </Button>
            }
          >
            Crée une caméra pour obtenir ta clé de stream et commencer à diffuser.
          </EmptyState>
        )}
      </div>

      {form && (
        <StreamForm
          initial={form === "new" ? undefined : form}
          events={events}
          onClose={() => {
            setForm(null);
            router.refresh();
          }}
          onCreated={(created) => {
            setRevealed(created);
            router.push(`/dashboard?cam=${created.streamId}`);
          }}
        />
      )}
    </div>
  );
}

function StreamDetail({
  selected: s,
  reports,
  bans,
  comments,
  commentCount,
  rtmpUrl,
  viewers,
  onEdit,
  broadcasts,
  samples,
  revealedKey,
}: Props & { selected: DashStream; viewers: number; onEdit: () => void; revealedKey?: string }) {
  const [live, setLive] = useState(s.live);
  const [tab, setTab] = useState<"reports" | "comments" | "bans">(reports.length ? "reports" : "comments");

  // Statut en direct rafraîchi toutes les 5 s.
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/streams/${s.id}/status`, { cache: "no-store" });
        setLive(((await res.json()) as { live: boolean }).live);
      } catch {}
    }, 5000);
    return () => clearInterval(timer);
  }, [s.id]);

  return (
    <>
      {s.disabled && (
        <Alert tone="error">
          Cette caméra a été bloquée par un administrateur : elle ne peut plus diffuser et n&apos;est plus visible du public.
        </Alert>
      )}

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2.5">
            <h1 className="text-xl font-extrabold sm:text-2xl">{s.title}</h1>
            <div className="flex flex-wrap gap-1.5">
              {live ? (
                <Pill className="bg-live/15 text-live">
                  <LiveDot on /> En direct
                </Pill>
              ) : (
                <Pill>
                  <LiveDot on={false} /> Hors ligne
                </Pill>
              )}
              <Pill>
                <Tag className="size-3.5" /> {categoryLabel(s.category)}
              </Pill>
              {s.city && (
                <Pill>
                  <MapPin className="size-3.5" /> {s.city}
                </Pill>
              )}
              {s.scheduled_at && new Date(s.scheduled_at).getTime() > Date.now() && (
                <Pill className="text-brand-hover">
                  <CalendarClock className="size-3.5" /> {formatDateTime(s.scheduled_at)}
                </Pill>
              )}
              {s.lat === null && <Pill className="text-warning">Pas sur la carte</Pill>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/cam/${s.id}`} className={buttonClass()} target="_blank">
              <ExternalLink className="size-4" /> Page publique
            </Link>
            <Button onClick={onEdit}>
              <Pencil className="size-4" /> Modifier
            </Button>
            <ActionButton
              action={deleteStream}
              fields={{ id: s.id }}
              variant="danger"
              size="md"
              icon
              title="Supprimer la caméra"
              confirm={{
                title: "Supprimer cette caméra ?",
                message: "La clé, le chat, les clips, les replays et les favoris seront définitivement supprimés.",
                confirmLabel: "Supprimer",
                danger: true,
              }}
              redirectTo="/dashboard"
            >
              <Trash2 className="size-4" />
            </ActionButton>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard icon={<Radio className="size-5" />} tone={live ? "live" : "brand"} value={live ? "En direct" : "Hors ligne"} label="Statut" />
        <StatCard icon={<Eye className="size-5" />} value={viewers} label="Spectateurs" />
        <StatCard icon={<Heart className="size-5" />} tone="live" value={s.favorites} label="Favoris" />
        <StatCard icon={<MessageSquare className="size-5" />} tone="success" value={commentCount} label="Commentaires" />
        <StatCard icon={<Flag className="size-5" />} tone="warning" value={reports.length} label="Signalements" />
      </div>

      <StreamKey streamId={s.id} rtmpUrl={rtmpUrl} revealedKey={revealedKey} />

      <div className="grid gap-5 2xl:grid-cols-2">
        <StatsCard broadcasts={broadcasts} samples={samples} />
        <SetupGuide rtmpUrl={rtmpUrl} streamId={s.id} />
      </div>

      <Card>
        <CardHeader
          icon={<ShieldCheck className="size-[18px]" />}
          title="Modération"
          actions={
            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                { value: "reports", label: "Signalements", icon: <Flag className="size-3.5" />, count: reports.length },
                { value: "comments", label: "Messages", icon: <MessageSquare className="size-3.5" /> },
                { value: "bans", label: "Bannis", icon: <Ban className="size-3.5" />, count: bans.length },
              ]}
            />
          }
        />
        <ul className="divide-y divide-line">
          {tab === "reports" &&
            (reports.length ? (
              reports.map((r) => (
                <li key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                  <Avatar name={r.reported_username ?? "?"} size="sm" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <strong>{r.reported_username}</strong>
                      <Badge tone="warning">{r.reason || "Sans motif"}</Badge>
                      <span className="text-xs text-ink-dim">{timeAgo(r.created_at)}</span>
                    </div>
                    <p className="rounded-r-md border-l-4 border-line-strong bg-panel-2 px-3 py-1.5 text-sm break-words text-ink-muted">{r.content}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton action={dismissReport} fields={{ id: r.id }}>
                      Ignorer
                    </ActionButton>
                    <ActionButton action={deleteComment} fields={{ commentId: r.comment_id ?? "", reportId: r.id }} variant="danger">
                      <Trash2 className="size-3.5" /> Supprimer
                    </ActionButton>
                    {r.reported_user_id && (
                      <ActionButton
                        action={banUser}
                        fields={{ streamId: s.id, userId: r.reported_user_id }}
                        variant="danger"
                        confirm={{ title: `Bannir ${r.reported_username} ?`, message: "Ses messages sur cette caméra seront supprimés.", confirmLabel: "Bannir", danger: true }}
                      >
                        <Ban className="size-3.5" /> Bannir
                      </ActionButton>
                    )}
                  </div>
                </li>
              ))
            ) : (
              <EmptyRow icon={<ShieldCheck className="size-5" />} text="Aucun signalement en attente. Tout est calme !" />
            ))}

          {tab === "comments" &&
            (comments.length ? (
              comments.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={c.username} size="sm" />
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex items-center gap-2">
                      <strong>{c.username}</strong>
                      <span className="text-xs text-ink-dim">{formatTime(c.created_at)}</span>
                    </div>
                    <p className="break-words text-ink-muted">{c.content}</p>
                  </div>
                  <ActionButton action={deleteComment} fields={{ commentId: c.id }} variant="ghost" icon title="Supprimer">
                    <Trash2 className="size-4" />
                  </ActionButton>
                  <ActionButton
                    action={banUser}
                    fields={{ streamId: s.id, userId: c.user_id }}
                    variant="ghost"
                    icon
                    title="Bannir"
                    confirm={{ title: `Bannir ${c.username} ?`, confirmLabel: "Bannir", danger: true }}
                  >
                    <Ban className="size-4" />
                  </ActionButton>
                </li>
              ))
            ) : (
              <EmptyRow icon={<MessageSquare className="size-5" />} text="Aucun message pour l'instant." />
            ))}

          {tab === "bans" &&
            (bans.length ? (
              bans.map((b) => (
                <li key={b.user_id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={b.username} size="sm" />
                  <div className="flex-1 text-sm">
                    <strong>{b.username}</strong>
                    <div className="text-xs text-ink-dim">Banni {timeAgo(b.created_at)}</div>
                  </div>
                  <ActionButton action={unbanUser} fields={{ streamId: s.id, userId: b.user_id }}>
                    <UserCheck className="size-3.5" /> Débannir
                  </ActionButton>
                </li>
              ))
            ) : (
              <EmptyRow icon={<ShieldAlert className="size-5" />} text="Personne n'est banni." />
            ))}
        </ul>
      </Card>
    </>
  );
}

function EmptyRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-ink-dim">
      <span className="grid size-11 place-items-center rounded-xl bg-panel-2 text-brand">{icon}</span>
      {text}
    </li>
  );
}
