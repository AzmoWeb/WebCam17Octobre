"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import { useUI } from "@/components/UIProvider";
import Avatar from "@/components/Avatar";
import { Badge, Button, buttonClass } from "@/components/ui";
import { cn, formatTime, timeAgo } from "@/lib/utils";
import { pollThread, sendMessage } from "./actions";
import type { Conversation, DM } from "./types";

type Props = { me: string; conversations: Conversation[]; peer: { id: string; username: string } | null; thread: DM[] };

// Les messages privés ne passent pas par le temps réel du navigateur (session HttpOnly) :
// la conversation ouverte est relevée par le serveur toutes les 4 s, la liste toutes les 20 s.
export default function MessagesView({ me, conversations: initialConvos, peer, thread: initialThread }: Props) {
  const router = useRouter();
  const { toast } = useUI();
  const [convos, setConvos] = useState(initialConvos);
  const [thread, setThread] = useState(initialThread);
  const [text, setText] = useState("");
  const [sending, start] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(initialThread.at(-1)?.id ?? 0);

  useEffect(() => {
    setThread(initialThread);
    lastIdRef.current = initialThread.at(-1)?.id ?? 0;
  }, [initialThread]);
  useEffect(() => setConvos(initialConvos), [initialConvos]);

  useEffect(() => {
    if (!peer) return;
    const timer = setInterval(async () => {
      if (document.hidden) return;
      const fresh = await pollThread(peer.id, lastIdRef.current);
      if (!fresh.length) return;
      lastIdRef.current = fresh.at(-1)!.id;
      setThread((prev) => [...prev, ...fresh.filter((m) => !prev.some((p) => p.id === m.id))]);
    }, 4000);
    return () => clearInterval(timer);
  }, [peer]);

  useEffect(() => {
    const timer = setInterval(() => !document.hidden && router.refresh(), 20000);
    return () => clearInterval(timer);
  }, [router]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!peer || !content) return;
    start(async () => {
      const res = await sendMessage(peer.id, content);
      if (!res.ok) return toast(res.error, "error");
      const m = res.data!;
      setText("");
      lastIdRef.current = Math.max(lastIdRef.current, m.id);
      setThread((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
      setConvos((prev) => [{ userId: peer.id, username: peer.username, last: m, unread: 0 }, ...prev.filter((c) => c.userId !== peer.id)]);
    });
  }

  return (
    <div className="-mx-3 -mt-5 grid h-[calc(100dvh-3.5rem)] overflow-hidden border-line bg-panel sm:-mx-5 sm:-mt-7 md:mx-0 md:mt-0 md:h-[calc(100dvh-6.5rem)] md:grid-cols-[300px_minmax(0,1fr)] md:rounded-xl md:border">
      <div className={cn("flex min-h-0 flex-col border-line md:border-r", peer && "hidden md:flex")}>
        <div className="flex items-center gap-2 border-b border-line px-4 py-3.5 font-bold">
          <MessageCircle className="size-[18px] text-brand" /> Messages
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {convos.length === 0 && !peer && (
            <p className="p-3 text-sm text-ink-dim">Aucune conversation. Ouvre le profil d&apos;un utilisateur et clique sur « Message ».</p>
          )}
          {peer && !convos.some((c) => c.userId === peer.id) && (
            <div className="flex items-center gap-3 rounded-lg bg-brand/15 px-2.5 py-2.5">
              <Avatar name={peer.username} size="sm" />
              <div className="min-w-0">
                <div className="truncate font-semibold">{peer.username}</div>
                <div className="text-xs text-ink-dim">Nouvelle conversation</div>
              </div>
            </div>
          )}
          {convos.map((c) => (
            <Link
              key={c.userId}
              href={`/messages/${c.username}`}
              className={cn("flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors", peer?.id === c.userId ? "bg-brand/15" : "hover:bg-panel-2")}
            >
              <Avatar name={c.username} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{c.username}</span>
                  <span className="shrink-0 text-[11px] text-ink-dim" suppressHydrationWarning>
                    {timeAgo(c.last.created_at)}
                  </span>
                </span>
                <span className="block truncate text-xs text-ink-dim">
                  {c.last.sender_id === me ? "Toi : " : ""}
                  {c.last.content}
                </span>
              </span>
              {c.unread > 0 && peer?.id !== c.userId && <Badge tone="live">{c.unread}</Badge>}
            </Link>
          ))}
        </div>
      </div>

      <div className={cn("flex min-h-0 min-w-0 flex-col", !peer && "hidden md:flex")}>
        {peer ? (
          <>
            <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
              <Link href="/messages" className={buttonClass({ variant: "ghost", icon: true, size: "sm", className: "md:hidden" })} aria-label="Retour">
                <ArrowLeft className="size-4" />
              </Link>
              <Link href={`/u/${peer.username}`} className="flex items-center gap-2.5 font-bold hover:text-brand-hover">
                <Avatar name={peer.username} size="sm" /> {peer.username}
              </Link>
            </div>
            <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-4">
              {thread.length === 0 && <p className="m-auto text-sm text-ink-dim">Écris ton premier message à {peer.username}.</p>}
              {thread.map((m) => {
                const mine = m.sender_id === me;
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm break-words whitespace-pre-wrap",
                      mine ? "self-end rounded-br-md bg-brand text-white" : "self-start rounded-bl-md bg-panel-3",
                    )}
                  >
                    {m.content}
                    <span className={cn("mt-0.5 block text-right text-[10px]", mine ? "text-white/70" : "text-ink-dim")}>{formatTime(m.created_at)}</span>
                  </div>
                );
              })}
            </div>
            <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
              <input
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 2000))}
                placeholder={`Message à ${peer.username}`}
                aria-label="Message"
                autoFocus
                className="h-11 flex-1 rounded-lg border border-line bg-panel-2 px-3.5 text-sm placeholder:text-ink-dim focus:border-brand focus:outline-none"
              />
              <Button type="submit" variant="primary" icon size="md" disabled={!text.trim()} loading={sending} aria-label="Envoyer" className="size-11">
                {!sending && <Send className="size-4" />}
              </Button>
            </form>
          </>
        ) : (
          <div className="m-auto flex flex-col items-center gap-2 p-6 text-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-panel-2 text-brand">
              <MessageCircle className="size-6" />
            </div>
            <h2 className="font-bold">Tes messages privés</h2>
            <p className="text-sm text-ink-dim">Choisis une conversation.</p>
          </div>
        )}
      </div>
    </div>
  );
}
