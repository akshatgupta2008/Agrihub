import express from "express";
import { logout } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/me", requireAuth, (req, res) => {
	res.status(200).json({ role: req.role, ...req.user.toObject() });
});
router.post("/logout", logout);

export default router;
