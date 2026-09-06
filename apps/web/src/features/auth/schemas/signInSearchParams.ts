import { z } from "zod";

const returnToSchema = z
  .string()
  .max(2048)
  .refine((value) => {
    if (
      !value.startsWith("/") ||
      value.startsWith("//") ||
      value.includes("\\")
    ) {
      return false;
    }

    // Only allow Applyr pages, never an external URL or another sign-in loop.
    const url = new URL(value, "http://applyr.local");

    return (
      url.origin === "http://applyr.local" &&
      (url.pathname === "/" ||
        url.pathname === "/applications" ||
        url.pathname.startsWith("/applications/"))
    );
  })
  .catch("/");

export const signInSearchParamsSchema = z.object({
  returnTo: returnToSchema,
  error: z.string().min(1).max(100).nullable().catch(null),
});
