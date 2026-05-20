import { z } from "zod";

const ratingSchema = z.preprocess(
  (v) => {
    if (v === "" || v === null || typeof v === "undefined") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : v;
  },
  z.number().int().min(1).max(5).optional()
);

export const submitFeedbackBody = z.object({
  message: z.string().trim().min(3).max(2000),
  rating: ratingSchema,
});
