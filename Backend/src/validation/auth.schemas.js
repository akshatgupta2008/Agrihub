import { z } from "zod";
import { emailSchema, passwordSchema } from "./common.schemas.js";

export const patientRegisterBody = z.object({
  fullName: z.string().min(1).max(200).transform((v) => v.trim()),
  email: emailSchema,
  password: passwordSchema,
  aadhaarNumber: z.string().trim().optional().or(z.literal("")),
  disabilityId: z.string().trim().optional().or(z.literal("")),
  patientType: z.enum(["general", "special"]).optional(),
});

export const loginBody = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const adminRegisterBody = z.object({
  hospitalName: z.string().min(1).max(200).transform((v) => v.trim()),
  email: emailSchema,
  password: passwordSchema,
  registerToken: z.string().trim().optional(),
});
