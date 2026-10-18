"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal, useUI } from "@/components/UIProvider";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import { fromLocalInput, toLocalInput } from "@/lib/dates";
import { saveEvent } from "./actions";

export type EventFields = { id?: string; title: string; description: string; city: string; starts_at: string };

export default function EventForm({ initial, onClose }: { initial?: EventFields; onClose: () => void }) {
  const router = useRouter();
  const { toast } = useUI();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const editing = !!initial?.id;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("starts_at", fromLocalInput(String(fd.get("starts_at") ?? "")));
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
    <Modal title={editing ? "Modifier l'événement" : "Nouvel événement"} onClose={onClose} size="lg">
      <form onSubmit={submit}>
        <div className="flex flex-col gap-4 p-5">
          {initial?.id && <input type="hidden" name="id" value={initial.id} />}
          <Field label="Titre *" htmlFor="ev-title">
            <Input id="ev-title" name="title" defaultValue={initial?.title} maxLength={120} required autoFocus placeholder="Ex. Manifestation du 12 mai — Paris" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Début *" htmlFor="ev-start">
              <Input id="ev-start" name="starts_at" type="datetime-local" defaultValue={toLocalInput(initial?.starts_at)} required />
            </Field>
            <Field label="Ville / lieu" htmlFor="ev-city">
              <Input id="ev-city" name="city" defaultValue={initial?.city} maxLength={80} placeholder="Ex. Paris" />
            </Field>
          </div>
          <Field label="Description" htmlFor="ev-desc" hint="Les streamers rattachent ensuite leurs caméras depuis le Studio.">
            <Textarea id="ev-desc" name="description" defaultValue={initial?.description} maxLength={2000} placeholder="Parcours, horaires, consignes…" />
          </Field>
          {error && <Alert tone="error">{error}</Alert>}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <Button onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="primary" loading={pending}>
            {editing ? "Enregistrer" : "Créer l'événement"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
