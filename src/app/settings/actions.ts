"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITED } from "@/lib/ratelimit";
import { bio, firstError, formObject, passwordSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/utils";

export async function updateBio(formData: FormData): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth) return { ok: false, error: "Session expirée, reconnecte-toi." };
  const input = bio.safeParse(formData.get("bio") ?? "");
  if (!input.success) return { ok: false, error: firstError(input.error) };

  const { error } = await auth.supabase.from("profiles").update({ bio: input.data }).eq("id", auth.user.id);
  if (error) return { ok: false, error: "Enregistrement impossible." };
  revalidatePath("/settings");
  revalidatePath("/u/[username]", "page");
  return { ok: true, message: "Profil mis à jour" };
}

export async function updatePassword(formData: FormData): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth) return { ok: false, error: "Session expirée, reconnecte-toi." };
  const input = passwordSchema.safeParse(formObject(formData));
  if (!input.success) return { ok: false, error: firstError(input.error) };
  if (!(await rateLimit(`password:${auth.user.id}`, 5, 3600))) return { ok: false, error: RATE_LIMITED };

  const { error } = await auth.supabase.auth.updateUser({ password: input.data.password });
  if (error) return { ok: false, error: "Changement impossible (mot de passe trop faible ou déjà utilisé ?)." };
  return { ok: true, message: "Mot de passe modifié" };
}
