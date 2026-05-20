import Doctor from "../models/doctor.model.js";
import Patient from "../models/patient.model.js";
import Appointment from "../models/appointment.model.js";
import Report from "../models/report.model.js";
import { cloudinary } from "../lib/cloudinary.js";
import { signToken, setAuthCookie } from "../lib/auth.js";
import { verifyPassword } from "../services/password.service.js";

const isSafeHttpUrl = (url) => typeof url === "string" && url.startsWith("https://");

export const loginDoctor = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) return res.status(400).json({ message: "All fields are required" });

    const doctor = await Doctor.findOne({ email: email.toLowerCase() });
    if (!doctor) return res.status(400).json({ message: "Invalid credentials" });

    const ok = await verifyPassword(password, doctor.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    const token = signToken({ userId: doctor._id, role: "doctor" });
    setAuthCookie(res, token);

    res.status(200).json({
      role: "doctor",
      _id: doctor._id,
      fullName: doctor.fullName,
      email: doctor.email,
      specialty: doctor.specialty,
      licenseNumber: doctor.licenseNumber,
      hospital: doctor.hospital,
      isAvailable: doctor.isAvailable,
    });
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const toggleAvailability = async (req, res) => {
  const { isAvailable } = req.body;

  try {
    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({ message: "isAvailable must be boolean" });
    }

    const doctor = await Doctor.findById(req.user._id);
    doctor.isAvailable = isAvailable;
    await doctor.save();

    res.status(200).json({ isAvailable: doctor.isAvailable });
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const myAppointments = async (req, res) => {
  try {
    const match = { doctor: req.user._id, status: { $in: ["pending", "booked", "completed"] } };
    if (req.query.date) match.date = String(req.query.date);

    const appts = await Appointment.find(match)
      .populate("patient", "fullName email patientType")
      .sort({ date: 1, time: 1 })
      .lean();

    res.status(200).json(appts);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const currentAppointment = async (req, res) => {
  try {
    const appts = await Appointment.find({ doctor: req.user._id, status: "booked" })
      .populate("patient", "fullName email patientType")
      .sort({ date: 1, time: 1 })
      .limit(1)
      .lean();

    res.status(200).json(appts[0] || null);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createReport = async (req, res) => {
  const { patientId, title, notes } = req.body;

  try {
    if (!patientId || !title) return res.status(400).json({ message: "patientId and title are required" });

    const patient = await Patient.findById(patientId).select("_id");
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    const report = await Report.create({
      patient: patient._id,
      doctor: req.user._id,
      hospital: req.user.hospital,
      title,
      notes,
      uploadedByRole: "doctor",
    });

    res.status(201).json(report);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const myPatients = async (req, res) => {
  const search = String(req.query.search || req.query.q || "").trim().toLowerCase();

  try {
    const appts = await Appointment.find({ doctor: req.user._id })
      .populate("patient", "fullName email patientType")
      .select("patient")
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    const byId = new Map();
    for (const a of appts) {
      if (a.patient && a.patient._id) byId.set(String(a.patient._id), a.patient);
    }

    let patients = Array.from(byId.values());

    if (search) {
      patients = patients.filter((p) => {
        const name = String(p.fullName || "").toLowerCase();
        const email = String(p.email || "").toLowerCase();
        return name.includes(search) || email.includes(search);
      });
    }

    patients.sort((a, b) => String(a.fullName || "").localeCompare(String(b.fullName || "")));

    res.status(200).json(patients);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const listPatientReportsForDoctor = async (req, res) => {
  const { patientId } = req.params;

  try {
    const patient = await Patient.findById(patientId).select("_id");
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    const allowed = await Appointment.exists({ doctor: req.user._id, patient: patient._id });
    if (!allowed) {
      return res.status(403).json({ message: "Not allowed to view this patient's reports" });
    }

    const reports = await Report.find({ hospital: req.user.hospital, patient: patient._id })
      .populate("doctor", "fullName specialty")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(reports);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const downloadReportForDoctor = async (req, res) => {
  const { reportId } = req.params;

  try {
    const report = await Report.findOne({ _id: reportId, hospital: req.user.hospital })
      .select("patient fileUrl filePublicId")
      .lean();

    if (!report) return res.status(404).json({ message: "Report not found" });

    const allowed = await Appointment.exists({ doctor: req.user._id, patient: report.patient });
    if (!allowed) {
      return res.status(403).json({ message: "Not allowed to download this report" });
    }

    if (!report.fileUrl && !report.filePublicId) {
      return res.status(404).json({ message: "No PDF available for this report" });
    }

    const url =
      report.fileUrl ||
      cloudinary.url(report.filePublicId, {
        resource_type: "raw",
        type: "upload",
        flags: "attachment",
        format: "pdf",
      });

    res.redirect(url);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const decideOnlineAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const { decision } = req.body;

  try {
    if (decision !== "accept" && decision !== "reject") {
      return res.status(400).json({ message: "decision must be accept or reject" });
    }

    const appt = await Appointment.findOne({ _id: appointmentId, doctor: req.user._id });
    if (!appt) return res.status(404).json({ message: "Appointment not found" });

    if (appt.mode !== "online") {
      return res.status(400).json({ message: "Only online appointments require accept/reject" });
    }

    if (appt.status !== "pending") {
      return res.status(400).json({ message: "Only pending appointments can be accepted or rejected" });
    }

    appt.status = decision === "accept" ? "booked" : "rejected";
    appt.doctorDecisionAt = new Date();
    if (decision === "reject") {
      appt.notes = "Doctor rejected the online appointment request.";
      appt.meetLink = undefined;
      appt.meetLinkUploadedAt = undefined;
    } else {
      appt.notes = "Doctor accepted the online appointment request. Waiting for Meet link upload.";
    }

    await appt.save();

    const populated = await Appointment.findById(appt._id)
      .populate("patient", "fullName email patientType")
      .lean();

    res.status(200).json(populated);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const uploadMeetLinkForAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const { meetLink } = req.body;

  try {
    if (!isSafeHttpUrl(meetLink)) {
      return res.status(400).json({ message: "meetLink must be a valid https URL" });
    }

    const appt = await Appointment.findOne({ _id: appointmentId, doctor: req.user._id });
    if (!appt) return res.status(404).json({ message: "Appointment not found" });

    if (appt.mode !== "online") {
      return res.status(400).json({ message: "This appointment is not online" });
    }

    if (appt.status !== "booked") {
      return res.status(400).json({ message: "Meet link can only be uploaded after accepting the appointment" });
    }

    appt.meetLink = String(meetLink).trim();
    appt.meetLinkUploadedAt = new Date();
    appt.notes = "Meet link uploaded.";

    await appt.save();

    const populated = await Appointment.findById(appt._id)
      .populate("patient", "fullName email patientType")
      .lean();

    res.status(200).json(populated);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const markAppointmentCompleted = async (req, res) => {
  const { appointmentId } = req.params;

  try {
    const appt = await Appointment.findOne({ _id: appointmentId, doctor: req.user._id });
    if (!appt) return res.status(404).json({ message: "Appointment not found" });

    if (appt.status === "completed") {
      const populated = await Appointment.findById(appt._id)
        .populate("patient", "fullName email patientType")
        .lean();
      return res.status(200).json(populated);
    }

    if (appt.status !== "booked") {
      return res.status(400).json({ message: "Only booked appointments can be marked completed" });
    }

    appt.status = "completed";
    appt.notes = "Session completed.";
    await appt.save();

    const populated = await Appointment.findById(appt._id)
      .populate("patient", "fullName email patientType")
      .lean();

    res.status(200).json(populated);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};
