import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

// Client navigateur ANONYME : il ne sert qu'à recevoir les données publiques en temps réel
// (chat, présence, réactions). La session est dans un cookie HttpOnly illisible par le
// JavaScript ; toutes les écritures passent par des server actions.
let client: SupabaseClient | null = null;

export function createClient() {
  client ??= createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
