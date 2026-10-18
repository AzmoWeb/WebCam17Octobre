import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import SettingsForms from "./SettingsForms";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("username, bio").eq("id", user.id).single();

  return (
    <div className="stack-lg" style={{ maxWidth: 760, margin: "0 auto" }}>
      <h1 className="section-title" style={{ fontSize: 28 }}>
        <Settings size={26} /> Paramètres
      </h1>
      <SettingsForms username={profile?.username ?? ""} email={user.email ?? ""} bio={profile?.bio ?? ""} />
    </div>
  );
}
