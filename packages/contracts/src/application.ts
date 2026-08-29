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
  jobPostLink: z.url({ protocol: /^https?$/ }).nullable(),
  status: applicationStatusSchema,
  dateApplied: z.iso.date(),
  notes: z.string().nullable(),
  events: z.array(applicationEventSchema),
});

const applicationWriteSchema = applicationSchema
  .omit({
    id: true,
    company: true,
    events: true,
  })
  .extend({
    company: companySchema.omit({ id: true }),
  });

export const createApplicationRequestSchema = applicationWriteSchema;
export const updateApplicationRequestSchema = applicationWriteSchema;

export const applicationIdParamsSchema = z.object({
  applicationId: z.coerce.number().int().positive(),
});

export const applicationResponseSchema = z.object({
  data: applicationSchema,
});

export const applicationListResponseSchema = z.object({
  data: z.array(applicationSchema),
});

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;
export type Application = z.infer<typeof applicationSchema>;
export type CreateApplicationRequest = z.infer<
  typeof createApplicationRequestSchema
>;
export type UpdateApplicationRequest = z.infer<
  typeof updateApplicationRequestSchema
>;
export type ApplicationIdParams = z.infer<typeof applicationIdParamsSchema>;
export type ApplicationResponse = z.infer<typeof applicationResponseSchema>;
export type ApplicationListResponse = z.infer<
  typeof applicationListResponseSchema
>;
