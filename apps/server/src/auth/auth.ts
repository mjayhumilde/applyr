import { betterAuth } from "better-auth";

import { authEnv, trustedOrigins } from "../config/auth-env.js";
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";

export const auth = betterAuth({
  appName: "Applyr",
  baseURL: authEnv.BETTER_AUTH_URL,
  basePath: "/api/auth",
  secret: authEnv.BETTER_AUTH_SECRET,
  database: pool,
  trustedOrigins,
  advanced: {
    ipAddress: { ipAddressHeaders: ["x-applyr-client-ip"] },
  },
  socialProviders: {
    google: {
      clientId: authEnv.GOOGLE_CLIENT_ID,
      clientSecret: authEnv.GOOGLE_CLIENT_SECRET,
      // Google supplies only the basic email, profile, and openid scopes.
      accessType: "online",
      includeGrantedScopes: false,
    },
  },
  // Keep our PostgreSQL names in snake_case; Better Auth's API stays camelCase.
  user: {
    modelName: "auth_users",
    fields: {
      emailVerified: "email_verified",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  session: {
    modelName: "auth_sessions",
    fields: {
      userId: "user_id",
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
      ipAddress: "ip_address",
      userAgent: "user_agent",
    },
    // Check the database so a revoked session cannot survive in a cookie cache.
    cookieCache: { enabled: false },
  },
  account: {
    modelName: "auth_accounts",
    fields: {
      userId: "user_id",
      accountId: "account_id",
      providerId: "provider_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    encryptOAuthTokens: true,
  },
  verification: {
    modelName: "auth_verifications",
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  // Production instances share atomic counters; local development needs no new table.
  rateLimit: {
    enabled: true,
    storage: env.NODE_ENV === "production" ? "database" : "memory",
    modelName: "auth_rate_limits",
    fields: { lastRequest: "last_request" },
  },
  telemetry: { enabled: false },
});

export type AuthSession = typeof auth.$Infer.Session;
