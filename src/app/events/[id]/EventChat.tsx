"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUI } from "@/components/UIProvider";
import Avatar from "@/components/Avatar";
import { colorFor, formatTime, friendlyDbError } from "@/lib/utils";

export type EventComment = { id: number; event_id: string; user_id: string; username: string; content: string; created_at: string };

type Props = { eventId: string; initial: EventComment[]; currentUserId: string | null; canModerate: boolean };

/** Chat commun à toutes les caméras d'un événement. */
export default function EventChat({ eventId, initial, currentUserId, canModerate }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useUI();
  const [comments, setComments] = useState(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`event-comments:${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "event_comments", filter: `event_id=eq.${eventId}` },
        (payload) => {
          const c = payload.new as EventComment;
          setComments((prev) => (prev.some((p) => p.id === c.id) ? prev : [...prev, c].slice(-300)));
        },
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "event_comments" }, (payload) => {
        const id = (payload.old as { id?: number }).id;
        if (id) setComments((prev) => prev.filter((c) => c.id !== id));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, eventId]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [comments]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    const { data, error } = await supabase.from("event_comments").insert({ event_id: eventId, content }).select().single();
    setSending(false);
    if (error) return toast(friendlyDbError(error.message), "error");
    setText("");
    setComments((prev) => (prev.some((p) => p.id === data.id) ? prev : [...prev, data as EventComment]));
  }

  async function remove(id: number) {
    const { error } = await supabase.from("event_comments").delete().eq("id", id);
    if (error) return toast("Suppression impossible.", "error");
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <aside className="card chat">
      <div className="chat-header">
        <h3>
          <MessageSquare size={17} /> Chat de l&apos;événement
        </h3>
      </div>
      <div className="chat-messages" ref={listRef}>
        {comments.length === 0 && (
          <div className="empty" style={{ border: 0, padding: "48px 12px" }}>
            <div className="empty-icon">
              <MessageSquare size={26} />
            </div>
            <h3>Le chat est ouvert</h3>
            <p className="small">Partage les infos du terrain avec tout le monde.</p>
          </div>
        )}
        {comments.map((c) => (
          <div key={c.id} className={c.user_id === currentUserId ? "chat-message mine" : "chat-message"}>
            <Avatar name={c.username} size={26} />
            <div className="body">
              <Link href={`/u/${c.username}`} className="author" style={{ color: colorFor(c.username) }}>
                {c.username}
              </Link>
              <span>{c.content}</span>
              <span className="time">{formatTime(c.created_at)}</span>
            </div>
            {(c.user_id === currentUserId || canModerate) && (
              <div className="msg-actions">
                <button className="msg-action danger" title="Supprimer" onClick={() => remove(c.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="chat-footer">
        {currentUserId ? (
          <form className="chat-input" onSubmit={send}>
            <input
              className="input"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              placeholder="Envoyer un message…"
              maxLength={500}
            />
            <button className="btn btn-primary btn-icon" disabled={sending || !text.trim()} aria-label="Envoyer">
              <Send size={17} />
            </button>
          </form>
        ) : (
          <p className="muted small" style={{ textAlign: "center" }}>
            <Link href="/login" style={{ color: "var(--accent)" }}>
              Connecte-toi
            </Link>{" "}
            pour participer au chat.
          </p>
        )}
      </div>
    </aside>
  );
}
