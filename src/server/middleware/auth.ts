import { getSignedCookie } from "hono/cookie";
import { CONFIG } from "../util/config";
import { UserModel } from "../models/User";
import type { Context, Next } from "hono";

// Paths that do not require authentication
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/favicon.ico",
  "/manifest.json",
  "/sw.js",
  "/offline"
];

const PUBLIC_PREFIXES = [
  "/public/",
];

/**
 * Auth Middleware
 * Enforces signed cookie session for all protected routes.
 */
export async function authMiddleware(c: Context, next: Next) {
  const path = c.req.path;

  // Check if path is public
  if (PUBLIC_PATHS.includes(path) || PUBLIC_PREFIXES.some(prefix => path.startsWith(prefix))) {
    // Even on public paths, we try to get the user if a session exists
    const userId = await getSignedCookie(c, CONFIG.COOKIE_SECRET, "session_id");
    if (typeof userId === "string") {
      const user = UserModel.findById(parseInt(userId, 10));
      if (user) {
        c.set("user", user);
      }
    }
    return await next();
  }

  // Check session
  const userId = await getSignedCookie(c, CONFIG.COOKIE_SECRET, "session_id");
  
  if (typeof userId !== "string") {
    return c.redirect("/login");
  }

  const user = UserModel.findById(parseInt(userId, 10));
  if (!user) {
    // Invalid session
    return c.redirect("/login");
  }

  // Set user in context for downstream handlers and renderer
  c.set("user", user);

  return await next();
}
