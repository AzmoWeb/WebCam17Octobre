"use client";

import { useActionState, useState } from "react";
import { AtSign, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { signIn, signUp, type AuthState } from "./actions";

function PasswordInput({ name, placeholder, autoComplete }: { name: string; placeholder: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-icon">
      <Lock size={16} />
      <input
        className="input"
        name={name}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        required
        minLength={8}
        autoComplete={autoComplete}
        style={{ paddingRight: 44 }}
      />
      <button
        type="button"
        className="btn btn-ghost btn-icon btn-sm input-action"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Masquer" : "Afficher"}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

function Feedback({ state }: { state: AuthState }) {
  if (!state) return null;
  if (state.error) return <div className="alert alert-error">{state.error}</div>;
  if (state.message) return <div className="alert alert-success">{state.message}</div>;
  return null;
}

export default function AuthForms({ initialMode, message }: { initialMode: "login" | "signup"; message?: string }) {
  const [mode, setMode] = useState(initialMode);
  const [loginState, loginAction, loginPending] = useActionState(signIn, null);
  const [signupState, signupAction, signupPending] = useActionState(signUp, null);

  return (
    <div className="auth-form stack" style={{ gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 26, fontWeight: 800 }}>{mode === "login" ? "Bon retour 👋" : "Créer un compte"}</h2>
        <p className="muted" style={{ marginTop: 6 }}>
          {mode === "login" ? "Connecte-toi pour gérer tes caméras et discuter." : "C'est gratuit et ça prend 30 secondes."}
        </p>
      </div>

      <div className="tabs">
        <button className={cn("tab grow", mode === "login" && "active")} style={{ justifyContent: "center" }} onClick={() => setMode("login")}>
          Connexion
        </button>
        <button className={cn("tab grow", mode === "signup" && "active")} style={{ justifyContent: "center" }} onClick={() => setMode("signup")}>
          Inscription
        </button>
      </div>

      {message && <div className="alert alert-info">{message}</div>}

      {mode === "login" ? (
        <form action={loginAction} className="stack" style={{ gap: 14 }}>
          <div className="field">
            <label>E-mail</label>
            <div className="input-icon">
              <Mail size={16} />
              <input className="input" name="email" type="email" placeholder="toi@exemple.fr" required autoComplete="email" />
            </div>
          </div>
          <div className="field">
            <label>Mot de passe</label>
            <PasswordInput name="password" placeholder="••••••••" autoComplete="current-password" />
          </div>
          <Feedback state={loginState} />
          <button className="btn btn-primary btn-lg btn-block" disabled={loginPending}>
            {loginPending ? "Connexion…" : "Se connecter"}
          </button>
          <p className="muted small" style={{ textAlign: "center" }}>
            Pas encore de compte ?{" "}
            <button type="button" className="btn-link" onClick={() => setMode("signup")}>
              Inscris-toi
            </button>
          </p>
        </form>
      ) : (
        <form action={signupAction} className="stack" style={{ gap: 14 }}>
          <div className="field">
            <label>Pseudo</label>
            <div className="input-icon">
              <AtSign size={16} />
              <input
                className="input"
                name="username"
                placeholder="ton_pseudo"
                required
                minLength={3}
                maxLength={30}
                pattern="[A-Za-z0-9_]+"
                title="Lettres, chiffres ou _"
              />
            </div>
            <span className="hint">3 à 30 caractères : lettres, chiffres ou _. Visible publiquement.</span>
          </div>
          <div className="field">
            <label>E-mail</label>
            <div className="input-icon">
              <Mail size={16} />
              <input className="input" name="email" type="email" placeholder="toi@exemple.fr" required autoComplete="email" />
            </div>
          </div>
          <div className="field">
            <label>Mot de passe</label>
            <PasswordInput name="password" placeholder="8 caractères minimum" autoComplete="new-password" />
          </div>
          <Feedback state={signupState} />
          <button className="btn btn-gradient btn-lg btn-block" disabled={signupPending}>
            {signupPending ? "Création…" : "Créer mon compte"}
          </button>
          <p className="muted small" style={{ textAlign: "center" }}>
            Déjà inscrit ?{" "}
            <button type="button" className="btn-link" onClick={() => setMode("login")}>
              Connecte-toi
            </button>
          </p>
        </form>
      )}
    </div>
  );
}
