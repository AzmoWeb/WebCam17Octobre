"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUI } from "./UIProvider";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  username: string;
  initial: boolean;
  followers?: number;
  loggedIn: boolean;
  small?: boolean;
};

/** S'abonner / se désabonner d'un streamer. */
export default function FollowButton({ userId, username, initial, followers, loggedIn, small }: Props) {
  const router = useRouter();
  const { toast } = useUI();
  const [following, setFollowing] = useState(initial);
  const [count, setCount] = useState(followers ?? 0);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!loggedIn) {
      toast("Connecte-toi pour t'abonner.", "info");
      router.push("/login");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const next = !following;
    const { error } = next
      ? await supabase.from("follows").insert({ followed_id: userId })
      : await supabase.from("follows").delete().eq("followed_id", userId);
    setBusy(false);
    if (error) return toast("Action impossible.", "error");
    setFollowing(next);
    setCount((c) => c + (next ? 1 : -1));
    toast(next ? `Tu suis maintenant @${username}` : `Tu ne suis plus @${username}`, next ? "success" : "info");
  }

  return (
    <button className={cn("btn", small && "btn-sm", following ? "active" : "btn-primary")} onClick={toggle} disabled={busy}>
      {following ? <UserCheck size={small ? 14 : 16} /> : <UserPlus size={small ? 14 : 16} />}
      {following ? "Abonné" : "S'abonner"}
      {followers !== undefined && (
        <span className="badge" style={{ height: 20 }}>
          {count}
        </span>
      )}
    </button>
  );
}
