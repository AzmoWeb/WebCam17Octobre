"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal, useUI } from "@/components/UIProvider";
import LocationPicker from "@/components/LocationPicker";
import { CATEGORIES, formatDateTime } from "@/lib/utils";
import { toLocalInput } from "@/app/events/EventForm";
import { createStream, updateStream } from "./actions";

export type StreamFields = {
  id?: string;
  title: string;
  description: string;
  category: string;
  city: string;
  lat: number | null;
  lng: number | null;
  scheduled_at: string | null;
  event_id: string | null;
};

export type EventOption = { id: string; title: string; starts_at: string };

const EMPTY: StreamFields = {
  title: "",
  description: "",
  category: "manifestation",
  city: "",
  lat: null,
  lng: null,
  scheduled_at: null,
  event_id: null,
};

/** Fenêtre de création / modification d'une caméra. */
export default function StreamForm({
  initial,
  events,
  onClose,
}: {
  initial?: StreamFields;
  events: EventOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useUI();
  const [values, setValues] = useState(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const editing = !!initial?.id;

  const set = (k: keyof StreamFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // datetime-local est en heure locale : on envoie une date ISO complète.
    const local = String(fd.get("scheduled_at") ?? "");
    fd.set("scheduled_at", local ? new Date(local).toISOString() : "");
    fd.set("lat", values.lat === null ? "" : String(values.lat));
    fd.set("lng", values.lng === null ? "" : String(values.lng));
    start(async () => {
      const res = editing ? await updateStream(fd) : await createStream(fd);
      if (!res.ok) return setError(res.error);
      toast(res.message ?? "Enregistré");
      onClose();
      if (!editing && res.data) router.push(`/dashboard?cam=${res.data}`);
    });
  }

  return (
    <Modal title={editing ? "Modifier la caméra" : "Nouvelle caméra"} onClose={onClose} maxWidth={620}>
      <form onSubmit={submit}>
        <div className="modal-body stack" style={{ gap: 16 }}>
          {!editing && (
            <p className="text-2 small">
              Une clé de stream privée sera générée automatiquement. Tu pourras la coller dans ta caméra ou dans OBS.
            </p>
          )}
          {values.id && <input type="hidden" name="id" value={values.id} />}
          <div className="field">
            <label htmlFor="title">Titre *</label>
            <input
              id="title"
              name="title"
              className="input"
              value={values.title}
              onChange={set("title")}
              maxLength={100}
              required
              autoFocus
              placeholder="Ex. Place de la République — vue du balcon"
            />
          </div>
          <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
            <div className="field grow" style={{ minWidth: 180 }}>
              <label htmlFor="category">Catégorie</label>
              <select id="category" name="category" className="select" value={values.category} onChange={set("category")}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field grow" style={{ minWidth: 180 }}>
              <label htmlFor="city">Ville / lieu</label>
              <input
                id="city"
                name="city"
                className="input"
                value={values.city}
                onChange={set("city")}
                maxLength={80}
                placeholder="Ex. Paris"
              />
            </div>
          </div>
          <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
            <div className="field grow" style={{ minWidth: 180 }}>
              <label htmlFor="scheduled_at">Direct programmé</label>
              <input
                id="scheduled_at"
                name="scheduled_at"
                type="datetime-local"
                className="input"
                defaultValue={toLocalInput(values.scheduled_at)}
              />
              <span className="hint">Facultatif : affiche un compte à rebours sur la page.</span>
            </div>
            <div className="field grow" style={{ minWidth: 180 }}>
              <label htmlFor="event_id">Événement</label>
              <select id="event_id" name="event_id" className="select" value={values.event_id ?? ""} onChange={set("event_id")}>
                <option value="">Aucun</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} — {formatDateTime(ev.starts_at)}
                  </option>
                ))}
              </select>
              <span className="hint">Regroupe ta caméra avec les autres de l&apos;événement.</span>
            </div>
          </div>
          <div className="field">
            <label>Position sur la carte</label>
            <LocationPicker
              value={values.lat !== null && values.lng !== null ? { lat: values.lat, lng: values.lng } : null}
              onChange={(p) => setValues((v) => ({ ...v, lat: p?.lat ?? null, lng: p?.lng ?? null }))}
            />
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              className="textarea"
              value={values.description}
              onChange={set("description")}
              maxLength={1000}
              placeholder="Ce que montre la caméra, horaires de diffusion, règles du chat…"
            />
            <span className="hint">{values.description.length}/1000</span>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" disabled={pending}>
            {pending ? "Enregistrement…" : editing ? "Enregistrer" : "Créer la caméra"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
