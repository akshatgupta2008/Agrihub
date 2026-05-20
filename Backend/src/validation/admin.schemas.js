import { z } from "zod";
import { emailSchema, objectIdSchema, passwordSchema, yyyymmddSchema, hhmmSchema } from "./common.schemas.js";

export const doctorIdParams = z.object({
  doctorId: objectIdSchema,
});

export const patientIdParams = z.object({
  patientId: objectIdSchema,
});

export const reportIdParams = z.object({
  reportId: objectIdSchema,
});

export const addDoctorBody = z.object({
  fullName: z.string().min(1).max(200).transform((v) => v.trim()),
  email: emailSchema,
  password: passwordSchema,
  specialty: z.string().trim().max(200).optional().or(z.literal("")),
  licenseNumber: z.string().trim().max(200).optional().or(z.literal("")),
});

export const setDoctorSlotsBody = z.object({
  date: yyyymmddSchema,
  times: z
    .array(hhmmSchema)
    .min(1)
    .transform((times) => [...new Set(times.map((t) => t.trim()))].sort()),
});

export const appointmentHistoryQuery = z.object({
  doctorId: objectIdSchema.optional(),
});

export const listPatientsQuery = z.object({
  search: z.string().trim().max(200).optional(),
  q: z.string().trim().max(200).optional(),
});
