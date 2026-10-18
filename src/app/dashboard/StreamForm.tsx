"use client";

import { useState, useTransition } from "react";
import { Modal, useUI } from "@/components/UIProvider";
import LocationPicker from "@/components/LocationPicker";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { CATEGORIES, formatDateTime } from "@/lib/utils";
import { fromLocalInput, toLocalInput } from "@/lib/dates";
import { createStream, updateStream, type NewKey } from "./actions";

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
  onCreated,
}: {
  initial?: StreamFields;
  events: EventOption[];
  onClose: () => void;
  onCreated?: (created: NewKey) => void;
}) {
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
    fd.set("scheduled_at", fromLocalInput(String(fd.get("scheduled_at") ?? "")));
    fd.set("lat", values.lat === null ? "" : String(values.lat));
    fd.set("lng", values.lng === null ? "" : String(values.lng));
    start(async () => {
      if (editing) {
        const res = await updateStream(fd);
        if (!res.ok) return setError(res.error);
        toast(res.message ?? "Enregistré");
        return onClose();
      }
      const res = await createStream(fd);
      if (!res.ok) return setError(res.error);
      toast(res.message ?? "Caméra créée");
      onCreated?.(res.data!);
      onClose();
    });
  }

  return (
    <Modal title={editing ? "Modifier la caméra" : "Nouvelle caméra"} onClose={onClose} size="lg">
      <form onSubmit={submit}>
        <div className="flex flex-col gap-4 p-5">
          {!editing && <Alert tone="info">Une clé de stream privée sera générée et affichée une seule fois après la création.</Alert>}
          {values.id && <input type="hidden" name="id" value={values.id} />}
          <Field label="Titre *" htmlFor="title">
            <Input
              id="title"
              name="title"
              value={values.title}
              onChange={set("title")}
              maxLength={100}
              required
              autoFocus
              placeholder="Ex. Place de la République — vue du balcon"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Catégorie" htmlFor="category">
              <Select id="category" name="category" value={values.category} onChange={set("category")}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Ville / lieu" htmlFor="city">
              <Input id="city" name="city" value={values.city} onChange={set("city")} maxLength={80} placeholder="Ex. Paris" />
            </Field>
            <Field label="Direct programmé" htmlFor="scheduled_at" hint="Facultatif : compte à rebours sur la page.">
              <Input id="scheduled_at" name="scheduled_at" type="datetime-local" defaultValue={toLocalInput(values.scheduled_at)} />
            </Field>
            <Field label="Événement" htmlFor="event_id" hint="Regroupe ta caméra avec celles de l'événement.">
              <Select id="event_id" name="event_id" value={values.event_id ?? ""} onChange={set("event_id")}>
                <option value="">Aucun</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} — {formatDateTime(ev.starts_at)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Position sur la carte" hint="Affiche ta caméra sur la carte en direct.">
            <LocationPicker
              value={values.lat !== null && values.lng !== null ? { lat: values.lat, lng: values.lng } : null}
              onChange={(p) => setValues((v) => ({ ...v, lat: p?.lat ?? null, lng: p?.lng ?? null }))}
            />
          </Field>
          <Field label="Description" htmlFor="description" hint={`${values.description.length}/1000`}>
            <Textarea
              id="description"
              name="description"
              value={values.description}
              onChange={set("description")}
              maxLength={1000}
              placeholder="Ce que montre la caméra, horaires, règles du chat…"
            />
          </Field>
          {error && <Alert tone="error">{error}</Alert>}
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-line bg-panel px-5 py-4">
          <Button onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="primary" loading={pending}>
            {editing ? "Enregistrer" : "Créer la caméra"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
