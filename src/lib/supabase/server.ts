import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Appelé depuis un Server Component : le middleware rafraîchit la session.
          }
        },
      },
    },
  );
}

export type CurrentUser = {
  id: string;
  email?: string;
  username: string;
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
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .is("read_at", null),
  ]);

  return {
    id: user.id,
    email: user.email,
    username: (profile?.username as string) ?? "",
    isAdmin: !!profile?.is_admin,
    isBanned: !!profile?.is_banned,
    unreadMessages: count ?? 0,
  };
}

/** Exige un administrateur (vérifié en base), sinon null. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  return user?.isAdmin ? user : null;
}
