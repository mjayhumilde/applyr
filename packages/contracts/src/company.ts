import { z } from "zod";

export const companySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(1).max(255),
  website: z.url({ protocol: /^https?$/ }).nullable(),
});

export type Company = z.infer<typeof companySchema>;
