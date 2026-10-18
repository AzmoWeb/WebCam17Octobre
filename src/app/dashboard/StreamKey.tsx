"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, Link2, RefreshCw, Server, ShieldCheck } from "lucide-react";
import { useUI } from "@/components/UIProvider";
import { Alert, Button, Card, CardHeader } from "@/components/ui";
import { regenerateKey } from "./actions";

function CopyRow({ label, icon, value, display }: { label: string; icon: React.ReactNode; value: string; display?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted">
        {icon} {label}
      </span>
      <div className="flex items-center gap-2 rounded-lg border border-line bg-panel-2 py-1.5 pr-1.5 pl-3">
        <code className="min-w-0 flex-1 truncate font-mono text-[13px]">{display ?? value}</code>
        <Button size="sm" onClick={copy}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Copié" : "Copier"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Connexion de la caméra. La clé n'est stockée que hashée : elle n'est visible qu'une
 * fois, juste après la création ou la régénération (`revealedKey`).
 */
export default function StreamKey({ streamId, rtmpUrl, revealedKey }: { streamId: string; rtmpUrl: string; revealedKey?: string }) {
  const { confirm, toast } = useUI();
  const [key, setKey] = useState(revealedKey ?? null);
  const [visible, setVisible] = useState(false);
  const [pending, start] = useTransition();

  async function regenerate() {
    const ok = await confirm({
      title: "Générer une nouvelle clé ?",
      message: "L'ancienne clé cessera de fonctionner immédiatement : il faudra coller la nouvelle URL dans ta caméra ou OBS.",
      confirmLabel: "Générer",
      danger: true,
    });
    if (!ok) return;
    const fd = new FormData();
    fd.set("id", streamId);
    start(async () => {
      const res = await regenerateKey(fd);
      if (!res.ok) return toast(res.error, "error");
      setKey(res.data!.key);
      setVisible(true);
      toast(res.message ?? "Nouvelle clé générée");
    });
  }

  const masked = "•".repeat(24);
  const streamKey = key ? `${streamId}?key=${key}` : null;

  return (
    <Card>
      <CardHeader
        icon={<KeyRound className="size-[18px]" />}
        title="Connexion de la caméra"
        actions={
          <Button size="sm" variant={key ? "secondary" : "primary"} onClick={regenerate} loading={pending}>
            {!pending && <RefreshCw className="size-3.5" />} {key ? "Régénérer" : "Générer une clé"}
          </Button>
        }
      />
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <CopyRow label="Serveur (OBS)" icon={<Server className="size-3.5" />} value={rtmpUrl} />

        {streamKey ? (
          <>
            <Alert tone="warning">
              <strong>Copie ta clé maintenant :</strong> pour ta sécurité, elle n&apos;est jamais stockée en clair et ne sera plus
              affichée après avoir quitté cette page.
            </Alert>
            <CopyRow
              label="Clé de stream (OBS)"
              icon={<KeyRound className="size-3.5" />}
              value={streamKey}
              display={visible ? streamKey : `${streamId}?key=${masked}`}
            />
            <CopyRow
              label="URL complète (caméra IP, appli mobile)"
              icon={<Link2 className="size-3.5" />}
              value={`${rtmpUrl}/${streamKey}`}
              display={visible ? `${rtmpUrl}/${streamKey}` : `${rtmpUrl}/${streamId}?key=${masked}`}
            />
            <Button size="sm" variant="ghost" className="self-start" onClick={() => setVisible((v) => !v)}>
              {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />} {visible ? "Masquer" : "Afficher"}
            </Button>
          </>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-line bg-panel-2 p-3.5 text-sm text-ink-muted">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" />
            <p>
              Ta clé est enregistrée de façon chiffrée (hash) : personne, pas même le site, ne peut la relire. Si tu l&apos;as
              perdue, génère-en une nouvelle. Format attendu dans OBS :{" "}
              <code className="rounded bg-panel-3 px-1.5 py-0.5 font-mono text-xs break-all">{streamId}?key=…</code>
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
