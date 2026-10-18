import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/ui";
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
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageTitle icon={<Settings className="size-7" />} title="Paramètres" />
      <SettingsForms username={profile?.username ?? ""} email={user.email ?? ""} bio={profile?.bio ?? ""} />
    </div>
  );
}
