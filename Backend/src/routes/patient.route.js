import express from "express";
import { login, logout, signup as register, checkAuth } from "../controllers/patient.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { loginBody, patientRegisterBody } from "../validation/auth.schemas.js";

const router = express.Router();

router.post("/register", validate({ body: patientRegisterBody }), register);
router.post("/login", validate({ body: loginBody }), login);
router.post("/logout", logout);

router.get("/check", requireAuth, requireRole("patient"), checkAuth);

export default router;
