import { z } from "zod";
import { objectIdSchema } from "./common.schemas.js";

export const appointmentIdParams = z.object({
  appointmentId: objectIdSchema,
});

export const patientIdParams = z.object({
  patientId: objectIdSchema,
});

export const reportIdParams = z.object({
  reportId: objectIdSchema,
});

export const availabilityBody = z.object({
  isAvailable: z.boolean(),
});

export const decideOnlineAppointmentBody = z.object({
  decision: z.enum(["accept", "reject"]),
});

export const meetLinkBody = z.object({
  meetLink: z
    .string()
    .trim()
    .url()
    .refine((v) => v.startsWith("https://"), "meetLink must start with https://"),
});

export const createReportBody = z.object({
  patientId: objectIdSchema,
  title: z.string().min(1).max(200).transform((v) => v.trim()),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
});
