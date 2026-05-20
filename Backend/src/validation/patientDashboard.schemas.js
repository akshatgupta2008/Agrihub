import { z } from "zod";
import { objectIdSchema, yyyymmddSchema, hhmmSchema } from "./common.schemas.js";

export const doctorIdParams = z.object({
  doctorId: objectIdSchema,
});

export const reportIdParams = z.object({
  reportId: objectIdSchema,
});

export const appointmentIdParams = z.object({
  appointmentId: objectIdSchema,
});

export const getDoctorSlotsQuery = z.object({
  date: yyyymmddSchema,
});

export const bookAppointmentBody = z.object({
  doctorId: objectIdSchema,
  date: yyyymmddSchema,
  time: hhmmSchema,
  mode: z.enum(["offline", "online"]).optional().default("offline"),
});

export const createReviewBody = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().or(z.literal("")),
});
