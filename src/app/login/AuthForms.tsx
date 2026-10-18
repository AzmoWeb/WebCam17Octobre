"use client";

import { useActionState, useState, useTransition } from "react";
import Script from "next/script";
import { AtSign, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Alert, Button } from "@/components/ui";
import Tabs from "@/components/ui/Tabs";
import { cn } from "@/lib/utils";
import { signIn, signInWithProvider, signUp, type AuthState } from "./actions";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const inputCls =
  "h-11 w-full rounded-lg border border-line bg-panel-2 pr-3 pl-10 text-sm placeholder:text-ink-dim focus:border-brand focus:bg-panel focus:outline-none focus:ring-4 focus:ring-brand/20";

function IconInput({ icon: Icon, ...props }: React.ComponentProps<"input"> & { icon: typeof Mail }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-dim" />
      <input className={inputCls} {...props} />
    </div>
  );
}

function PasswordInput({ autoComplete, placeholder }: { autoComplete: string; placeholder: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-dim" />
      <input
        className={cn(inputCls, "pr-11")}
        name="password"
        type={show ? "text" : "password"}
        placeholder={placeholder}
        required
        minLength={autoComplete === "new-password" ? 8 : 1}
        maxLength={128}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-ink-dim hover:bg-panel-3 hover:text-ink"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

/** Captcha Cloudflare Turnstile (si configuré). Le widget ajoute un champ caché au formulaire. */
function Captcha({ nonce }: { nonce?: string }) {
  if (!TURNSTILE_SITE_KEY) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" nonce={nonce} />
      <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-theme="dark" data-language="fr" />
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[13px] font-semibold text-ink-muted">{children}</span>;
}

function Feedback({ state }: { state: AuthState }) {
  if (state?.error) return <Alert tone="error">{state.error}</Alert>;
  if (state?.message) return <Alert tone="success">{state.message}</Alert>;
  return null;
}

function OAuthButtons() {
  const [pending, start] = useTransition();
  const [provider, setProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function login(p: "google" | "github") {
    setProvider(p);
    setError(null);
    start(async () => {
      const res = await signInWithProvider(p); // Redirige vers le fournisseur si tout va bien.
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => login("google")} loading={pending && provider === "google"} disabled={pending}>
          {!(pending && provider === "google") && <GoogleIcon />} Google
        </Button>
        <Button onClick={() => login("github")} loading={pending && provider === "github"} disabled={pending}>
          {!(pending && provider === "github") && <GitHubIcon />} GitHub
        </Button>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex items-center gap-3 text-xs text-ink-dim">
        <span className="h-px flex-1 bg-line" /> ou avec ton e-mail <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}

export default function AuthForms({ initialMode, message, nonce }: { initialMode: "login" | "signup"; message?: string; nonce?: string }) {
  const [mode, setMode] = useState(initialMode);
  const [loginState, loginAction, loginPending] = useActionState(signIn, null);
  const [signupState, signupAction, signupPending] = useActionState(signUp, null);

  return (
    <div className="flex flex-col gap-5 p-5 sm:p-10">
      <div>
        <h2 className="text-2xl font-extrabold">{mode === "login" ? "Bon retour 👋" : "Créer un compte"}</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {mode === "login" ? "Connecte-toi pour gérer tes caméras et discuter." : "Gratuit, en 30 secondes."}
        </p>
      </div>

      <Tabs
        value={mode}
        onChange={setMode}
        stretch
        items={[
          { value: "login", label: "Connexion" },
          { value: "signup", label: "Inscription" },
        ]}
      />

      {message && <Alert tone="info">{message}</Alert>}

      <OAuthButtons />

      {mode === "login" ? (
        <form action={loginAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <Label>E-mail</Label>
            <IconInput icon={Mail} name="email" type="email" placeholder="toi@exemple.fr" required maxLength={254} autoComplete="email" />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label>Mot de passe</Label>
            <PasswordInput autoComplete="current-password" placeholder="••••••••" />
          </label>
          <Captcha nonce={nonce} />
          <Feedback state={loginState} />
          <Button type="submit" variant="primary" size="lg" block loading={loginPending}>
            Se connecter
          </Button>
        </form>
      ) : (
        <form action={signupAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <Label>Pseudo</Label>
            <IconInput
              icon={AtSign}
              name="username"
              placeholder="ton_pseudo"
              required
              minLength={3}
              maxLength={30}
              pattern="[A-Za-z0-9_]+"
              title="Lettres, chiffres ou _"
              autoComplete="username"
            />
            <span className="text-xs text-ink-dim">3 à 30 caractères : lettres, chiffres ou _. Visible publiquement.</span>
          </label>
          <label className="flex flex-col gap-1.5">
            <Label>E-mail</Label>
            <IconInput icon={Mail} name="email" type="email" placeholder="toi@exemple.fr" required maxLength={254} autoComplete="email" />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label>Mot de passe</Label>
            <PasswordInput autoComplete="new-password" placeholder="8 caractères minimum" />
          </label>
          <Captcha nonce={nonce} />
          <Feedback state={signupState} />
          <Button type="submit" variant="primary" size="lg" block loading={signupPending}>
            Créer mon compte
          </Button>
        </form>
      )}
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
