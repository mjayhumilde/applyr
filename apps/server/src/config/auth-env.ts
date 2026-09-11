import { z } from "zod";
import { env } from "./env.js";

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

const authEnvSchema = z
  .object({
    BETTER_AUTH_SECRET: z.string().trim().min(32),
    BETTER_AUTH_URL: httpOriginSchema,
    GOOGLE_CLIENT_ID: z.string().trim().min(1),
    GOOGLE_CLIENT_SECRET: z.string().trim().min(1),
    WEB_ORIGIN: httpOriginSchema,
    // Shared only by Vercel routing middleware and Express, never by the browser.
    PROXY_SHARED_SECRET: z
      .string()
      .min(32)
      .regex(/^[!-~]+$/)
      .optional(),
  })
  .superRefine((value, context) => {
    if (env.NODE_ENV !== "production") return;

    for (const key of ["BETTER_AUTH_URL", "WEB_ORIGIN"] as const) {
      if (!URL.canParse(value[key])) continue;
      const url = new URL(value[key]);
      if (
        url.protocol !== "https:" ||
        !url.hostname.includes(".") ||
        /(?:^|\.)(?:localhost|local|internal)$/.test(url.hostname) ||
        z.ipv4().safeParse(url.hostname).success ||
        url.hostname.startsWith("[")
      ) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: "Production authentication requires a public HTTPS origin",
        });
      }
    }

    if (value.BETTER_AUTH_URL !== value.WEB_ORIGIN) {
      context.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_URL"],
        message:
          "Use WEB_ORIGIN: production auth callbacks go through the frontend /api proxy",
      });
    }

    if (value.PROXY_SHARED_SECRET === undefined) {
      context.addIssue({
        code: "custom",
        path: ["PROXY_SHARED_SECRET"],
        message:
          "Production requires the same proxy secret on the web and server projects",
      });
    } else if (value.PROXY_SHARED_SECRET === value.BETTER_AUTH_SECRET) {
      context.addIssue({
        code: "custom",
        path: ["PROXY_SHARED_SECRET"],
        message:
          "Generate a separate proxy secret; do not reuse BETTER_AUTH_SECRET",
      });
    }
  });

const parsed = authEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(z.prettifyError(parsed.error));
  throw new Error("Invalid authentication environment variables");
}

export const authEnv = parsed.data;

export const trustedOrigins = [authEnv.BETTER_AUTH_URL, authEnv.WEB_ORIGIN];
