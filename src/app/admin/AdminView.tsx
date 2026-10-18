"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  Flag,
  MessageSquare,
  Radio,
  Search,
  Shield,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCheck,
  Users,
  Video,
} from "lucide-react";
import ActionButton from "@/components/ActionButton";
import Avatar from "@/components/Avatar";
import { cn, timeAgo } from "@/lib/utils";
import { adminDeleteComment, adminDeleteStream, adminDismissReport, setAdmin, setGlobalBan } from "./actions";

export type AdminStats = { users: number; streams: number; live: number; reports: number; comments: number; banned: number };
export type AdminReport = {
  id: number;
  comment_id: number | null;
  reported_user_id: string | null;
  reported_username: string | null;
  content: string | null;
  reason: string | null;
  created_at: string;
  stream: { id: string; title: string } | null;
};
export type AdminUser = { id: string; username: string; created_at: string; is_admin: boolean; is_banned: boolean };
export type AdminStream = { id: string; title: string; created_at: string; owner: string; live: boolean };

type Props = { me: string; stats: AdminStats; reports: AdminReport[]; users: AdminUser[]; streams: AdminStream[]; query: string };

export default function AdminView({ me, stats, reports, users, streams, query }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"reports" | "users" | "streams">(reports.length ? "reports" : "users");
  const [q, setQ] = useState(query);

  return (
    <div className="stack-lg">
      <h1 className="section-title" style={{ fontSize: 28 }}>
        <Shield size={26} /> Administration
      </h1>

      <div className="stats-grid">
        <Stat icon={<Users size={20} />} value={stats.users} label="Utilisateurs" />
        <Stat icon={<Video size={20} />} value={stats.streams} label="Caméras" />
        <Stat icon={<Radio size={20} />} tone="live" value={stats.live} label="En direct" />
        <Stat icon={<MessageSquare size={20} />} tone="success" value={stats.comments} label="Commentaires" />
        <Stat icon={<Flag size={20} />} tone="warning" value={stats.reports} label="Signalements" />
        <Stat icon={<Ban size={20} />} tone="live" value={stats.banned} label="Bannis du site" />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="tabs">
            <button className={cn("tab", tab === "reports" && "active")} onClick={() => setTab("reports")}>
              <Flag size={14} /> Signalements <span className="count">{reports.length}</span>
            </button>
            <button className={cn("tab", tab === "users" && "active")} onClick={() => setTab("users")}>
              <Users size={14} /> Utilisateurs
            </button>
            <button className={cn("tab", tab === "streams" && "active")} onClick={() => setTab("streams")}>
              <Video size={14} /> Caméras
            </button>
          </div>
          {tab === "users" && (
            <form
              className="input-icon"
              style={{ width: 260 }}
              onSubmit={(e) => {
                e.preventDefault();
                router.push(q ? `/admin?q=${encodeURIComponent(q)}` : "/admin");
              }}
            >
              <Search size={16} />
              <input className="input" placeholder="Rechercher un pseudo…" value={q} onChange={(e) => setQ(e.target.value)} />
            </form>
          )}
        </div>

        {tab === "reports" &&
          (reports.length ? (
            reports.map((r) => (
              <div key={r.id} className="list-row" style={{ alignItems: "flex-start" }}>
                <Avatar name={r.reported_username ?? "?"} size={36} />
                <div className="grow stack" style={{ gap: 6, minWidth: 0 }}>
                  <div className="row">
                    <Link href={`/u/${r.reported_username}`}>
                      <strong>@{r.reported_username}</strong>
                    </Link>
                    <span className="badge badge-warning">{r.reason || "Sans motif"}</span>
                    {r.stream && (
                      <Link href={`/cam/${r.stream.id}`} className="tiny muted">
                        sur « {r.stream.title} »
                      </Link>
                    )}
                    <span className="tiny muted">{timeAgo(r.created_at)}</span>
                  </div>
                  <div className="quote">{r.content}</div>
                </div>
                <div className="row">
                  <ActionButton action={adminDismissReport} fields={{ id: r.id }} className="btn btn-sm">
                    Ignorer
                  </ActionButton>
                  <ActionButton
                    action={adminDeleteComment}
                    fields={{ commentId: r.comment_id ?? "", reportId: r.id }}
                    className="btn btn-sm btn-danger"
                  >
                    <Trash2 size={14} /> Supprimer
                  </ActionButton>
                  {r.reported_user_id && (
                    <ActionButton
                      action={setGlobalBan}
                      fields={{ userId: r.reported_user_id, banned: "true" }}
                      className="btn btn-sm btn-danger"
                      confirm={{
                        title: `Bannir @${r.reported_username} de tout le site ?`,
                        message: "Il ne pourra plus commenter, diffuser ni envoyer de messages. Ses commentaires seront supprimés.",
                        confirmLabel: "Bannir du site",
                        danger: true,
                      }}
                    >
                      <Ban size={14} /> Bannir du site
                    </ActionButton>
                  )}
                </div>
              </div>
            ))
          ) : (
            <Empty icon={<ShieldCheck size={26} />} text="Aucun signalement en attente." />
          ))}

        {tab === "users" &&
          (users.length ? (
            users.map((u) => (
              <div key={u.id} className="list-row">
                <Avatar name={u.username} size={34} />
                <div className="grow">
                  <div className="row" style={{ gap: 6 }}>
                    <Link href={`/u/${u.username}`}>
                      <strong>@{u.username}</strong>
                    </Link>
                    {u.is_admin && <span className="badge badge-accent">Admin</span>}
                    {u.is_banned && <span className="badge badge-warning">Banni</span>}
                  </div>
                  <div className="tiny muted">Inscrit {timeAgo(u.created_at)}</div>
                </div>
                {u.id !== me && (
                  <div className="row">
                    <ActionButton
                      action={setAdmin}
                      fields={{ userId: u.id, value: String(!u.is_admin) }}
                      className="btn btn-sm"
                      confirm={
                        u.is_admin
                          ? undefined
                          : { title: `Nommer @${u.username} administrateur ?`, message: "Il aura accès à cette page et à toutes les actions." }
                      }
                    >
                      {u.is_admin ? <ShieldOff size={14} /> : <Shield size={14} />} {u.is_admin ? "Retirer admin" : "Admin"}
                    </ActionButton>
                    <ActionButton
                      action={setGlobalBan}
                      fields={{ userId: u.id, banned: String(!u.is_banned) }}
                      className={cn("btn btn-sm", !u.is_banned && "btn-danger")}
                      confirm={
                        u.is_banned
                          ? undefined
                          : { title: `Bannir @${u.username} de tout le site ?`, confirmLabel: "Bannir", danger: true }
                      }
                    >
                      {u.is_banned ? <UserCheck size={14} /> : <Ban size={14} />} {u.is_banned ? "Débannir" : "Bannir"}
                    </ActionButton>
                  </div>
                )}
              </div>
            ))
          ) : (
            <Empty icon={<Users size={26} />} text="Aucun utilisateur trouvé." />
          ))}

        {tab === "streams" &&
          (streams.length ? (
            streams.map((s) => (
              <div key={s.id} className="list-row">
                <span className={cn("live-dot", s.live && "on")} />
                <div className="grow" style={{ minWidth: 0 }}>
                  <Link href={`/cam/${s.id}`} className="truncate" style={{ display: "block", fontWeight: 600 }}>
                    {s.title}
                  </Link>
                  <div className="tiny muted">
                    @{s.owner} · créée {timeAgo(s.created_at)}
                  </div>
                </div>
                <ActionButton
                  action={adminDeleteStream}
                  fields={{ id: s.id }}
                  className="btn btn-sm btn-danger"
                  confirm={{
                    title: `Supprimer « ${s.title} » ?`,
                    message: "La caméra, sa clé, son chat, ses clips et ses replays seront supprimés.",
                    confirmLabel: "Supprimer",
                    danger: true,
                  }}
                >
                  <Trash2 size={14} /> Supprimer
                </ActionButton>
              </div>
            ))
          ) : (
            <Empty icon={<Video size={26} />} text="Aucune caméra." />
          ))}
      </div>
    </div>
  );
}

function Stat({ icon, value, label, tone }: { icon: React.ReactNode; value: number; label: string; tone?: string }) {
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

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="empty" style={{ border: 0, padding: "36px 20px" }}>
      <div className="empty-icon">{icon}</div>
      <p>{text}</p>
    </div>
  );
}
