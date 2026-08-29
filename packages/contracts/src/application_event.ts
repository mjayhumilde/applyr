import { z } from "zod";

export const applicationEventSchema = z.object({
  id: z.number().int().positive(),
  eventType: z.string().trim().min(1).max(255),
  eventDate: z.iso.date(),
});

export const createApplicationEventRequestSchema = applicationEventSchema.omit({
  id: true,
});

export const applicationEventResponseSchema = z.object({
  data: applicationEventSchema,
});

export type ApplicationEvent = z.infer<typeof applicationEventSchema>;
export type CreateApplicationEventRequest = z.infer<
  typeof createApplicationEventRequestSchema
>;
export type ApplicationEventResponse = z.infer<
  typeof applicationEventResponseSchema
>;
