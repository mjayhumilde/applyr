import { z } from "zod";

const applicationCountSchema = z.number().int().nonnegative();

export const dashboardSummarySchema = z.object({
  totalApplications: applicationCountSchema,
  byStatus: z.object({
    Applied: applicationCountSchema,
    Interview: applicationCountSchema,
    Offer: applicationCountSchema,
    Rejected: applicationCountSchema,
  }),
});

export const dashboardSummaryResponseSchema = z.object({
  data: dashboardSummarySchema,
});

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
export type DashboardSummaryResponse = z.infer<
  typeof dashboardSummaryResponseSchema
>;
