"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui";
import { useUI } from "./UIProvider";
import { toggleFollow } from "@/app/cam/[id]/actions";

type Props = { userId: string; username: string; initial: boolean; followers?: number; loggedIn: boolean; size?: "sm" | "md" };

export default function FollowButton({ userId, username, initial, followers, loggedIn, size = "md" }: Props) {
  const router = useRouter();
  const { toast } = useUI();
  const [following, setFollowing] = useState(initial);
  const [count, setCount] = useState(followers ?? 0);
  const [pending, start] = useTransition();

  function toggle() {
    if (!loggedIn) {
      toast("Connecte-toi pour t'abonner.", "info");
      return router.push("/login");
    }
    const next = !following;
    setFollowing(next);
    setCount((c) => c + (next ? 1 : -1));
    start(async () => {
      const res = await toggleFollow(userId, next);
      if (!res.ok) {
        setFollowing(!next);
        setCount((c) => c + (next ? -1 : 1));
        return toast(res.error, "error");
      }
      toast(next ? `Tu suis @${username}` : `Tu ne suis plus @${username}`, next ? "success" : "info");
    });
  }

  return (
    <Button variant={following ? "secondary" : "primary"} size={size} onClick={toggle} disabled={pending}>
      {following ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}
      {following ? "Abonné" : "S'abonner"}
      {followers !== undefined && <span className="tabular-nums opacity-80">{count}</span>}
    </Button>
  );
}
