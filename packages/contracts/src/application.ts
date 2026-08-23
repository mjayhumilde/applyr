import { z } from "zod";
import { companySchema } from "./company.js";
import { applicationEventSchema } from "./application_event.js";

export const applicationStatusSchema = z.enum([
  "Applied",
  "Interview",
  "Offer",
  "Rejected",
]);

export const applicationSchema = z.object({
  id: z.number().int().positive(),
  company: companySchema,
  role: z.string().trim().min(1).max(255),
  jobPostLink: z.url().nullable(),
  status: applicationStatusSchema,
  dateApplied: z.iso.date(),
  notes: z.string().nullable(),
  events: z.array(applicationEventSchema),
});

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;
export type Application = z.infer<typeof applicationSchema>;
