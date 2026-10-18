import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getStreamSummaries } from "@/lib/streams";
import HomeClient from "./HomeClient";

export default async function HomePage() {
  const supabase = await createClient();
  const [
    streams,
    {
      data: { user },
    },
  ] = await Promise.all([getStreamSummaries(), supabase.auth.getUser()]);

  const { data: follows } = user
    ? await supabase.from("follows").select("followed_id").eq("follower_id", user.id)
    : { data: [] };

  return (
    <Suspense>
      <HomeClient
        streams={streams}
        loggedIn={!!user}
        followedIds={(follows ?? []).map((f) => f.followed_id as string)}
      />
    </Suspense>
  );
}
