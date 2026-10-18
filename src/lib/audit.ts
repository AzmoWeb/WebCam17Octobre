import "server-only";
import { admin } from "@/lib/supabase/admin";
import type { CurrentUser } from "@/lib/supabase/server";

/** Enregistre une action d'administration dans le journal (table admin_audit, service_role). */
export async function logAdminAction(
  actor: CurrentUser,
  action: string,
  targetType: "user" | "stream" | "comment" | "report" | "key",
  targetId: string | number | null,
  details: Record<string, unknown> = {},
) {
  const { error } = await admin.from("admin_audit").insert({
    admin_id: actor.id,
    admin_username: actor.username,
    action,
    target_type: targetType,
    target_id: targetId === null ? null : String(targetId),
    details,
  });
  if (error) console.error("Journal admin :", error.message);
}
