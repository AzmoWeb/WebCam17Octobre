"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/utils";

export async function updateBio(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expirée, reconnecte-toi." };

  const bio = String(formData.get("bio") ?? "").trim().slice(0, 300);
  const { error } = await supabase.from("profiles").update({ bio }).eq("id", user.id);
  if (error) return { ok: false, error: "Enregistrement impossible." };

  revalidatePath("/settings");
  revalidatePath("/u/[username]", "page");
  return { ok: true, message: "Profil mis à jour" };
}

export async function updatePassword(formData: FormData): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { ok: false, error: "8 caractères minimum." };
  if (password !== String(formData.get("confirm") ?? "")) {
    return { ok: false, error: "Les mots de passe ne correspondent pas." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: `Changement impossible : ${error.message}` };
  return { ok: true, message: "Mot de passe modifié" };
}
