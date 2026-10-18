"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal, useUI } from "@/components/UIProvider";
import { CATEGORIES } from "@/lib/utils";
import { createStream, updateStream } from "./actions";

export type StreamFields = { id?: string; title: string; description: string; category: string; city: string };

const EMPTY: StreamFields = { title: "", description: "", category: "manifestation", city: "" };

/** Fenêtre de création / modification d'une caméra. */
export default function StreamForm({ initial, onClose }: { initial?: StreamFields; onClose: () => void }) {
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
    start(async () => {
      const res = editing ? await updateStream(fd) : await createStream(fd);
      if (!res.ok) return setError(res.error);
      toast(res.message ?? "Enregistré");
      onClose();
      if (!editing && res.data) router.push(`/dashboard?cam=${res.data}`);
    });
  }

  return (
    <Modal title={editing ? "Modifier la caméra" : "Nouvelle caméra"} onClose={onClose} maxWidth={540}>
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
            <div className="field grow">
              <label htmlFor="category">Catégorie</label>
              <select id="category" name="category" className="select" value={values.category} onChange={set("category")}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field grow">
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
