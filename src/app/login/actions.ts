"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string } | null;

/** Jeton du captcha Turnstile (champ ajouté par le widget), si activé. */
const captchaToken = (formData: FormData) => String(formData.get("cf-turnstile-response") ?? "") || undefined;
const CAPTCHA_ERROR = "Vérification anti-robot échouée, réessaie.";

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    options: { captchaToken: captchaToken(formData) },
  });
  if (error) {
    return {
      error:
        error.code === "email_not_confirmed"
          ? "Confirme d'abord ton adresse e-mail (lien reçu par mail)."
          : error.message.toLowerCase().includes("captcha")
            ? CAPTCHA_ERROR
            : "E-mail ou mot de passe incorrect.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) {
    return { error: "Pseudo : 3 à 30 caractères (lettres, chiffres ou _)." };
  }
  if (password.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };

  const supabase = await createClient();
  const { data: taken } = await supabase.from("profiles").select("id").ilike("username", username).maybeSingle();
  if (taken) return { error: "Ce pseudo est déjà pris." };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
      captchaToken: captchaToken(formData),
    },
  });
  if (error) {
    return { error: error.message.toLowerCase().includes("captcha") ? CAPTCHA_ERROR : `Inscription impossible : ${error.message}` };
  }

  // Sans session, Supabase attend la confirmation par e-mail.
  if (!data.session) return { message: "Compte créé ! Clique sur le lien reçu par e-mail pour l'activer." };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
