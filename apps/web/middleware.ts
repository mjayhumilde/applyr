import { ipAddress, next } from "@vercel/functions";
import { z } from "zod";

const clientIpSchema = z.union([z.ipv4(), z.ipv6()]);
const proxySecretSchema = z
  .string()
  .min(32)
  .regex(/^[!-~]+$/);

// run this middleware only to incoming request (like, /api/)
export const config = {
  matcher: "/api/:path*",
};

export default function middleware(request: Request): Response {
  // extract users actual IP addrs
  const clientIp = clientIpSchema.safeParse(ipAddress(request));
  const proxySecret = proxySecretSchema.safeParse(
    process.env.PROXY_SHARED_SECRET,
  );

  if (!clientIp.success || !proxySecret.success) {
    return Response.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message:
            "The API is temporarily unavailable. Please try again later.",
        },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const headers = new Headers(request.headers);
  // Overwrite client-supplied values before forwarding to the API project.
  headers.set("x-applyr-client-ip", clientIp.data);
  headers.set("x-applyr-proxy-secret", proxySecret.data);

  // These are upstream request headers, never public response headers.
  return next({ request: { headers } });
}
