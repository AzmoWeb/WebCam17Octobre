import type { CookieOptions } from "@supabase/ssr";

/** Cookies de session : illisibles en JavaScript, HTTPS uniquement en production, SameSite=Lax. */
export const SESSION_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};
