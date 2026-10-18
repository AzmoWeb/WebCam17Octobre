"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, Ban, Crown, Flag, MessageSquare, Send, ShieldAlert, Smile, Trash2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Modal, useUI } from "@/components/UIProvider";
import Avatar from "@/components/Avatar";
import { cn, colorFor, formatTime } from "@/lib/utils";

export type Comment = {
  id: number;
  stream_id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
};

type Props = {
  streamId: string;
  ownerId: string;
  initialComments: Comment[];
  currentUserId: string | null;
  isOwner: boolean;
  isBanned: boolean;
  viewers: number;
};

const MAX_MESSAGES = 300;
const MAX_LENGTH = 500;
const EMOJIS = ["😀", "😂", "😍", "🥳", "😮", "😢", "😡", "👍", "👏", "🙌", "✊", "💪", "🔥", "❤️", "💯", "🎉",
  "👀", "📢", "📸", "🚨", "✌️", "🙏", "🤝", "🌍"];
const REPORT_REASONS = ["Spam ou publicité", "Propos haineux", "Harcèlement", "Contenu choquant", "Autre"];

export default function Chat({ streamId, ownerId, initialComments, currentUserId, isOwner, isBanned, viewers }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const { toast, confirm } = useUI();
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [banned, setBanned] = useState(isBanned);
  const [showEmojis, setShowEmojis] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [unread, setUnread] = useState(0);
  const [reporting, setReporting] = useState<Comment | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const atBottomRef = useRef(true);

  useEffect(() => {
    const channel = supabase
      .channel(`comments:${streamId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `stream_id=eq.${streamId}` },
        (payload) => {
          const c = payload.new as Comment;
          setComments((prev) => (prev.some((p) => p.id === c.id) ? prev : [...prev, c].slice(-MAX_MESSAGES)));
          if (!atBottomRef.current) setUnread((n) => n + 1);
        },
      )
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

  // Défilement automatique, sauf si l'utilisateur remonte dans l'historique.
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
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setUnread(0);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    const { data, error } = await supabase
      .from("comments")
      .insert({ stream_id: streamId, content })
      .select()
      .single();
    setSending(false);
    if (error) {
      // 42501 = refus RLS : l'utilisateur a été banni pendant la session.
      if (error.code === "42501") setBanned(true);
      else toast("Message non envoyé, réessaie.", "error");
      return;
    }
    setText("");
    setShowEmojis(false);
    atBottomRef.current = true;
    setComments((prev) => (prev.some((p) => p.id === data.id) ? prev : [...prev, data as Comment].slice(-MAX_MESSAGES)));
    inputRef.current?.focus();
  }

  async function remove(c: Comment) {
    const ok = await confirm({ title: "Supprimer ce message ?", confirmLabel: "Supprimer", danger: true });
    if (!ok) return;
    const { error } = await supabase.from("comments").delete().eq("id", c.id);
    if (error) return toast("Suppression impossible.", "error");
    setComments((prev) => prev.filter((p) => p.id !== c.id));
    toast("Message supprimé");
  }

  async function ban(c: Comment) {
    const ok = await confirm({
      title: `Bannir @${c.username} ?`,
      message: "Il ne pourra plus écrire dans ce chat et tous ses messages seront supprimés. Tu pourras le débannir depuis le Studio.",
      confirmLabel: "Bannir",
      danger: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("stream_bans").upsert({ stream_id: streamId, user_id: c.user_id });
    if (error) return toast("Bannissement impossible.", "error");
    await supabase.from("comments").delete().eq("stream_id", streamId).eq("user_id", c.user_id);
    setComments((prev) => prev.filter((p) => p.user_id !== c.user_id));
    toast(`@${c.username} a été banni`);
  }

  function insertEmoji(emoji: string) {
    setText((t) => (t + emoji).slice(0, MAX_LENGTH));
    inputRef.current?.focus();
  }

  const remaining = MAX_LENGTH - text.length;

  return (
    <aside className="card chat">
      <div className="chat-header">
        <h3>
          <MessageSquare size={17} /> Chat en direct
        </h3>
        <span className="stat-pill" title="Spectateurs connectés">
          <Users size={14} /> {viewers}
        </span>
      </div>

      <div className="chat-messages" ref={listRef} onScroll={onScroll}>
        {comments.length === 0 && (
          <div className="empty" style={{ border: 0, padding: "48px 12px" }}>
            <div className="empty-icon">
              <MessageSquare size={26} />
            </div>
            <h3>Bienvenue dans le chat !</h3>
            <p className="small">Sois le premier à écrire un message.</p>
          </div>
        )}

        {comments.map((c) => {
          const mine = c.user_id === currentUserId;
          const isStreamer = c.user_id === ownerId;
          return (
            <div key={c.id} className={cn("chat-message", mine && "mine")}>
              <Avatar name={c.username} size={26} />
              <div className="body">
                {isStreamer && (
                  <span className="role-badge">
                    <Crown size={10} /> Streamer
                  </span>
                )}
                <Link href={`/u/${c.username}`} className="author" style={{ color: colorFor(c.username) }}>
                  {c.username}
                </Link>
                <span>{c.content}</span>
                <span className="time">{formatTime(c.created_at)}</span>
              </div>

              {currentUserId && (
                <div className="msg-actions">
                  {!mine && (
                    <button className="msg-action" title="Signaler" onClick={() => setReporting(c)}>
                      <Flag size={14} />
                    </button>
                  )}
                  {(mine || isOwner) && (
                    <button className="msg-action danger" title="Supprimer" onClick={() => remove(c)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                  {isOwner && !mine && (
                    <button className="msg-action danger" title="Bannir" onClick={() => ban(c)}>
                      <Ban size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!atBottom && (
        <div style={{ position: "relative" }}>
          <button className="btn btn-primary btn-sm new-messages" onClick={scrollToBottom}>
            <ArrowDown size={14} /> {unread > 0 ? `${unread} nouveau${unread > 1 ? "x" : ""} message${unread > 1 ? "s" : ""}` : "Revenir en bas"}
          </button>
        </div>
      )}

      <div className="chat-footer">
        {!currentUserId ? (
          <div className="stack" style={{ alignItems: "center", textAlign: "center", padding: 6 }}>
            <span className="muted small">Connecte-toi pour participer au chat.</span>
            <div className="row">
              <Link href="/login" className="btn btn-sm">
                Connexion
              </Link>
              <Link href="/login?mode=signup" className="btn btn-primary btn-sm">
                Créer un compte
              </Link>
            </div>
          </div>
        ) : banned ? (
          <div className="alert alert-error">
            <ShieldAlert size={18} /> Tu as été banni de ce chat par le streamer.
          </div>
        ) : (
          <>
            <form className="chat-input" onSubmit={send}>
              <input
                ref={inputRef}
                className="input"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
                placeholder="Envoyer un message…"
                maxLength={MAX_LENGTH}
              />
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm emoji-toggle"
                onClick={() => setShowEmojis((s) => !s)}
                aria-label="Émojis"
              >
                <Smile size={18} />
              </button>
              <button className="btn btn-primary btn-icon" disabled={sending || !text.trim()} aria-label="Envoyer">
                <Send size={17} />
              </button>
              {showEmojis && (
                <div className="emoji-picker">
                  {EMOJIS.map((e) => (
                    <button type="button" key={e} onClick={() => insertEmoji(e)}>
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </form>
            {text.length > 0 && (
              <div className={cn("char-count", remaining < 50 && "warn")}>{remaining} caractères restants</div>
            )}
          </>
        )}
      </div>

      {reporting && (
        <ReportDialog
          comment={reporting}
          onClose={() => setReporting(null)}
          onSubmit={async (reason) => {
            const { error } = await supabase.from("reports").insert({ comment_id: reporting.id, reason });
            setReporting(null);
            toast(
              error ? "Message déjà signalé." : "Merci ! Le streamer a été prévenu.",
              error ? "error" : "success",
            );
          }}
        />
      )}
    </aside>
  );
}

function ReportDialog({
  comment,
  onClose,
  onSubmit,
}: {
  comment: Comment;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Modal title="Signaler un message" onClose={onClose}>
      <div className="modal-body stack">
        <div className="quote">
          <strong>@{comment.username} :</strong> {comment.content}
        </div>
        <div className="radio-list">
          {REPORT_REASONS.map((r) => (
            <label key={r} className={cn("radio-option", reason === r && "selected")}>
              <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} />
              {r}
            </label>
          ))}
        </div>
        <textarea
          className="textarea"
          placeholder="Précisions (facultatif)"
          maxLength={150}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
      </div>
      <div className="modal-footer">
        <button className="btn" onClick={onClose}>
          Annuler
        </button>
        <button
          className="btn btn-danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onSubmit((details ? `${reason} — ${details}` : reason).slice(0, 200));
          }}
        >
          <Flag size={15} /> Signaler
        </button>
      </div>
    </Modal>
  );
}
