import { z } from "zod";

// An origin is a protocol, hostname, and optional port, without a route.
const httpOriginSchema = z
  .url({ protocol: /^https?$/ })
  .transform((value) => new URL(value))
  .refine(
    (url) =>
      url.username === "" &&
      url.password === "" &&
      url.pathname === "/" &&
      url.search === "" &&
      url.hash === "",
    "Use an HTTP(S) origin without credentials, a path, query, or fragment",
  )
  .transform((url) => url.origin);

const authEnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().trim().min(32),
  BETTER_AUTH_URL: httpOriginSchema,
  GOOGLE_CLIENT_ID: z.string().trim().min(1),
  GOOGLE_CLIENT_SECRET: z.string().trim().min(1),
  WEB_ORIGIN: httpOriginSchema,
});

const parsed = authEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(z.prettifyError(parsed.error));
  throw new Error("Invalid authentication environment variables");
}

export const authEnv = parsed.data;
