"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, Ban, Crown, Flag, MessageSquare, Send, Smile, Trash2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Modal, useUI } from "@/components/UIProvider";
import { Alert, Button, buttonClass, Textarea } from "@/components/ui";
import { cn, colorFor, formatTime } from "@/lib/utils";
import { banFromChat, deleteComment, reportComment, sendComment, type ChatComment } from "./actions";

export type Comment = ChatComment;

type Props = {
  streamId: string;
  ownerId: string;
  initialComments: Comment[];
  currentUserId: string | null;
  isOwner: boolean;
  isBanned: boolean;
  viewers: number;
  className?: string;
};

const MAX_MESSAGES = 300;
const MAX_LENGTH = 500;
const EMOJIS = ["😀", "😂", "😍", "🥳", "😮", "😢", "😡", "👍", "👏", "🙌", "✊", "💪", "🔥", "❤️", "💯", "🎉", "👀", "📢", "📸", "🚨", "✌️", "🙏", "🤝", "🌍"];
const REPORT_REASONS = ["Spam ou publicité", "Propos haineux", "Harcèlement", "Contenu choquant", "Autre"];

export default function Chat({ streamId, ownerId, initialComments, currentUserId, isOwner, isBanned, viewers, className }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const { toast, confirm } = useUI();
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState("");
  const [sending, startSend] = useTransition();
  const [banned, setBanned] = useState(isBanned);
  const [showEmojis, setShowEmojis] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [unread, setUnread] = useState(0);
  const [reporting, setReporting] = useState<Comment | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const atBottomRef = useRef(true);

  // Lecture en temps réel (données publiques, client anonyme).
  useEffect(() => {
    const channel = supabase
      .channel(`comments:${streamId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments", filter: `stream_id=eq.${streamId}` }, (payload) => {
        const c = payload.new as Comment;
        setComments((prev) => (prev.some((p) => p.id === c.id) ? prev : [...prev, c].slice(-MAX_MESSAGES)));
        if (!atBottomRef.current) setUnread((n) => n + 1);
      })
      // Les suppressions ne sont pas filtrables côté Supabase : on filtre localement par id.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "comments" }, (payload) => {
        const id = (payload.old as { id?: number }).id;
        if (id) setComments((prev) => prev.filter((c) => c.id !== id));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, streamId]);

  useEffect(() => {
    const el = listRef.current;
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [comments]);

  function onScroll() {
    const el = listRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    atBottomRef.current = bottom;
    setAtBottom(bottom);
    if (bottom) setUnread(0);
  }

  function scrollToBottom() {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    setUnread(0);
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    startSend(async () => {
      const res = await sendComment(streamId, content);
      if (!res.ok) {
        if (res.error === "banned") setBanned(true);
        else toast(res.error, "error");
        return;
      }
      setText("");
      setShowEmojis(false);
      atBottomRef.current = true;
      const c = res.data!;
      setComments((prev) => (prev.some((p) => p.id === c.id) ? prev : [...prev, c].slice(-MAX_MESSAGES)));
      inputRef.current?.focus();
    });
  }

  async function remove(c: Comment) {
    if (!(await confirm({ title: "Supprimer ce message ?", confirmLabel: "Supprimer", danger: true }))) return;
    const res = await deleteComment(c.id);
    if (!res.ok) return toast(res.error, "error");
    setComments((prev) => prev.filter((p) => p.id !== c.id));
  }

  async function ban(c: Comment) {
    const ok = await confirm({
      title: `Bannir ${c.username} ?`,
      message: "Il ne pourra plus écrire dans ce chat et ses messages seront supprimés. Tu pourras le débannir depuis le Studio.",
      confirmLabel: "Bannir",
      danger: true,
    });
    if (!ok) return;
    const res = await banFromChat(streamId, c.user_id);
    if (!res.ok) return toast(res.error, "error");
    setComments((prev) => prev.filter((p) => p.user_id !== c.user_id));
    toast(res.message ?? "Banni");
  }

  return (
    <aside className={cn("flex min-h-0 flex-col overflow-hidden border-line bg-panel lg:rounded-xl lg:border", className)}>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide uppercase">
          <MessageSquare className="size-4 text-brand" /> Chat en direct
        </h2>
        <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted" title="Spectateurs connectés">
          <Users className="size-3.5" /> {viewers}
        </span>
      </div>

      <div className="relative min-h-0 flex-1">
        <div ref={listRef} onScroll={onScroll} className="absolute inset-0 overflow-y-auto px-2 py-2">
          {comments.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
              <div className="grid size-12 place-items-center rounded-xl bg-panel-2 text-brand">
                <MessageSquare className="size-5" />
              </div>
              <p className="font-semibold">Bienvenue dans le chat !</p>
              <p className="text-sm text-ink-dim">Sois le premier à écrire un message.</p>
            </div>
          )}
          {comments.map((c) => {
            const mine = c.user_id === currentUserId;
            return (
              <div key={c.id} className={cn("group/msg relative flex gap-2 rounded-md px-2 py-1.5 text-sm leading-relaxed hover:bg-panel-2", mine && "bg-brand/10")}>
                <div className="min-w-0 flex-1 break-words">
                  <span className="mr-1.5 text-[11px] text-ink-dim tabular-nums">{formatTime(c.created_at)}</span>
                  {c.user_id === ownerId && (
                    <span className="mr-1 inline-flex h-4 items-center gap-0.5 rounded bg-brand px-1 align-[1px] text-[10px] font-extrabold text-white uppercase">
                      <Crown className="size-2.5" /> Streamer
                    </span>
                  )}
                  <Link href={`/u/${c.username}`} className="font-bold hover:underline" style={{ color: colorFor(c.username) }}>
                    {c.username}
                  </Link>
                  <span className="text-ink-dim">: </span>
                  <span className="text-ink">{c.content}</span>
                </div>
                {currentUserId && (
                  <div className="absolute -top-3 right-2 hidden gap-0.5 rounded-md border border-line bg-panel-2 p-0.5 shadow-lg group-hover/msg:flex">
                    {!mine && (
                      <button className="grid size-7 place-items-center rounded text-ink-muted hover:bg-panel-3 hover:text-ink" title="Signaler" onClick={() => setReporting(c)}>
                        <Flag className="size-3.5" />
                      </button>
                    )}
                    {(mine || isOwner) && (
                      <button className="grid size-7 place-items-center rounded text-ink-muted hover:bg-danger/15 hover:text-danger" title="Supprimer" onClick={() => remove(c)}>
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                    {isOwner && !mine && (
                      <button className="grid size-7 place-items-center rounded text-ink-muted hover:bg-danger/15 hover:text-danger" title="Bannir" onClick={() => ban(c)}>
                        <Ban className="size-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {!atBottom && (
          <Button variant="primary" size="sm" className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 shadow-xl" onClick={scrollToBottom}>
            <ArrowDown className="size-3.5" />
            {unread > 0 ? `${unread} nouveau${unread > 1 ? "x" : ""} message${unread > 1 ? "s" : ""}` : "Revenir en bas"}
          </Button>
        )}
      </div>

      <div className="border-t border-line p-3">
        {!currentUserId ? (
          <div className="flex flex-col items-center gap-2 py-1 text-center">
            <span className="text-sm text-ink-muted">Connecte-toi pour participer au chat.</span>
            <div className="flex gap-2">
              <Link href="/login" className={buttonClass({ size: "sm" })}>
                Connexion
              </Link>
              <Link href="/login?mode=signup" className={buttonClass({ variant: "primary", size: "sm" })}>
                Créer un compte
              </Link>
            </div>
          </div>
        ) : banned ? (
          <Alert tone="error">Tu ne peux plus écrire dans ce chat.</Alert>
        ) : (
          <form onSubmit={send} className="relative flex gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
                placeholder="Envoyer un message"
                maxLength={MAX_LENGTH}
                aria-label="Message"
                className="h-10 w-full rounded-lg border border-line bg-panel-2 pr-10 pl-3 text-sm placeholder:text-ink-dim focus:border-brand focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowEmojis((s) => !s)}
                className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded text-ink-muted hover:bg-panel-3 hover:text-ink"
                aria-label="Émojis"
              >
                <Smile className="size-4" />
              </button>
            </div>
            <Button type="submit" variant="primary" icon disabled={!text.trim()} loading={sending} aria-label="Envoyer">
              {!sending && <Send className="size-4" />}
            </Button>
            {showEmojis && (
              <div className="absolute right-0 bottom-full z-20 mb-2 grid animate-pop grid-cols-8 gap-0.5 rounded-xl border border-line bg-panel-2 p-2 shadow-2xl">
                {EMOJIS.map((e) => (
                  <button
                    type="button"
                    key={e}
                    className="grid size-8 place-items-center rounded-md text-lg hover:bg-panel-3"
                    onClick={() => {
                      setText((t) => (t + e).slice(0, MAX_LENGTH));
                      inputRef.current?.focus();
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </form>
        )}
        {text.length > MAX_LENGTH - 100 && (
          <div className={cn("mt-1 text-right text-[11px]", text.length > MAX_LENGTH - 30 ? "text-warning" : "text-ink-dim")}>
            {MAX_LENGTH - text.length} caractères restants
          </div>
        )}
      </div>

      {reporting && <ReportDialog comment={reporting} onClose={() => setReporting(null)} />}
    </aside>
  );
}

function ReportDialog({ comment, onClose }: { comment: Comment; onClose: () => void }) {
  const { toast } = useUI();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      const res = await reportComment(comment.id, details ? `${reason} — ${details}` : reason);
      onClose();
      toast(res.ok ? res.message ?? "Signalé" : res.error, res.ok ? "success" : "error");
    });
  }

  return (
    <Modal title="Signaler un message" onClose={onClose}>
      <div className="flex flex-col gap-4 p-5">
        <div className="rounded-r-lg border-l-4 border-line-strong bg-panel-2 px-3 py-2 text-sm break-words">
          <strong>{comment.username} :</strong> {comment.content}
        </div>
        <div className="flex flex-col gap-2">
          {REPORT_REASONS.map((r) => (
            <label
              key={r}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 text-sm transition-colors",
                reason === r ? "border-brand bg-brand/10" : "border-line hover:border-line-strong",
              )}
            >
              <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-brand" />
              {r}
            </label>
          ))}
        </div>
        <Textarea placeholder="Précisions (facultatif)" maxLength={150} value={details} onChange={(e) => setDetails(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 px-5 pb-5">
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="danger" onClick={submit} loading={pending}>
          <Flag className="size-4" /> Signaler
        </Button>
      </div>
    </Modal>
  );
}
