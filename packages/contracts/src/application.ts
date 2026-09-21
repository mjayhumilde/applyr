import { z } from "zod";
import { companySchema } from "./company.js";
import { applicationEventSchema } from "./application_event.js";

export const APPLICATION_JOB_DESCRIPTION_MAX_LENGTH = 10_000;
export const APPLICATION_SALARY_MAX_LENGTH = 255;

const applicationJobDescriptionSchema = z
  .string()
  .trim()
  .max(APPLICATION_JOB_DESCRIPTION_MAX_LENGTH)
  .refine((value) => !value.includes("\u0000"), {
    message: "Remove unsupported null characters from the job description",
  })
  .transform((value) => (value === "" ? null : value))
  .nullable();

const applicationSalarySchema = z
  .string()
  .trim()
  .max(APPLICATION_SALARY_MAX_LENGTH)
  .transform((value) => (value === "" ? null : value))
  .nullable();

export const applicationWorkTypeSchema = z.enum(["Remote", "Onsite", "Hybrid"]);

export const applicationStatusSchema = z.enum([
  "Saved",
  "Applied",
  "Interview",
  "Offer",
  "Rejected",
]);

const applicationRecordSchema = z.object({
  id: z.number().int().positive(),
  company: companySchema,
  role: z.string().trim().min(1).max(255),
  // Older responses can omit salary during a rolling deployment.
  salary: applicationSalarySchema.default(null),
  // Older responses can omit work type during a rolling deployment.
  workType: applicationWorkTypeSchema.nullable().default(null),
  jobPostLink: z.url({ protocol: /^https?$/ }).nullable(),
  // Older responses can omit job description during a rolling deployment.
  jobDescription: applicationJobDescriptionSchema.default(null),
  status: applicationStatusSchema,
  dateApplied: z.iso.date().nullable(),
  notes: z.string().nullable(),
  events: z.array(applicationEventSchema),
});

function validateApplicationDate(
  value: Pick<
    z.infer<typeof applicationRecordSchema>,
    "status" | "dateApplied"
  >,
  context: z.RefinementCtx,
): void {
  if (value.status === "Saved" && value.dateApplied !== null) {
    context.addIssue({
      code: "custom",
      path: ["dateApplied"],
      message: "Saved jobs must not have an application date",
    });
  } else if (value.status !== "Saved" && value.dateApplied === null) {
    context.addIssue({
      code: "custom",
      path: ["dateApplied"],
      message: "Choose an application date for this status",
    });
  }
}

export const applicationSchema = applicationRecordSchema.superRefine(
  validateApplicationDate,
);

const applicationWriteSchema = applicationRecordSchema
  .omit({
    id: true,
    company: true,
    events: true,
  })
  .extend({
    company: companySchema.omit({ id: true }),
    // Omission preserves the existing salary on update; null clears it.
    salary: applicationSalarySchema.optional(),
    // Omission preserves the existing work type on update; null clears it.
    workType: applicationWorkTypeSchema.nullable().optional(),
    // Omission preserves the existing description on update; null clears it.
    jobDescription: applicationJobDescriptionSchema.optional(),
  })
  .superRefine(validateApplicationDate);

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
export type ApplicationWorkType = z.infer<typeof applicationWorkTypeSchema>;
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
