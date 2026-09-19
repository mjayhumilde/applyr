import { z } from "zod";

// 4 MiB
export const RESUME_MAX_BYTES = 4 * 1024 * 1024;

export const RESUME_MEDIA_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const resumeMediaTypeSchema = z.enum(RESUME_MEDIA_TYPES);

export const resumeFileNameSchema = z
  .string()
  .trim()
  .min(1, "Choose a resume file")
  .max(255, "The file name must be 255 characters or fewer")
  .refine(
    (value) => !/[\\/\u0000-\u001f\u007f]/u.test(value),
    "The file name contains unsupported characters",
  )
  .refine((value) => /\.(pdf|docx)$/i.test(value), "Choose a PDF or DOCX file");

export const resumeSchema = z.object({
  id: z.uuid(),
  applicationId: z.number().int().positive(),
  fileName: resumeFileNameSchema,
  mediaType: resumeMediaTypeSchema,
  byteSize: z.number().int().positive().max(RESUME_MAX_BYTES),
  uploadedAt: z.iso.datetime({ offset: true }),
});

export const resumeResponseSchema = z.object({
  data: resumeSchema.nullable(),
});

export type Resume = z.infer<typeof resumeSchema>;
export type ResumeMediaType = z.infer<typeof resumeMediaTypeSchema>;
export type ResumeResponse = z.infer<typeof resumeResponseSchema>;
