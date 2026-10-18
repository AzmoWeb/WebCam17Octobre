import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SESSION_COOKIE_OPTIONS } from "./cookies";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, { ...options, ...SESSION_COOKIE_OPTIONS }),
          );
        } catch {
          // Appelé depuis un Server Component : le middleware rafraîchit la session.
        }
      },
    },
  });
}

export type Role = "user" | "moderator" | "admin";

export type CurrentUser = {
  id: string;
  email?: string;
  username: string;
  role: Role;
  isAdmin: boolean;
  isBanned: boolean;
  unreadMessages: number;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("profiles").select("username, role, is_banned").eq("id", user.id).single(),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).is("read_at", null),
  ]);

  const role = (profile?.role as Role | undefined) ?? "user";
  return {
    id: user.id,
    email: user.email,
    username: (profile?.username as string) ?? "",
    role,
    isAdmin: role === "admin",
    isBanned: !!profile?.is_banned,
    unreadMessages: count ?? 0,
  };
}

/** Utilisateur connecté (vérifié auprès de Supabase), sinon null. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

/** Administrateur (rôle relu en base à chaque appel), sinon null. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  return user?.isAdmin && !user.isBanned ? user : null;
}
