import { z } from "zod";

const apiOriginSchema = z.url({ protocol: /^https$/ }).refine((value) => {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  const hostname = url.hostname.toLowerCase();
  const isPublicHostname =
    // make sure hostname looks like real domain (like .com, .net, .org, .io)
    /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z](?:[a-z0-9-]*[a-z0-9])?$/.test(
      hostname,
    ) &&
    // bans local/private testing domains (like .localhost, .local, .internal)
    !/\.(?:localhost|local|internal|test|invalid)$/.test(hostname);

  return (
    isPublicHostname && // Must be a public internet domain
    url.username === "" && // No embedded usernames (e.g., https://api.com)
    url.password === "" && // No embedded passwords (e.g., https://api.com)
    (value === url.origin || value === `${url.origin}/`) // Must be a clean base URL
  );
});

const result = apiOriginSchema.safeParse(process.env.API_ORIGIN);

if (!result.success) {
  throw new Error(
    "Set API_ORIGIN to the backend's public HTTPS origin, without credentials, a path, query, or fragment.",
  );
}

const apiOrigin = new URL(result.data).origin;
const frontendHosts = [
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
  process.env.VERCEL_URL,
];

if (frontendHosts.some((host) => host && apiOrigin === `https://${host}`)) {
  throw new Error(
    "API_ORIGIN must point to the backend, not this web project.",
  );
}

export const config = {
  rewrites: [
    // API requests must reach Express instead of receiving React's index.html.
    { source: "/api/:path*", destination: `${apiOrigin}/api/:path*` },
    { source: "/(.*)", destination: "/index.html" },
  ],
};
