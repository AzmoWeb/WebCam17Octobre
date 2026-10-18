"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { clientIp, rateLimit, RATE_LIMITED } from "@/lib/ratelimit";
import { firstError, formObject, signInSchema, signUpSchema } from "@/lib/validation";

export type AuthState = { error?: string; message?: string } | null;

/** Jeton du captcha Turnstile (champ ajouté par le widget), si activé. */
const captchaToken = (formData: FormData) => String(formData.get("cf-turnstile-response") ?? "").slice(0, 4096) || undefined;
const CAPTCHA_ERROR = "Vérification anti-robot échouée, réessaie.";
// Message volontairement générique : ne révèle pas si l'e-mail existe.
const BAD_CREDENTIALS = "E-mail ou mot de passe incorrect.";

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const input = signInSchema.safeParse(formObject(formData));
  if (!input.success) return { error: BAD_CREDENTIALS };

  const ip = await clientIp();
  // 10 essais / 15 min par IP, 5 par compte.
  if (!(await rateLimit(`login-ip:${ip}`, 10, 900)) || !(await rateLimit(`login:${input.data.email}`, 5, 900))) {
    return { error: RATE_LIMITED };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ ...input.data, options: { captchaToken: captchaToken(formData) } });
  if (error) {
    if (error.code === "email_not_confirmed") return { error: "Confirme d'abord ton adresse e-mail (lien reçu par mail)." };
    if (error.message.toLowerCase().includes("captcha")) return { error: CAPTCHA_ERROR };
    return { error: BAD_CREDENTIALS };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const input = signUpSchema.safeParse(formObject(formData));
  if (!input.success) return { error: firstError(input.error) };

  // 5 inscriptions / heure par IP.
  if (!(await rateLimit(`signup-ip:${await clientIp()}`, 5, 3600))) return { error: RATE_LIMITED };

  const supabase = await createClient();
  const { data: taken } = await supabase.from("profiles").select("id").ilike("username", input.data.username).maybeSingle();
  if (taken) return { error: "Ce pseudo est déjà pris." };

  const { data, error } = await supabase.auth.signUp({
    email: input.data.email,
    password: input.data.password,
    options: {
      data: { username: input.data.username },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
      captchaToken: captchaToken(formData),
    },
  });
  if (error) {
    if (error.message.toLowerCase().includes("captcha")) return { error: CAPTCHA_ERROR };
    if (error.code === "weak_password") return { error: "Mot de passe trop faible." };
    return { error: "Inscription impossible. Vérifie tes informations et réessaie." };
  }

  // Sans session, Supabase attend la confirmation par e-mail.
  if (!data.session) return { message: "Compte créé ! Clique sur le lien reçu par e-mail pour l'activer." };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** Connexion Google / GitHub : le serveur obtient l'URL du fournisseur (PKCE, cookie HttpOnly). */
export async function signInWithProvider(provider: "google" | "github"): Promise<AuthState> {
  if (provider !== "google" && provider !== "github") return { error: "Fournisseur inconnu." };
  if (!(await rateLimit(`oauth-ip:${await clientIp()}`, 20, 900))) return { error: RATE_LIMITED };

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${origin}/auth/callback` } });
  if (error || !data.url) {
    return { error: `Connexion ${provider === "google" ? "Google" : "GitHub"} indisponible pour le moment.` };
  }
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
