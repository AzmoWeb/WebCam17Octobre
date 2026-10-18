"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  Flag,
  History,
  KeyRound,
  MessageSquare,
  Power,
  PowerOff,
  Radio,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
  Video,
} from "lucide-react";
import ActionButton from "@/components/ActionButton";
import Avatar from "@/components/Avatar";
import { Badge, Card, EmptyState, Input, LiveDot, PageTitle, Select, StatCard } from "@/components/ui";
import Tabs from "@/components/ui/Tabs";
import { useUI } from "@/components/UIProvider";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";
import {
  cutStream,
  deleteCommentAdmin,
  deleteStreamAdmin,
  deleteUser,
  dismissReportAdmin,
  enableStream,
  regenerateKeyAdmin,
  setBan,
  setRole,
} from "./actions";

type Role = "user" | "moderator" | "admin";
type Tab = "reports" | "users" | "streams" | "comments" | "audit";

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
export type AdminUser = { id: string; username: string; created_at: string; role: Role; is_banned: boolean };
export type AdminStream = { id: string; title: string; created_at: string; owner: string; live: boolean; disabled: boolean };
export type AdminComment = { id: number; username: string; user_id: string; content: string; created_at: string; stream: { id: string; title: string } | null };
export type AdminAudit = {
  id: number;
  admin_username: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

type Props = {
  me: string;
  initialTab: Tab;
  query: string;
  stats: AdminStats;
  reports: AdminReport[];
  users: AdminUser[];
  streams: AdminStream[];
  comments: AdminComment[];
  audit: AdminAudit[];
};

const ACTION_LABELS: Record<string, string> = {
  "user.ban": "a banni un compte",
  "user.unban": "a débanni un compte",
  "user.role": "a changé un rôle",
  "user.delete": "a supprimé un compte",
  "stream.cut": "a coupé une caméra",
  "stream.enable": "a réactivé une caméra",
  "stream.delete": "a supprimé une caméra",
  "stream.key_reset": "a invalidé une clé",
  "report.dismiss": "a ignoré un signalement",
  "comment.delete": "a supprimé un commentaire",
};

const row = "flex flex-col gap-3 p-4 sm:flex-row sm:items-center";

export default function AdminView({ me, initialTab, query, stats, reports, users, streams, comments, audit }: Props) {
  const router = useRouter();
  const [tab, setTabState] = useState<Tab>(initialTab);
  const [q, setQ] = useState(query);
  const [streamFilter, setStreamFilter] = useState("");

  const setTab = (t: Tab) => {
    setTabState(t);
    router.replace(`/admin?tab=${t}${query ? `&q=${query}` : ""}`, { scroll: false });
  };

  const visibleStreams = streams.filter(
    (s) => !streamFilter || s.title.toLowerCase().includes(streamFilter.toLowerCase()) || s.owner.toLowerCase().includes(streamFilter.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageTitle icon={<Shield className="size-7" />} title="Administration" subtitle="Chaque action est vérifiée côté serveur et enregistrée dans le journal." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={<Users className="size-5" />} value={stats.users} label="Comptes" />
        <StatCard icon={<Video className="size-5" />} value={stats.streams} label="Caméras" />
        <StatCard icon={<Radio className="size-5" />} tone="live" value={stats.live} label="En direct" />
        <StatCard icon={<MessageSquare className="size-5" />} tone="success" value={stats.comments} label="Commentaires" />
        <StatCard icon={<Flag className="size-5" />} tone="warning" value={stats.reports} label="Signalements" />
        <StatCard icon={<Ban className="size-5" />} tone="live" value={stats.banned} label="Bannis du site" />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: "reports", label: "Signalements", icon: <Flag className="size-3.5" />, count: reports.length },
              { value: "users", label: "Comptes", icon: <Users className="size-3.5" /> },
              { value: "streams", label: "Caméras", icon: <Video className="size-3.5" /> },
              { value: "comments", label: "Commentaires", icon: <MessageSquare className="size-3.5" /> },
              { value: "audit", label: "Journal", icon: <History className="size-3.5" /> },
            ]}
          />
          {tab === "users" && (
            <form
              className="relative lg:w-72"
              onSubmit={(e) => {
                e.preventDefault();
                router.push(`/admin?tab=users${q ? `&q=${encodeURIComponent(q)}` : ""}`);
              }}
            >
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-dim" />
              <Input className="h-10 pl-9" placeholder="Rechercher un pseudo (Entrée)" value={q} maxLength={30} onChange={(e) => setQ(e.target.value)} />
            </form>
          )}
          {tab === "streams" && (
            <div className="relative lg:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-dim" />
              <Input className="h-10 pl-9" placeholder="Filtrer titre ou pseudo" value={streamFilter} onChange={(e) => setStreamFilter(e.target.value)} />
            </div>
          )}
        </div>

        <ul className="divide-y divide-line">
          {/* Signalements */}
          {tab === "reports" &&
            (reports.length ? (
              reports.map((r) => (
                <li key={r.id} className={cn(row, "sm:items-start")}>
                  <Avatar name={r.reported_username ?? "?"} size="sm" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Link href={`/u/${r.reported_username}`} className="font-bold hover:underline">
                        {r.reported_username}
                      </Link>
                      <Badge tone="warning">{r.reason || "Sans motif"}</Badge>
                      {r.stream && (
                        <Link href={`/cam/${r.stream.id}`} className="truncate text-xs text-ink-dim hover:text-ink">
                          sur « {r.stream.title} »
                        </Link>
                      )}
                      <span className="text-xs text-ink-dim">{timeAgo(r.created_at)}</span>
                    </div>
                    <p className="rounded-r-md border-l-4 border-line-strong bg-panel-2 px-3 py-1.5 text-sm break-words text-ink-muted">{r.content}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton action={dismissReportAdmin} fields={{ id: r.id }}>
                      Ignorer
                    </ActionButton>
                    {r.comment_id && (
                      <ActionButton action={deleteCommentAdmin} fields={{ commentId: r.comment_id, reportId: r.id }} variant="danger">
                        <Trash2 className="size-3.5" /> Supprimer
                      </ActionButton>
                    )}
                    {r.reported_user_id && r.reported_user_id !== me && (
                      <ActionButton
                        action={setBan}
                        fields={{ userId: r.reported_user_id, banned: "true" }}
                        variant="danger"
                        confirm={{
                          title: `Bannir ${r.reported_username} du site ?`,
                          message: "Il ne pourra plus commenter, diffuser ni écrire. Ses commentaires et ses directs en cours sont coupés.",
                          confirmLabel: "Bannir du site",
                          danger: true,
                        }}
                      >
                        <Ban className="size-3.5" /> Bannir
                      </ActionButton>
                    )}
                  </div>
                </li>
              ))
            ) : (
              <EmptyRow icon={<ShieldCheck className="size-6" />} title="Aucun signalement en attente" />
            ))}

          {/* Comptes */}
          {tab === "users" &&
            (users.length ? (
              users.map((u) => <UserRow key={u.id} user={u} isMe={u.id === me} />)
            ) : (
              <EmptyRow icon={<Users className="size-6" />} title="Aucun compte trouvé" />
            ))}

          {/* Caméras */}
          {tab === "streams" &&
            (visibleStreams.length ? (
              visibleStreams.map((s) => (
                <li key={s.id} className={row}>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <LiveDot on={s.live} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link href={`/cam/${s.id}`} className="truncate font-semibold hover:text-brand-hover">
                          {s.title}
                        </Link>
                        {s.live && <Badge tone="live">Live</Badge>}
                        {s.disabled && <Badge tone="danger">Bloquée</Badge>}
                      </div>
                      <div className="text-xs text-ink-dim">
                        {s.owner} · créée {timeAgo(s.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {s.disabled ? (
                      <ActionButton action={enableStream} fields={{ streamId: s.id }}>
                        <Power className="size-3.5" /> Réactiver
                      </ActionButton>
                    ) : (
                      <ActionButton
                        action={cutStream}
                        fields={{ streamId: s.id }}
                        variant="danger"
                        confirm={{
                          title: `Couper « ${s.title} » ?`,
                          message: "Le direct est interrompu et la caméra ne peut plus diffuser tant qu'elle n'est pas réactivée.",
                          confirmLabel: "Couper",
                          danger: true,
                        }}
                      >
                        <PowerOff className="size-3.5" /> Couper
                      </ActionButton>
                    )}
                    <ActionButton
                      action={regenerateKeyAdmin}
                      fields={{ streamId: s.id }}
                      confirm={{
                        title: "Invalider la clé de stream ?",
                        message: "La clé actuelle cesse de fonctionner et le direct est coupé. Le propriétaire devra générer une nouvelle clé.",
                        confirmLabel: "Invalider",
                        danger: true,
                      }}
                    >
                      <KeyRound className="size-3.5" /> Nouvelle clé
                    </ActionButton>
                    <ActionButton
                      action={deleteStreamAdmin}
                      fields={{ streamId: s.id }}
                      variant="danger"
                      icon
                      title="Supprimer"
                      confirm={{
                        title: `Supprimer « ${s.title} » ?`,
                        message: "Caméra, clé, chat, clips et replays seront supprimés définitivement.",
                        confirmLabel: "Supprimer",
                        danger: true,
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </ActionButton>
                  </div>
                </li>
              ))
            ) : (
              <EmptyRow icon={<Video className="size-6" />} title="Aucune caméra" />
            ))}

          {/* Commentaires récents */}
          {tab === "comments" &&
            (comments.length ? (
              comments.map((c) => (
                <li key={c.id} className="flex items-start gap-3 p-4">
                  <Avatar name={c.username} size="sm" />
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/u/${c.username}`} className="font-bold hover:underline">
                        {c.username}
                      </Link>
                      {c.stream && (
                        <Link href={`/cam/${c.stream.id}`} className="truncate text-xs text-ink-dim hover:text-ink">
                          sur « {c.stream.title} »
                        </Link>
                      )}
                      <span className="text-xs text-ink-dim">{timeAgo(c.created_at)}</span>
                    </div>
                    <p className="break-words text-ink-muted">{c.content}</p>
                  </div>
                  <ActionButton action={deleteCommentAdmin} fields={{ commentId: c.id }} variant="ghost" icon title="Supprimer">
                    <Trash2 className="size-4" />
                  </ActionButton>
                </li>
              ))
            ) : (
              <EmptyRow icon={<MessageSquare className="size-6" />} title="Aucun commentaire" />
            ))}

          {/* Journal d'audit */}
          {tab === "audit" &&
            (audit.length ? (
              audit.map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                  <History className="mt-0.5 size-4 shrink-0 text-ink-dim" />
                  <div className="min-w-0 flex-1">
                    <span className="font-bold">{a.admin_username || "admin"}</span>{" "}
                    <span className="text-ink-muted">{ACTION_LABELS[a.action] ?? a.action}</span>{" "}
                    <code className="rounded bg-panel-3 px-1 font-mono text-xs break-all text-ink-dim">
                      {a.target_type}:{a.target_id}
                    </code>
                    {Object.keys(a.details ?? {}).length > 0 && (
                      <div className="mt-0.5 truncate text-xs text-ink-dim">
                        {Object.entries(a.details)
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(" · ")}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-ink-dim">{formatDateTime(a.created_at)}</span>
                </li>
              ))
            ) : (
              <EmptyRow icon={<History className="size-6" />} title="Journal vide" />
            ))}
        </ul>
      </Card>
    </div>
  );
}

function UserRow({ user: u, isMe }: { user: AdminUser; isMe: boolean }) {
  const { confirm, toast } = useUI();
  const router = useRouter();
  const [role, setRoleValue] = useState<Role>(u.role);

  async function changeRole(next: Role) {
    if (next === role) return;
    if (!(await confirm({ title: `Passer ${u.username} en « ${next} » ?`, confirmLabel: "Changer" }))) return;
    const fd = new FormData();
    fd.set("userId", u.id);
    fd.set("role", next);
    const res = await setRole(fd);
    if (!res.ok) return toast(res.error, "error");
    setRoleValue(next);
    toast(res.message ?? "Rôle changé");
    router.refresh();
  }

  return (
    <li className={row}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={u.username} size="sm" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/u/${u.username}`} className="font-bold hover:underline">
              {u.username}
            </Link>
            {u.role !== "user" && <Badge tone="brand">{u.role}</Badge>}
            {u.is_banned && <Badge tone="danger">Banni</Badge>}
            {isMe && <Badge>Toi</Badge>}
          </div>
          <div className="text-xs text-ink-dim">Inscrit {timeAgo(u.created_at)}</div>
        </div>
      </div>
      {!isMe && (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={role} onChange={(e) => changeRole(e.target.value as Role)} aria-label="Rôle" className="h-8 w-36 text-[13px]">
            <option value="user">Utilisateur</option>
            <option value="moderator">Modérateur</option>
            <option value="admin">Administrateur</option>
          </Select>
          <ActionButton
            action={setBan}
            fields={{ userId: u.id, banned: String(!u.is_banned) }}
            variant={u.is_banned ? "secondary" : "danger"}
            confirm={u.is_banned ? undefined : { title: `Bannir ${u.username} du site ?`, confirmLabel: "Bannir", danger: true }}
          >
            {u.is_banned ? <UserCheck className="size-3.5" /> : <Ban className="size-3.5" />} {u.is_banned ? "Débannir" : "Bannir"}
          </ActionButton>
          <ActionButton
            action={deleteUser}
            fields={{ userId: u.id }}
            variant="danger"
            icon
            title="Supprimer le compte"
            confirm={{
              title: `Supprimer définitivement ${u.username} ?`,
              message: "Le compte et toutes ses données (caméras, messages, clips…) seront effacés. Action irréversible.",
              confirmLabel: "Supprimer",
              danger: true,
            }}
          >
            <UserX className="size-3.5" />
          </ActionButton>
        </div>
      )}
    </li>
  );
}

function EmptyRow({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <li className="p-4">
      <EmptyState icon={icon} title={title} className="border-0 py-8" />
    </li>
  );
}
