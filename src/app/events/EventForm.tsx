"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal, useUI } from "@/components/UIProvider";
import { saveEvent } from "./actions";

export type EventFields = { id?: string; title: string; description: string; city: string; starts_at: string };

/** Convertit une date ISO en valeur pour <input type="datetime-local"> (heure locale). */
export function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function EventForm({ initial, onClose }: { initial?: EventFields; onClose: () => void }) {
  const router = useRouter();
  const { toast } = useUI();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const editing = !!initial?.id;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // datetime-local est en heure locale : on envoie une date ISO complète.
    const local = String(fd.get("starts_at") ?? "");
    if (local) fd.set("starts_at", new Date(local).toISOString());
    start(async () => {
      const res = await saveEvent(fd);
      if (!res.ok) return setError(res.error);
      toast(res.message ?? "Enregistré");
      onClose();
      router.push(`/events/${res.data}`);
      router.refresh();
    });
  }

  return (
    <Modal title={editing ? "Modifier l'événement" : "Nouvel événement"} onClose={onClose} maxWidth={540}>
      <form onSubmit={submit}>
        <div className="modal-body stack" style={{ gap: 16 }}>
          {initial?.id && <input type="hidden" name="id" value={initial.id} />}
          <div className="field">
            <label htmlFor="ev-title">Titre *</label>
            <input
              id="ev-title"
              name="title"
              className="input"
              defaultValue={initial?.title}
              maxLength={120}
              required
              autoFocus
              placeholder="Ex. Manifestation du 12 mai — Paris"
            />
          </div>
          <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
            <div className="field grow" style={{ minWidth: 200 }}>
              <label htmlFor="ev-start">Début *</label>
              <input
                id="ev-start"
                name="starts_at"
                type="datetime-local"
                className="input"
                defaultValue={toLocalInput(initial?.starts_at)}
                required
              />
            </div>
            <div className="field grow" style={{ minWidth: 200 }}>
              <label htmlFor="ev-city">Ville / lieu</label>
              <input id="ev-city" name="city" className="input" defaultValue={initial?.city} maxLength={80} placeholder="Ex. Paris" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="ev-desc">Description</label>
            <textarea
              id="ev-desc"
              name="description"
              className="textarea"
              defaultValue={initial?.description}
              maxLength={2000}
              placeholder="Parcours, horaires, consignes…"
            />
          </div>
          <p className="hint muted small">
            Les streamers rattachent ensuite leurs caméras à l&apos;événement depuis le Studio.
          </p>
          {error && <div className="alert alert-error">{error}</div>}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" disabled={pending}>
            {pending ? "Enregistrement…" : editing ? "Enregistrer" : "Créer l'événement"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
