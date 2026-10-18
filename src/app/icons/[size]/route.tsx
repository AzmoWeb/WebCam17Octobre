import { ImageResponse } from "next/og";

// Icônes PNG de l'application (PWA), générées à la volée : /icons/192, /icons/512.
export async function GET(request: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Math.min(1024, Math.max(32, Number((await params).size) || 192));
  // Variante "maskable" : marge de sécurité pour les icônes rondes d'Android.
  const maskable = new URL(request.url).searchParams.has("maskable");
  const inner = Math.round(size * (maskable ? 0.5 : 0.62));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #7c5cff, #b05cff 55%, #22d3ee)",
          borderRadius: maskable ? 0 : size * 0.22,
        }}
      >
        <svg width={inner} height={inner} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
          <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
          <circle cx="12" cy="12" r="2" fill="white" />
          <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
          <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
        </svg>
      </div>
    ),
    { width: size, height: size, headers: { "cache-control": "public, max-age=86400" } },
  );
}
