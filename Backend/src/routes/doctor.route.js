import express from "express";
import {
  loginDoctor,
  toggleAvailability,
  myAppointments,
  currentAppointment,
  createReport,
  myPatients,
  listPatientReportsForDoctor,
  downloadReportForDoctor,
  decideOnlineAppointment,
  uploadMeetLinkForAppointment,
  markAppointmentCompleted,
} from "../controllers/doctor.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { loginBody } from "../validation/auth.schemas.js";
import {
  appointmentIdParams,
  availabilityBody,
  createReportBody,
  decideOnlineAppointmentBody,
  meetLinkBody,
  patientIdParams,
  reportIdParams,
} from "../validation/doctor.schemas.js";

const router = express.Router();

router.post("/login", validate({ body: loginBody }), loginDoctor);

router.patch(
  "/availability",
  requireAuth,
  requireRole("doctor"),
  validate({ body: availabilityBody }),
  toggleAvailability
);
router.get("/appointments", requireAuth, requireRole("doctor"), myAppointments);
router.get("/appointments/current", requireAuth, requireRole("doctor"), currentAppointment);
router.patch(
  "/appointments/:appointmentId/decision",
  requireAuth,
  requireRole("doctor"),
  validate({ params: appointmentIdParams, body: decideOnlineAppointmentBody }),
  decideOnlineAppointment
);
router.patch(
  "/appointments/:appointmentId/meet-link",
  requireAuth,
  requireRole("doctor"),
  validate({ params: appointmentIdParams, body: meetLinkBody }),
  uploadMeetLinkForAppointment
);
router.patch(
  "/appointments/:appointmentId/complete",
  requireAuth,
  requireRole("doctor"),
  validate({ params: appointmentIdParams }),
  markAppointmentCompleted
);
router.post(
  "/reports",
  requireAuth,
  requireRole("doctor"),
  validate({ body: createReportBody }),
  createReport
);

// Reports (view/download)
router.get("/patients", requireAuth, requireRole("doctor"), myPatients);
router.get(
  "/patients/:patientId/reports",
  requireAuth,
  requireRole("doctor"),
  validate({ params: patientIdParams }),
  listPatientReportsForDoctor
);
router.get(
  "/reports/:reportId/download",
  requireAuth,
  requireRole("doctor"),
  validate({ params: reportIdParams }),
  downloadReportForDoctor
);

export default router;
