"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/utils";

function readFields(formData: FormData) {
  const startsAt = new Date(String(formData.get("starts_at") ?? ""));
  return {
    title: String(formData.get("title") ?? "").trim().slice(0, 120),
    description: String(formData.get("description") ?? "").trim().slice(0, 2000),
    city: String(formData.get("city") ?? "").trim().slice(0, 80),
    starts_at: Number.isNaN(startsAt.getTime()) ? null : startsAt.toISOString(),
  };
}

export async function saveEvent(formData: FormData): Promise<ActionResult<string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connecte-toi pour créer un événement." };

  const fields = readFields(formData);
  if (!fields.title) return { ok: false, error: "Le titre est obligatoire." };
  if (!fields.starts_at) return { ok: false, error: "La date de début est obligatoire." };

  const id = String(formData.get("id") ?? "");
  const { data, error } = id
    ? await supabase.from("events").update(fields).eq("id", id).select("id").single()
    : await supabase.from("events").insert(fields).select("id").single();
  if (error) return { ok: false, error: "Enregistrement impossible." };

  revalidatePath("/events");
  revalidatePath(`/events/${data.id}`);
  return { ok: true, message: id ? "Événement mis à jour" : "Événement créé !", data: data.id as string };
}

export async function deleteEvent(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", String(formData.get("id")));
  if (error) return { ok: false, error: "Suppression impossible." };
  revalidatePath("/events");
  return { ok: true, message: "Événement supprimé" };
}
