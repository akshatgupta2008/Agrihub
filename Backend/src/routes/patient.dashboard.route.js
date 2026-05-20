import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import {
  latestReport,
  listMyReports,
  downloadMyReport,
  listMyAppointments,
  listMyReviews,
  listDoctorsForBooking,
  getDoctorSlots,
  bookAppointment,
  createReviewForAppointment,
} from "../controllers/patient.dashboard.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  appointmentIdParams,
  bookAppointmentBody,
  createReviewBody,
  doctorIdParams,
  getDoctorSlotsQuery,
  reportIdParams,
} from "../validation/patientDashboard.schemas.js";

const router = express.Router();

router.get("/me", requireAuth, requireRole("patient"), (req, res) => res.status(200).json({ role: "patient", ...req.user.toObject() }));
router.get("/reports/latest", requireAuth, requireRole("patient"), latestReport);
router.get("/reports", requireAuth, requireRole("patient"), listMyReports);
router.get(
  "/reports/:reportId/download",
  requireAuth,
  requireRole("patient"),
  validate({ params: reportIdParams }),
  downloadMyReport
);
router.get("/appointments", requireAuth, requireRole("patient"), listMyAppointments);
router.get("/reviews", requireAuth, requireRole("patient"), listMyReviews);

router.get("/doctors", requireAuth, requireRole("patient"), listDoctorsForBooking);
router.get(
  "/doctors/:doctorId/slots",
  requireAuth,
  requireRole("patient"),
  validate({ params: doctorIdParams, query: getDoctorSlotsQuery }),
  getDoctorSlots
);
router.post(
  "/appointments/book",
  requireAuth,
  requireRole("patient"),
  validate({ body: bookAppointmentBody }),
  bookAppointment
);
router.post(
  "/appointments/:appointmentId/review",
  requireAuth,
  requireRole("patient"),
  validate({ params: appointmentIdParams, body: createReviewBody }),
  createReviewForAppointment
);

export default router;
