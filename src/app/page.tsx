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

  return (
    <Suspense>
      <HomeClient streams={streams} loggedIn={!!user} />
    </Suspense>
  );
}
