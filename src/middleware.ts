import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_OPTIONS } from "@/lib/supabase/cookies";

const isDev = process.env.NODE_ENV !== "production";

/** CSP stricte : scripts autorisés uniquement via un nonce unique par requête. */
function contentSecurityPolicy(nonce: string) {
  const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://invalid.supabase.co");
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""}`,
    // Styles inline nécessaires (attributs style de React, Leaflet) ; aucun script inline n'est permis.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.tile.openstreetmap.org",
    "font-src 'self'",
    `connect-src 'self' ${supabase.origin} wss://${supabase.host}${isDev ? " ws:" : ""}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "frame-src https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    `form-action 'self' ${supabase.origin}`,
    "base-uri 'self'",
    "object-src 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export async function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);

  // Next.js lit le nonce dans l'en-tête CSP de la requête et l'applique à ses propres scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, { ...options, ...SESSION_COOKIE_OPTIONS }),
        );
      },
    },
  });

  // Rafraîchit la session si besoin.
  await supabase.auth.getUser();

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Pas de middleware sur les assets, les fichiers statiques ni les routes API vidéo / hooks.
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|sw.js|offline.html|manifest.webmanifest|icons|api/mediamtx|api/hls|api/streams|api/clips|api/replays).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
