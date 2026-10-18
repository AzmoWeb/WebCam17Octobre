"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUI } from "@/components/UIProvider";
import { Button } from "@/components/ui";
import { cn, colorFor, formatTime } from "@/lib/utils";
import { deleteEventComment, sendEventComment, type EventComment } from "../actions";

export type { EventComment };

type Props = { eventId: string; initial: EventComment[]; currentUserId: string | null; canModerate: boolean; className?: string };

/** Chat commun à toutes les caméras d'un événement. */
export default function EventChat({ eventId, initial, currentUserId, canModerate, className }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useUI();
  const [comments, setComments] = useState(initial);
  const [text, setText] = useState("");
  const [sending, start] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`event-comments:${eventId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "event_comments", filter: `event_id=eq.${eventId}` }, (payload) => {
        const c = payload.new as EventComment;
        setComments((prev) => (prev.some((p) => p.id === c.id) ? prev : [...prev, c].slice(-300)));
      })
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

  function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    start(async () => {
      const res = await sendEventComment(eventId, content);
      if (!res.ok) return toast(res.error, "error");
      setText("");
      setComments((prev) => (prev.some((p) => p.id === res.data!.id) ? prev : [...prev, res.data!]));
    });
  }

  async function remove(id: number) {
    const res = await deleteEventComment(id);
    if (!res.ok) return toast(res.error, "error");
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <aside className={cn("flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-panel", className)}>
      <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-bold tracking-wide uppercase">
        <MessageSquare className="size-4 text-brand" /> Chat de l&apos;événement
      </div>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-2">
        {comments.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <MessageSquare className="size-6 text-brand" />
            <p className="font-semibold">Le chat est ouvert</p>
            <p className="text-sm text-ink-dim">Partage les infos du terrain avec tout le monde.</p>
          </div>
        )}
        {comments.map((c) => (
          <div key={c.id} className={cn("group/msg relative rounded-md px-2 py-1.5 text-sm break-words hover:bg-panel-2", c.user_id === currentUserId && "bg-brand/10")}>
            <span className="mr-1.5 text-[11px] text-ink-dim">{formatTime(c.created_at)}</span>
            <Link href={`/u/${c.username}`} className="font-bold hover:underline" style={{ color: colorFor(c.username) }}>
              {c.username}
            </Link>
            <span className="text-ink-dim">: </span>
            {c.content}
            {(c.user_id === currentUserId || canModerate) && (
              <button
                onClick={() => remove(c.id)}
                title="Supprimer"
                className="absolute top-1 right-1 hidden size-7 place-items-center rounded bg-panel-2 text-ink-muted group-hover/msg:grid hover:text-danger"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-line p-3">
        {currentUserId ? (
          <form className="flex gap-2" onSubmit={send}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              placeholder="Envoyer un message"
              aria-label="Message"
              className="h-10 flex-1 rounded-lg border border-line bg-panel-2 px-3 text-sm placeholder:text-ink-dim focus:border-brand focus:outline-none"
            />
            <Button type="submit" variant="primary" icon disabled={!text.trim()} loading={sending} aria-label="Envoyer">
              {!sending && <Send className="size-4" />}
            </Button>
          </form>
        ) : (
          <p className="text-center text-sm text-ink-muted">
            <Link href="/login" className="font-semibold text-brand-hover">
              Connecte-toi
            </Link>{" "}
            pour participer.
          </p>
        )}
      </div>
    </aside>
  );
}
