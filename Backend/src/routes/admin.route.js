import express from "express";
import multer from "multer";
import {
  registerAdmin,
  loginAdmin,
  addDoctor,
  listDoctors,
  getDoctorReviews,
  listFeedback,
  setDoctorSlots,
  deleteDoctor,
  appointmentHistory,
  listPatients,
  uploadPatientReportPdf,
  listPatientReports,
  downloadReport,
} from "../controllers/admin.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { adminRegisterBody, loginBody } from "../validation/auth.schemas.js";
import {
  addDoctorBody,
  appointmentHistoryQuery,
  doctorIdParams,
  listPatientsQuery,
  patientIdParams,
  reportIdParams,
  setDoctorSlotsBody,
} from "../validation/admin.schemas.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post("/register", validate({ body: adminRegisterBody }), registerAdmin);
router.post("/login", validate({ body: loginBody }), loginAdmin);

router.post("/doctors", requireAuth, requireRole("admin"), validate({ body: addDoctorBody }), addDoctor);
router.get("/doctors", requireAuth, requireRole("admin"), listDoctors);
router.get(
  "/doctors/:doctorId/reviews",
  requireAuth,
  requireRole("admin"),
  validate({ params: doctorIdParams }),
  getDoctorReviews
);

// Feedback submissions (app/site feedback)
router.get("/feedback", requireAuth, requireRole("admin"), listFeedback);
router.put(
  "/doctors/:doctorId/slots",
  requireAuth,
  requireRole("admin"),
  validate({ params: doctorIdParams, body: setDoctorSlotsBody }),
  setDoctorSlots
);
router.delete(
  "/doctors/:doctorId",
  requireAuth,
  requireRole("admin"),
  validate({ params: doctorIdParams }),
  deleteDoctor
);

router.get(
  "/appointments",
  requireAuth,
  requireRole("admin"),
  validate({ query: appointmentHistoryQuery }),
  appointmentHistory
);

// Reports (PDF)
router.get(
  "/patients",
  requireAuth,
  requireRole("admin"),
  validate({ query: listPatientsQuery }),
  listPatients
);
router.get(
  "/patients/:patientId/reports",
  requireAuth,
  requireRole("admin"),
  validate({ params: patientIdParams }),
  listPatientReports
);
router.post(
  "/reports/upload",
  requireAuth,
  requireRole("admin"),
  upload.single("file"),
  uploadPatientReportPdf
);
router.get(
  "/reports/:reportId/download",
  requireAuth,
  requireRole("admin"),
  validate({ params: reportIdParams }),
  downloadReport
);

export default router;
