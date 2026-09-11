import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    VERCEL: z.literal("1").optional(),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    DB_POOL_MAX: z.coerce.number().int().min(2).max(20).default(5),
    DATABASE_URL: z.url({
      protocol: /^postgres(?:ql)?$/,
    }),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === "production" && URL.canParse(value.DATABASE_URL)) {
      const databaseUrl = new URL(value.DATABASE_URL);

      const sslModes = databaseUrl.searchParams.getAll("sslmode");
      if (sslModes.length !== 1 || sslModes[0] !== "verify-full") {
        context.addIssue({
          code: "custom",
          path: ["DATABASE_URL"],
          message:
            "Production requires sslmode=verify-full to verify the database TLS certificate",
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(z.prettifyError(parsed.error));
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
