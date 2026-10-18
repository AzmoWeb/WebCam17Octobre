"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  ExternalLink,
  Eye,
  Flag,
  Heart,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  Radio,
  ShieldCheck,
  Tag,
  Trash2,
  UserCheck,
  Video,
} from "lucide-react";
import ActionButton from "@/components/ActionButton";
import Avatar from "@/components/Avatar";
import { useViewerCounts } from "@/lib/presence";
import { categoryLabel, cn, formatTime, gradientFor, timeAgo } from "@/lib/utils";
import { banUser, deleteComment, deleteStream, dismissReport, unbanUser } from "./actions";
import SetupGuide from "./SetupGuide";
import StreamForm, { type StreamFields } from "./StreamForm";
import StreamKey from "./StreamKey";

export type DashStream = {
  id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  created_at: string;
  key: string;
  favorites: number;
  live: boolean;
};
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
  rtmpUrl: string;
};

export default function DashboardView(props: Props) {
  const { streams, selected, pendingReports } = props;
  const [form, setForm] = useState<StreamFields | "new" | null>(null);
  const viewers = useViewerCounts();

  return (
    <div className="dash">
      <aside className="card dash-sidebar">
        <div className="card-header">
          <h3>
            <Video size={18} /> Mes caméras
          </h3>
          <button className="btn btn-primary btn-icon btn-sm" onClick={() => setForm("new")} title="Nouvelle caméra">
            <Plus size={16} />
          </button>
        </div>
        <div className="stack" style={{ gap: 2, padding: "8px 0" }}>
          {streams.length === 0 && <p className="muted small" style={{ padding: "8px 20px" }}>Aucune caméra.</p>}
          {streams.map((s) => (
            <Link key={s.id} href={`/dashboard?cam=${s.id}`} className={cn("dash-cam", selected?.id === s.id && "active")}>
              <span className="dash-cam-thumb" style={{ background: gradientFor(s.id) }}>
                <Video size={14} />
              </span>
              <span className="grow">
                <span className="truncate" style={{ display: "block", fontWeight: 600 }}>
                  {s.title}
                </span>
                <span className="tiny muted row" style={{ gap: 6 }}>
                  <span className={cn("live-dot", s.live && "on")} />
                  {s.live ? `En direct · ${viewers[s.id] ?? 0} spect.` : "Hors ligne"}
                </span>
              </span>
              {(pendingReports[s.id] ?? 0) > 0 && (
                <span className="badge badge-warning" title="Signalements en attente">
                  {pendingReports[s.id]}
                </span>
              )}
            </Link>
          ))}
        </div>
        <div style={{ padding: 12, borderTop: "1px solid var(--border)" }}>
          <button className="btn btn-block" onClick={() => setForm("new")}>
            <Plus size={16} /> Nouvelle caméra
          </button>
        </div>
      </aside>

      <div className="stack-lg" style={{ minWidth: 0 }}>
        {selected ? (
          <StreamDetail {...props} selected={selected} viewers={viewers[selected.id] ?? 0} onEdit={() => setForm(selected)} />
        ) : (
          <div className="empty" style={{ padding: "80px 20px" }}>
            <div className="empty-icon">
              <Radio size={28} />
            </div>
            <h3>Bienvenue dans ton Studio</h3>
            <p>Crée ta première caméra pour obtenir ta clé de stream et commencer à diffuser.</p>
            <button className="btn btn-gradient btn-lg" onClick={() => setForm("new")}>
              <Plus size={18} /> Créer ma première caméra
            </button>
          </div>
        )}
      </div>

      {form && <StreamForm initial={form === "new" ? undefined : form} onClose={() => setForm(null)} />}
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
}: Props & { selected: DashStream; viewers: number; onEdit: () => void }) {
  const router = useRouter();
  const [live, setLive] = useState(s.live);
  const [tab, setTab] = useState<"reports" | "comments" | "bans">(reports.length ? "reports" : "comments");

  // Statut en direct rafraîchi toutes les 5 s.
  useEffect(() => {
    setLive(s.live);
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/streams/${s.id}/status`, { cache: "no-store" });
        setLive(((await res.json()) as { live: boolean }).live);
      } catch {}
    }, 5000);
    return () => clearInterval(timer);
  }, [s.id, s.live]);

  return (
    <>
      <div className="card card-body">
        <div className="row between" style={{ alignItems: "flex-start", gap: 16 }}>
          <div className="stack grow" style={{ gap: 10 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800 }}>{s.title}</h1>
            <div className="row">
              <span className={cn("stat-pill", live && "live")}>
                <span className={cn("live-dot", live && "on")} /> {live ? "En direct" : "Hors ligne"}
              </span>
              <span className="stat-pill">
                <Tag size={14} /> {categoryLabel(s.category)}
              </span>
              {s.city && (
                <span className="stat-pill">
                  <MapPin size={14} /> {s.city}
                </span>
              )}
              <span className="muted small">Créée {timeAgo(s.created_at)}</span>
            </div>
            {s.description && <p className="description">{s.description}</p>}
          </div>
          <div className="row">
            <Link href={`/cam/${s.id}`} className="btn" target="_blank">
              <ExternalLink size={16} /> Page publique
            </Link>
            <button className="btn" onClick={onEdit}>
              <Pencil size={16} /> Modifier
            </button>
            <ActionButton
              action={deleteStream}
              fields={{ id: s.id }}
              className="btn btn-danger btn-icon"
              title="Supprimer la caméra"
              confirm={{
                title: "Supprimer cette caméra ?",
                message: "La clé, les commentaires, les signalements et les favoris seront définitivement supprimés.",
                confirmLabel: "Supprimer",
                danger: true,
              }}
              onDone={() => router.push("/dashboard")}
            >
              <Trash2 size={16} />
            </ActionButton>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <Stat icon={<Radio size={20} />} tone={live ? "live" : undefined} value={live ? "En direct" : "Hors ligne"} label="Statut" />
        <Stat icon={<Eye size={20} />} value={viewers} label="Spectateurs actuels" />
        <Stat icon={<Heart size={20} />} tone="live" value={s.favorites} label="Favoris" />
        <Stat icon={<MessageSquare size={20} />} tone="success" value={commentCount} label="Commentaires" />
        <Stat icon={<Flag size={20} />} tone="warning" value={reports.length} label="Signalements" />
      </div>

      <StreamKey streamId={s.id} rtmpUrl={rtmpUrl} streamKey={s.key} />

      <SetupGuide rtmpUrl={rtmpUrl} />

      <div className="card">
        <div className="card-header">
          <h3>
            <ShieldCheck size={18} /> Modération
          </h3>
          <div className="tabs">
            <button className={cn("tab", tab === "reports" && "active")} onClick={() => setTab("reports")}>
              <Flag size={14} /> Signalements <span className="count">{reports.length}</span>
            </button>
            <button className={cn("tab", tab === "comments" && "active")} onClick={() => setTab("comments")}>
              <MessageSquare size={14} /> Messages récents
            </button>
            <button className={cn("tab", tab === "bans" && "active")} onClick={() => setTab("bans")}>
              <Ban size={14} /> Bannis <span className="count">{bans.length}</span>
            </button>
          </div>
        </div>

        {tab === "reports" &&
          (reports.length ? (
            reports.map((r) => (
              <div key={r.id} className="list-row" style={{ alignItems: "flex-start" }}>
                <Avatar name={r.reported_username ?? "?"} size={36} />
                <div className="grow stack" style={{ gap: 6 }}>
                  <div className="row">
                    <strong>@{r.reported_username}</strong>
                    <span className="badge badge-warning">{r.reason || "Sans motif"}</span>
                    <span className="tiny muted">{timeAgo(r.created_at)}</span>
                  </div>
                  <div className="quote">{r.content}</div>
                </div>
                <div className="row">
                  <ActionButton action={dismissReport} fields={{ id: r.id }} className="btn btn-sm" title="Ignorer">
                    Ignorer
                  </ActionButton>
                  <ActionButton
                    action={deleteComment}
                    fields={{ commentId: r.comment_id ?? "", reportId: r.id }}
                    className="btn btn-sm btn-danger"
                  >
                    <Trash2 size={14} /> Supprimer
                  </ActionButton>
                  {r.reported_user_id && (
                    <ActionButton
                      action={banUser}
                      fields={{ streamId: s.id, userId: r.reported_user_id }}
                      className="btn btn-sm btn-danger"
                      confirm={{
                        title: `Bannir @${r.reported_username} ?`,
                        message: "Ses messages sur cette caméra seront supprimés.",
                        confirmLabel: "Bannir",
                        danger: true,
                      }}
                    >
                      <Ban size={14} /> Bannir
                    </ActionButton>
                  )}
                </div>
              </div>
            ))
          ) : (
            <EmptyRow icon={<ShieldCheck size={26} />} text="Aucun signalement en attente. Tout est calme !" />
          ))}

        {tab === "comments" &&
          (comments.length ? (
            comments.map((c) => (
              <div key={c.id} className="list-row">
                <Avatar name={c.username} size={32} />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <strong>@{c.username}</strong>
                    <span className="tiny muted">{formatTime(c.created_at)}</span>
                  </div>
                  <div className="text-2 small" style={{ wordBreak: "break-word" }}>
                    {c.content}
                  </div>
                </div>
                <div className="row">
                  <ActionButton action={deleteComment} fields={{ commentId: c.id }} className="btn btn-ghost btn-icon btn-sm" title="Supprimer">
                    <Trash2 size={15} />
                  </ActionButton>
                  <ActionButton
                    action={banUser}
                    fields={{ streamId: s.id, userId: c.user_id }}
                    className="btn btn-ghost btn-icon btn-sm"
                    title="Bannir"
                    confirm={{ title: `Bannir @${c.username} ?`, confirmLabel: "Bannir", danger: true }}
                  >
                    <Ban size={15} />
                  </ActionButton>
                </div>
              </div>
            ))
          ) : (
            <EmptyRow icon={<MessageSquare size={26} />} text="Aucun message pour l'instant." />
          ))}

        {tab === "bans" &&
          (bans.length ? (
            bans.map((b) => (
              <div key={b.user_id} className="list-row">
                <Avatar name={b.username} size={32} />
                <div className="grow">
                  <strong>@{b.username}</strong>
                  <div className="tiny muted">Banni {timeAgo(b.created_at)}</div>
                </div>
                <ActionButton action={unbanUser} fields={{ streamId: s.id, userId: b.user_id }} className="btn btn-sm">
                  <UserCheck size={14} /> Débannir
                </ActionButton>
              </div>
            ))
          ) : (
            <EmptyRow icon={<UserCheck size={26} />} text="Personne n'est banni." />
          ))}
      </div>
    </>
  );
}

function Stat({ icon, value, label, tone }: { icon: React.ReactNode; value: React.ReactNode; label: string; tone?: string }) {
  return (
    <div className="card stat-card">
      <div className={cn("stat-icon", tone)}>{icon}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function EmptyRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="empty" style={{ border: 0, padding: "36px 20px" }}>
      <div className="empty-icon">{icon}</div>
      <p>{text}</p>
    </div>
  );
}
