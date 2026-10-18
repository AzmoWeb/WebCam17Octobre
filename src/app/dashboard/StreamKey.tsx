"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, Link2, RefreshCw, Server, ShieldAlert } from "lucide-react";
import ActionButton from "@/components/ActionButton";
import { regenerateKey } from "./actions";

function CopyField({ label, icon, value, display }: { label: string; icon: React.ReactNode; value: string; display?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="field">
      <label className="row" style={{ gap: 6 }}>
        {icon} {label}
      </label>
      <div className="key-field">
        <code>{display ?? value}</code>
        <button type="button" className="btn btn-sm" onClick={copy}>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copié" : "Copier"}
        </button>
      </div>
    </div>
  );
}

export default function StreamKey({ streamId, rtmpUrl, streamKey }: { streamId: string; rtmpUrl: string; streamKey: string }) {
  const [visible, setVisible] = useState(false);
  const masked = "•".repeat(24);

  return (
    <div className="card">
      <div className="card-header">
        <h3>
          <KeyRound size={18} /> Connexion de la caméra
        </h3>
        <div className="row">
          <button className="btn btn-sm" onClick={() => setVisible((v) => !v)}>
            {visible ? <EyeOff size={14} /> : <Eye size={14} />} {visible ? "Masquer" : "Afficher"}
          </button>
          <ActionButton
            action={regenerateKey}
            fields={{ id: streamId }}
            className="btn btn-sm btn-danger"
            confirm={{
              title: "Régénérer la clé de stream ?",
              message: "L'ancienne clé cessera de fonctionner immédiatement. Il faudra coller la nouvelle dans ta caméra ou OBS.",
              confirmLabel: "Régénérer",
              danger: true,
            }}
          >
            <RefreshCw size={14} /> Régénérer
          </ActionButton>
        </div>
      </div>
      <div className="card-body stack" style={{ gap: 16 }}>
        <div className="alert alert-info small">
          <ShieldAlert size={18} style={{ flexShrink: 0, color: "var(--warning)" }} />
          <span>
            Ne partage jamais ta clé : toute personne qui la possède peut diffuser sur ta caméra. En cas de fuite,
            régénère-la.
          </span>
        </div>
        <CopyField
          label="URL complète (caméra IP, appli mobile)"
          icon={<Link2 size={14} />}
          value={`${rtmpUrl}/${streamKey}`}
          display={`${rtmpUrl}/${visible ? streamKey : masked}`}
        />
        <div className="row" style={{ gap: 16, alignItems: "flex-start" }}>
          <div className="grow" style={{ minWidth: 240 }}>
            <CopyField label="Serveur (OBS)" icon={<Server size={14} />} value={rtmpUrl} />
          </div>
          <div className="grow" style={{ minWidth: 240 }}>
            <CopyField
              label="Clé de stream (OBS)"
              icon={<KeyRound size={14} />}
              value={streamKey}
              display={visible ? streamKey : masked}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
