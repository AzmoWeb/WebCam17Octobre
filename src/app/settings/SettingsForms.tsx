"use client";

import { useRef, useState, useTransition } from "react";
import { KeyRound, Save, User } from "lucide-react";
import { useUI } from "@/components/UIProvider";
import Avatar from "@/components/Avatar";
import type { ActionResult } from "@/lib/utils";
import { updateBio, updatePassword } from "./actions";

function useActionForm(action: (fd: FormData) => Promise<ActionResult>, onSuccess?: () => void) {
  const { toast } = useUI();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await action(fd);
      if (res.ok) {
        setError(null);
        toast(res.message ?? "Enregistré");
        onSuccess?.();
      } else setError(res.error);
    });
  };
  return { pending, error, submit };
}

export default function SettingsForms({ username, email, bio }: { username: string; email: string; bio: string }) {
  const [bioText, setBioText] = useState(bio);
  const pwdForm = useRef<HTMLFormElement>(null);
  const profile = useActionForm(updateBio);
  const password = useActionForm(updatePassword, () => pwdForm.current?.reset());

  return (
    <div className="stack-lg">
      <form className="card" onSubmit={profile.submit}>
        <div className="card-header">
          <h3>
            <User size={18} /> Profil public
          </h3>
        </div>
        <div className="card-body stack" style={{ gap: 16 }}>
          <div className="row" style={{ gap: 16 }}>
            <Avatar name={username} size={64} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>@{username}</div>
              <div className="muted small">{email}</div>
            </div>
          </div>
          <div className="field">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              name="bio"
              className="textarea"
              maxLength={300}
              value={bioText}
              onChange={(e) => setBioText(e.target.value)}
              placeholder="Présente-toi en quelques mots : ce que tu filmes, où, quand…"
            />
            <span className="hint">{bioText.length}/300 — affichée sur ton profil public.</span>
          </div>
          {profile.error && <div className="alert alert-error">{profile.error}</div>}
          <div>
            <button className="btn btn-primary" disabled={profile.pending}>
              <Save size={16} /> {profile.pending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </form>

      <form className="card" onSubmit={password.submit} ref={pwdForm}>
        <div className="card-header">
          <h3>
            <KeyRound size={18} /> Mot de passe
          </h3>
        </div>
        <div className="card-body stack" style={{ gap: 16 }}>
          <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
            <div className="field grow" style={{ minWidth: 200 }}>
              <label htmlFor="password">Nouveau mot de passe</label>
              <input id="password" name="password" type="password" className="input" minLength={8} required autoComplete="new-password" />
            </div>
            <div className="field grow" style={{ minWidth: 200 }}>
              <label htmlFor="confirm">Confirmation</label>
              <input id="confirm" name="confirm" type="password" className="input" minLength={8} required autoComplete="new-password" />
            </div>
          </div>
          {password.error && <div className="alert alert-error">{password.error}</div>}
          <div>
            <button className="btn" disabled={password.pending}>
              {password.pending ? "Modification…" : "Changer le mot de passe"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
