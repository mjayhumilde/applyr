import { z } from "zod";

export const applicationEventSchema = z.object({
  id: z.number().int().positive(),
  eventType: z.string().trim().min(1).max(255),
  eventDate: z.iso.date(),
});

export type ApplicationEvent = z.infer<typeof applicationEventSchema>;
