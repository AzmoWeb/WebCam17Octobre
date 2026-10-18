"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Scissors } from "lucide-react";
import { Modal, useUI } from "@/components/UIProvider";
import { cn } from "@/lib/utils";
import { createClip } from "./actions";

export default function ClipDialog({ streamId, streamTitle, onClose }: { streamId: string; streamTitle: string; onClose: () => void }) {
  const router = useRouter();
  const { toast } = useUI();
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await createClip(streamId, title || `Clip — ${streamTitle}`, duration);
      if (!res.ok) return setError(res.error);
      toast(res.message ?? "Clip créé");
      onClose();
      router.push(`/clip/${res.data}`);
    });
  }

  return (
    <Modal title="Créer un clip" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="modal-body stack" style={{ gap: 16 }}>
          <p className="text-2 small">
            Le clip reprend les dernières secondes du direct. Il reste disponible tant que l&apos;enregistrement est
            conservé sur le serveur (7 jours par défaut).
          </p>
          <div className="field">
            <label htmlFor="clip-title">Titre</label>
            <input
              id="clip-title"
              className="input"
              value={title}
              maxLength={100}
              autoFocus
              placeholder={`Clip — ${streamTitle}`}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Durée</label>
            <div className="tabs" style={{ alignSelf: "flex-start" }}>
              {[15, 30, 60].map((d) => (
                <button type="button" key={d} className={cn("tab", duration === d && "active")} onClick={() => setDuration(d)}>
                  {d} s
                </button>
              ))}
            </div>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" disabled={pending}>
            <Scissors size={16} /> {pending ? "Création…" : "Créer le clip"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
