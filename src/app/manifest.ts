import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CamManif — caméras en direct",
    short_name: "CamManif",
    description: "Regardez et diffusez des caméras en direct, avec un chat en temps réel.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#090b10",
    theme_color: "#090b10",
    lang: "fr",
    categories: ["entertainment", "news", "social"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512?maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "En direct", url: "/?tab=direct" },
      { name: "Carte", url: "/carte" },
      { name: "Mosaïque", url: "/mosaique" },
      { name: "Studio", url: "/dashboard" },
    ],
  };
}
