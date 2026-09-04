import { applicationStatusSchema } from "@applyr/contracts";
import { z } from "zod";

export const applicationListSortSchema = z.enum([
  "newest",
  "oldest",
  "status",
]);

export const applicationListSearchParamsSchema = z.object({
  company: z.string().max(255).catch(""),
  date: z.union([z.literal(""), z.iso.date()]).catch(""),
  sort: applicationListSortSchema.catch("newest"),
  status: z.union([z.literal(""), applicationStatusSchema]).catch(""),
});

export type ApplicationListSearchParams = z.infer<
  typeof applicationListSearchParamsSchema
>;
export type ApplicationListSort = z.infer<typeof applicationListSortSchema>;
