import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Same-origin requests go through Vite's existing /api proxy locally.
  basePath: "/api/auth",
  fetchOptions: { timeout: 10_000 },
});
