import type { Metadata } from "next";
import { getStreamSummaries } from "@/lib/streams";
import MapClient from "./MapClient";

export const metadata: Metadata = { title: "Carte en direct" };

export default async function MapPage() {
  return <MapClient streams={await getStreamSummaries()} />;
}
