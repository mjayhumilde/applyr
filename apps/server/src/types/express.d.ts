import type { AuthSession } from "../auth/auth.js";

declare module "express-serve-static-core" {
  interface Request {
    // Only requireAuth sets this, after Better Auth verifies the session cookie.
    authSession?: AuthSession;
  }
}
