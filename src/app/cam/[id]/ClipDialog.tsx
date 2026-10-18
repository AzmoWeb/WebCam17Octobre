"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Scissors } from "lucide-react";
import { Modal, useUI } from "@/components/UIProvider";
import { Alert, Button, Field, Input } from "@/components/ui";
import Tabs from "@/components/ui/Tabs";
import { createClip } from "./actions";

export default function ClipDialog({ streamId, streamTitle, onClose }: { streamId: string; streamTitle: string; onClose: () => void }) {
  const router = useRouter();
  const { toast } = useUI();
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState<"15" | "30" | "60">("30");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await createClip(streamId, title || `Clip — ${streamTitle}`, Number(duration));
      if (!res.ok) return setError(res.error);
      toast(res.message ?? "Clip créé");
      onClose();
      router.push(`/clip/${res.data}`);
    });
  }

  return (
    <Modal title="Créer un clip" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm text-ink-muted">
            Le clip reprend les dernières secondes du direct. Il reste disponible tant que l&apos;enregistrement est conservé (7 jours).
          </p>
          <Field label="Titre" htmlFor="clip-title">
            <Input id="clip-title" value={title} maxLength={100} autoFocus placeholder={`Clip — ${streamTitle}`} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Durée">
            <Tabs
              value={duration}
              onChange={setDuration}
              className="self-start"
              items={[
                { value: "15", label: "15 s" },
                { value: "30", label: "30 s" },
                { value: "60", label: "60 s" },
              ]}
            />
          </Field>
          {error && <Alert tone="error">{error}</Alert>}
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <Button onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="primary" loading={pending}>
            <Scissors className="size-4" /> Créer le clip
          </Button>
        </div>
      </form>
    </Modal>
  );
}
