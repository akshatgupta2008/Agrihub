import Admin from "../models/admin.model.js";
import Doctor from "../models/doctor.model.js";
import Patient from "../models/patient.model.js";
import Appointment from "../models/appointment.model.js";
import Report from "../models/report.model.js";
import Review from "../models/review.model.js";
import Feedback from "../models/feedback.model.js";
import { ENV } from "../lib/ENV.js";
import { cloudinary, isCloudinaryConfigured } from "../lib/cloudinary.js";
import { signToken, setAuthCookie } from "../lib/auth.js";
import { hashPassword, verifyPassword } from "../services/password.service.js";

const cleanString = (v) => String(v ?? "").trim();
const cleanEmail = (v) => cleanString(v).toLowerCase();

export const registerAdmin = async (req, res) => {
  const { hospitalName, email, password, registerToken } = req.body;

  try {
    const hospitalNameNorm = cleanString(hospitalName);
    const emailNorm = cleanEmail(email);
    const pwd = String(password ?? "");

    if (!hospitalNameNorm || !emailNorm || !pwd) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (ENV.ADMIN_REGISTER_TOKEN && registerToken !== ENV.ADMIN_REGISTER_TOKEN) {
      return res.status(403).json({ message: "Invalid admin register token" });
    }

    if (pwd.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existing = await Admin.findOne({ email: emailNorm });
    if (existing) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await hashPassword(pwd);

    const admin = await Admin.create({
      hospitalName: hospitalNameNorm,
      email: emailNorm,
      password: hashedPassword,
    });

    const token = signToken({ userId: admin._id, role: "admin" });
    setAuthCookie(res, token);

    res.status(201).json({ role: "admin", _id: admin._id, hospitalName: admin.hospitalName, email: admin.email });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Admin already exists with this email" });
    }
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const emailNorm = cleanEmail(email);
    const pwd = String(password ?? "");
    if (!emailNorm || !pwd) return res.status(400).json({ message: "All fields are required" });

    const admin = await Admin.findOne({ email: emailNorm });
    if (!admin) return res.status(400).json({ message: "Invalid credentials" });

    const ok = await verifyPassword(pwd, admin.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    const token = signToken({ userId: admin._id, role: "admin" });
    setAuthCookie(res, token);

    res.status(200).json({ role: "admin", _id: admin._id, hospitalName: admin.hospitalName, email: admin.email });
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const addDoctor = async (req, res) => {
  const { fullName, email, password, specialty, licenseNumber } = req.body;

  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "fullName, email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existing = await Doctor.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: "Doctor email already exists" });

    const hashedPassword = await hashPassword(password);

    const doctor = await Doctor.create({
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      specialty,
      licenseNumber,
      hospital: req.user._id,
    });

    res.status(201).json({
      _id: doctor._id,
      fullName: doctor.fullName,
      email: doctor.email,
      specialty: doctor.specialty,
      licenseNumber: doctor.licenseNumber,
      isAvailable: doctor.isAvailable,
    });
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const listDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find({ hospital: req.user._id })
      .select("-password")
      .sort({ averageRating: -1, ratingCount: -1, fullName: 1 })
      .lean();

    const counts = await Appointment.aggregate([
      { $match: { hospital: req.user._id } },
      { $group: { _id: "$doctor", total: { $sum: 1 }, booked: { $sum: { $cond: [{ $eq: ["$status", "booked"] }, 1, 0] } } } },
    ]);

    const byDoctor = new Map(counts.map((c) => [String(c._id), { total: c.total, booked: c.booked }]));

    res.status(200).json(
      doctors.map((d) => ({
        ...d,
        stats: byDoctor.get(String(d._id)) || { total: 0, booked: 0 },
      }))
    );
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getDoctorReviews = async (req, res) => {
  const { doctorId } = req.params;

  try {
    const doctor = await Doctor.findOne({ _id: doctorId, hospital: req.user._id })
      .select("fullName email specialty licenseNumber averageRating ratingCount isAvailable")
      .lean();

    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const reviews = await Review.find({ hospital: req.user._id, doctor: doctorId })
      .populate("patient", "fullName email patientType")
      .populate("appointment", "date time mode")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ doctor, reviews });
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const listFeedback = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query?.limit || 50), 1), 200);

    const items = await Feedback.find({})
      .select("submittedByRole submittedById name email rating message createdAt")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json(items);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const setDoctorSlots = async (req, res) => {
  const { doctorId } = req.params;
  const { date, times } = req.body;

  try {
    if (!date || !Array.isArray(times)) {
      return res.status(400).json({ message: "date and times[] are required" });
    }

    const dateStr = String(date).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
    }

    const rawTimes = times.map((t) => String(t).trim()).filter(Boolean);
    const time24hRe = /^([01]\d|2[0-3]):[0-5]\d$/;
    const invalidTimes = rawTimes.filter((t) => !time24hRe.test(t));
    if (invalidTimes.length > 0) {
      return res.status(400).json({ message: `Invalid time(s): ${invalidTimes.join(", ")}. Use 24h HH:MM` });
    }

    const cleanedTimes = [...new Set(rawTimes)].sort();
    if (cleanedTimes.length === 0) {
      return res.status(400).json({ message: "Enter at least one valid time" });
    }

    const doctor = await Doctor.findOne({ _id: doctorId, hospital: req.user._id });
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const idx = doctor.slots.findIndex((s) => s.date === dateStr);
    if (idx === -1) {
      doctor.slots.push({ date: dateStr, times: cleanedTimes });
    } else {
      doctor.slots[idx].times = cleanedTimes;
    }

    await doctor.save();
    res.status(200).json({ message: "Slots updated" });
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteDoctor = async (req, res) => {
  const { doctorId } = req.params;

  try {
    const doctor = await Doctor.findOne({ _id: doctorId, hospital: req.user._id });
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    await Appointment.updateMany(
      { doctor: doctor._id, status: "booked" },
      { $set: { status: "cancelled" } }
    );

    await Doctor.deleteOne({ _id: doctor._id });

    res.status(200).json({ message: "Doctor deleted" });
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const appointmentHistory = async (req, res) => {
  const { doctorId } = req.query;

  try {
    const match = { hospital: req.user._id };
    if (doctorId) match.doctor = doctorId;

    const appts = await Appointment.find(match)
      .populate("patient", "fullName email patientType")
      .populate("doctor", "fullName email specialty")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json(appts);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const sanitizePublicIdPart = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const uploadPdfBufferToCloudinary = (fileBuffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(fileBuffer);
  });

export const listPatients = async (req, res) => {
  const search = String(req.query.search || req.query.q || "").trim().toLowerCase();

  try {
    const appts = await Appointment.find({ hospital: req.user._id })
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

export const uploadPatientReportPdf = async (req, res) => {
  const { patientId, title, notes } = req.body;

  try {
    if (!patientId || !title) {
      return res.status(400).json({ message: "patientId and title are required" });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(503).json({ message: "Cloudinary not configured" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "PDF file is required" });
    }

    const originalName = String(req.file.originalname || "");
    const mimeType = String(req.file.mimetype || "");

    const isPdf =
      mimeType === "application/pdf" ||
      (mimeType === "application/octet-stream" && originalName.toLowerCase().endsWith(".pdf"));

    if (!isPdf) {
      return res.status(400).json({ message: "Only PDF files are allowed" });
    }

    const patient = await Patient.findById(patientId).select("_id");
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    const hasAppt = await Appointment.exists({ hospital: req.user._id, patient: patient._id });
    if (!hasAppt) {
      return res.status(403).json({ message: "Patient is not associated with this hospital" });
    }

    const publicId = `report_${Date.now()}_${sanitizePublicIdPart(title)}`;

    const uploaded = await uploadPdfBufferToCloudinary(req.file.buffer, {
      folder: `${ENV.CLOUDINARY_REPORTS_FOLDER}/${req.user._id}/${patient._id}`,
      public_id: publicId,
      resource_type: "raw",
      type: "upload",
      format: "pdf",
      overwrite: false,
    });

    const report = await Report.create({
      patient: patient._id,
      hospital: req.user._id,
      title,
      notes,
      fileUrl: uploaded.secure_url,
      filePublicId: uploaded.public_id,
      fileOriginalName: originalName,
      fileMimeType: mimeType,
      fileBytes: req.file.size,
      uploadedByRole: "admin",
    });

    res.status(201).json(report);
  } catch (err) {
    console.error("Upload report error:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};

export const listPatientReports = async (req, res) => {
  const { patientId } = req.params;

  try {
    const patient = await Patient.findById(patientId).select("_id");
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    const hasAppt = await Appointment.exists({ hospital: req.user._id, patient: patient._id });
    if (!hasAppt) {
      return res.status(403).json({ message: "Patient is not associated with this hospital" });
    }

    const reports = await Report.find({ hospital: req.user._id, patient: patient._id })
      .populate("doctor", "fullName specialty")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(reports);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const downloadReport = async (req, res) => {
  const { reportId } = req.params;

  try {
    const report = await Report.findOne({ _id: reportId, hospital: req.user._id })
      .select("fileUrl filePublicId")
      .lean();

    if (!report) return res.status(404).json({ message: "Report not found" });
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
