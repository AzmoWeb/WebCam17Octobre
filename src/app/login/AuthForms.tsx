"use client";

import { useActionState, useState } from "react";
import Script from "next/script";
import { createClient } from "@/lib/supabase/client";
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

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** Captcha Cloudflare Turnstile (seulement si NEXT_PUBLIC_TURNSTILE_SITE_KEY est défini).
 *  Le widget ajoute un champ caché « cf-turnstile-response » au formulaire. */
function Captcha() {
  if (!TURNSTILE_SITE_KEY) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
      <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-theme="auto" data-language="fr" />
    </>
  );
}

function OAuthButtons() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function login(provider: "google" | "github") {
    setBusy(provider);
    setError(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setBusy(null);
      setError(
        error.message.includes("not enabled")
          ? `Connexion ${provider === "google" ? "Google" : "GitHub"} pas encore activée dans Supabase.`
          : "Connexion impossible.",
      );
    }
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <button type="button" className="btn oauth-btn" onClick={() => login("google")} disabled={!!busy}>
          <GoogleIcon /> {busy === "google" ? "Redirection…" : "Google"}
        </button>
        <button type="button" className="btn oauth-btn" onClick={() => login("github")} disabled={!!busy}>
          <GitHubIcon /> {busy === "github" ? "Redirection…" : "GitHub"}
        </button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="row muted tiny" style={{ gap: 10 }}>
        <span className="grow" style={{ height: 1, background: "var(--border)" }} />
        ou avec ton e-mail
        <span className="grow" style={{ height: 1, background: "var(--border)" }} />
      </div>
    </div>
  );
}

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

const GitHubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 23.5 12C23.5 5.7 18.3.5 12 .5z" />
  </svg>
);

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

      <OAuthButtons />

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
          <Captcha />
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
          <Captcha />
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
