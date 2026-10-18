"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUI } from "@/components/UIProvider";
import Avatar from "@/components/Avatar";
import { cn, formatTime, friendlyDbError, timeAgo } from "@/lib/utils";

export type DM = { id: number; sender_id: string; recipient_id: string; content: string; created_at: string; read_at: string | null };
export type Conversation = { userId: string; username: string; last: DM; unread: number };

type Props = {
  me: string;
  conversations: Conversation[];
  peer: { id: string; username: string } | null;
  thread: DM[];
};

export default function MessagesView({ me, conversations: initialConvos, peer, thread: initialThread }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useUI();
  const [convos, setConvos] = useState(initialConvos);
  const [thread, setThread] = useState(initialThread);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const usernames = useRef(new Map(initialConvos.map((c) => [c.userId, c.username])));
  if (peer) usernames.current.set(peer.id, peer.username);

  useEffect(() => setThread(initialThread), [initialThread]);
  useEffect(() => setConvos(initialConvos), [initialConvos]);

  // Nouveaux messages en temps réel (la RLS ne laisse passer que les nôtres).
  useEffect(() => {
    const channel = supabase
      .channel(`dm:${me}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as DM;
        if (m.sender_id !== me && m.recipient_id !== me) return;
        const other = m.sender_id === me ? m.recipient_id : m.sender_id;
        const inThread = peer?.id === other;
        if (inThread) {
          setThread((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
          if (m.recipient_id === me) {
            supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", m.id).then();
          }
        }
        const name = usernames.current.get(other);
        if (!name) return router.refresh(); // Nouvelle conversation : on recharge la liste.
        setConvos((prev) => {
          const existing = prev.find((c) => c.userId === other);
          const updated: Conversation = {
            userId: other,
            username: name,
            last: m,
            unread: (existing?.unread ?? 0) + (m.recipient_id === me && !inThread ? 1 : 0),
          };
          return [updated, ...prev.filter((c) => c.userId !== other)];
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, me, peer?.id, router]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!peer || !content || sending) return;
    setSending(true);
    const { data, error } = await supabase.from("messages").insert({ recipient_id: peer.id, content }).select().single();
    setSending(false);
    if (error) return toast(friendlyDbError(error.message), "error");
    setText("");
    const m = data as DM;
    setThread((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
    setConvos((prev) => [{ userId: peer.id, username: peer.username, last: m, unread: 0 }, ...prev.filter((c) => c.userId !== peer.id)]);
  }

  return (
    <div className="card dm-layout">
      <div className="dm-list">
        <div className="card-header">
          <h3>
            <MessageCircle size={18} /> Messages
          </h3>
        </div>
        {convos.length === 0 && !peer && (
          <p className="muted small" style={{ padding: 16 }}>
            Aucune conversation. Va sur le profil d&apos;un utilisateur et clique sur « Message ».
          </p>
        )}
        {peer && !convos.some((c) => c.userId === peer.id) && (
          <div className="dash-cam active" style={{ margin: 8 }}>
            <Avatar name={peer.username} size={36} />
            <div className="grow">
              <strong>@{peer.username}</strong>
              <div className="tiny muted">Nouvelle conversation</div>
            </div>
          </div>
        )}
        {convos.map((c) => (
          <Link
            key={c.userId}
            href={`/messages/${c.username}`}
            className={cn("dash-cam", peer?.id === c.userId && "active")}
            style={{ margin: 8 }}
          >
            <Avatar name={c.username} size={36} />
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="row between" style={{ flexWrap: "nowrap" }}>
                <strong className="truncate">@{c.username}</strong>
                <span className="tiny muted" style={{ flexShrink: 0 }}>
                  {timeAgo(c.last.created_at)}
                </span>
              </span>
              <span className="tiny muted truncate" style={{ display: "block" }}>
                {c.last.sender_id === me ? "Toi : " : ""}
                {c.last.content}
              </span>
            </span>
            {c.unread > 0 && peer?.id !== c.userId && <span className="badge badge-live">{c.unread}</span>}
          </Link>
        ))}
      </div>

      <div className="dm-thread">
        {peer ? (
          <>
            <div className="chat-header">
              <Link href="/messages" className="btn btn-ghost btn-icon btn-sm" aria-label="Retour">
                <ArrowLeft size={16} />
              </Link>
              <Link href={`/u/${peer.username}`} className="row grow" style={{ gap: 10 }}>
                <Avatar name={peer.username} size={32} />
                <strong>@{peer.username}</strong>
              </Link>
            </div>
            <div className="dm-messages" ref={listRef}>
              {thread.length === 0 && (
                <p className="muted small" style={{ textAlign: "center", marginTop: 40 }}>
                  Écris ton premier message à @{peer.username}.
                </p>
              )}
              {thread.map((m) => (
                <div key={m.id} className={cn("dm-bubble", m.sender_id === me && "mine")}>
                  {m.content}
                  <span className="time">{formatTime(m.created_at)}</span>
                </div>
              ))}
            </div>
            <div className="chat-footer">
              <form className="chat-input" onSubmit={send}>
                <input
                  className="input"
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 2000))}
                  placeholder={`Message à @${peer.username}…`}
                  autoFocus
                />
                <button className="btn btn-primary btn-icon" disabled={sending || !text.trim()} aria-label="Envoyer">
                  <Send size={17} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="empty" style={{ border: 0, margin: "auto" }}>
            <div className="empty-icon">
              <MessageCircle size={28} />
            </div>
            <h3>Tes messages privés</h3>
            <p>Choisis une conversation à gauche.</p>
          </div>
        )}
      </div>
    </div>
  );
}
