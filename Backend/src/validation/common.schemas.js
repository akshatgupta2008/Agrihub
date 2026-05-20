import { z } from "zod";

export const objectIdSchema = z
  .string()
  .min(1)
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const emailSchema = z
  .string()
  .min(3)
  .max(320)
  .email()
  .transform((v) => v.toLowerCase().trim());

export const passwordSchema = z.string().min(6).max(200);

export const yyyymmddSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
export const hhmmSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24h)");
