import express from "express";
import { submitFeedback } from "../controllers/feedback.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { submitFeedbackBody } from "../validation/feedback.schemas.js";

const router = express.Router();

// Only logged-in patients can submit feedback.
router.post("/", requireAuth, requireRole("patient"), validate({ body: submitFeedbackBody }), submitFeedback);

export default router;
