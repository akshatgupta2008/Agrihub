import Doctor from "../models/doctor.model.js";
import Appointment from "../models/appointment.model.js";
import Report from "../models/report.model.js";
import Review from "../models/review.model.js";
import { cloudinary } from "../lib/cloudinary.js";

export const latestReport = async (req, res) => {
  try {
    const report = await Report.findOne({ patient: req.user._id })
      .sort({ createdAt: -1 })
      .populate("doctor", "fullName specialty")
      .lean();

    res.status(200).json(report || null);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const listMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ patient: req.user._id })
      .sort({ createdAt: -1 })
      .populate("doctor", "fullName specialty")
      .lean();

    res.status(200).json(reports);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const downloadMyReport = async (req, res) => {
  const { reportId } = req.params;

  try {
    const report = await Report.findOne({ _id: reportId, patient: req.user._id })
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

export const listMyAppointments = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 5, 20);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const total = await Appointment.countDocuments({
      patient: req.user._id,
      status: { $in: ["pending", "booked", "rejected", "completed"] },
    });

    const appts = await Appointment.find({ patient: req.user._id, status: { $in: ["pending", "booked", "rejected", "completed"] } })
      .populate("doctor", "fullName specialty")
      .sort({ date: -1, time: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({ appointments: appts, hasMore: skip + appts.length < total, total });
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const listDoctorsForBooking = async (req, res) => {
  try {
    const doctors = await Doctor.find({ isAvailable: true })
      .select("fullName specialty licenseNumber isAvailable averageRating ratingCount")
      .sort({ averageRating: -1, ratingCount: -1, fullName: 1 })
      .lean();
    res.status(200).json(doctors);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const listMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ patient: req.user._id })
      .select("appointment doctor rating comment createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(reviews);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createReviewForAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const { rating, comment } = req.body;

  try {
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ message: "rating must be an integer from 1 to 5" });
    }

    const appt = await Appointment.findOne({ _id: appointmentId, patient: req.user._id })
      .select("_id patient doctor hospital status")
      .lean();

    if (!appt) return res.status(404).json({ message: "Appointment not found" });
    if (appt.status !== "completed") {
      return res.status(400).json({ message: "You can only review after the session is completed" });
    }

    const existing = await Review.findOne({ appointment: appt._id }).select("_id").lean();
    if (existing) {
      return res.status(409).json({ message: "You already reviewed this appointment" });
    }

    const created = await Review.create({
      appointment: appt._id,
      patient: appt.patient,
      doctor: appt.doctor,
      hospital: appt.hospital,
      rating: ratingNum,
      comment: String(comment || "").trim().slice(0, 1000),
    });

    // Update doctor aggregates (fast incremental update)
    const doctor = await Doctor.findById(appt.doctor).select("averageRating ratingCount");
    if (doctor) {
      const count = Number(doctor.ratingCount || 0);
      const avg = Number(doctor.averageRating || 0);
      const nextCount = count + 1;
      const nextAvg = (avg * count + ratingNum) / nextCount;
      doctor.ratingCount = nextCount;
      doctor.averageRating = Math.round(nextAvg * 10) / 10; // 1 decimal
      await doctor.save();
    }

    res.status(201).json({
      _id: created._id,
      appointment: created.appointment,
      doctor: created.doctor,
      rating: created.rating,
      comment: created.comment,
      createdAt: created.createdAt,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "You already reviewed this appointment" });
    }
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getDoctorSlots = async (req, res) => {
  const { doctorId } = req.params;
  const { date } = req.query;

  try {
    if (!date) return res.status(400).json({ message: "date is required" });

    const doctor = await Doctor.findById(doctorId).select("isAvailable slots").lean();
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    if (!doctor.isAvailable) return res.status(200).json([]);

    const day = (doctor.slots || []).find((s) => s.date === date);
    const allTimes = day?.times || [];

    if (allTimes.length === 0) return res.status(200).json([]);

    const booked = await Appointment.find({ doctor: doctorId, date, status: { $in: ["pending", "booked", "completed"] } })
      .select("time")
      .lean();

    const bookedTimes = new Set(booked.map((b) => b.time));
    const available = allTimes.filter((t) => !bookedTimes.has(t));

    res.status(200).json(available);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const bookAppointment = async (req, res) => {
  const { doctorId, date, time, mode = "offline" } = req.body;

  try {
    if (!doctorId || !date || !time) {
      return res.status(400).json({ message: "doctorId, date and time are required" });
    }

    if (mode !== "offline" && mode !== "online") {
      return res.status(400).json({ message: "mode must be offline or online" });
    }

    const doctor = await Doctor.findById(doctorId).select("hospital isAvailable slots fullName");
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    if (!doctor.isAvailable) return res.status(400).json({ message: "Doctor is not available" });

    const day = doctor.slots.find((s) => s.date === date);
    const allowed = day?.times?.includes(time);
    if (!allowed) return res.status(400).json({ message: "Selected time is not available" });

    const appt = await Appointment.create({
      patient: req.user._id,
      doctor: doctor._id,
      hospital: doctor.hospital,
      date,
      time,
      mode,
      status: mode === "online" ? "pending" : "booked",
    });

    // Online flow is now manual:
    // - patient books -> pending
    // - doctor accepts/rejects
    // - doctor uploads Meet link after accepting
    if (mode === "online") {
      // keep a short note for UI
      appt.notes = "Online appointment requested. Waiting for doctor acceptance and Meet link upload.";
      await appt.save();
    }

    res.status(201).json(appt);
  } catch (error) {
    // duplicate key => double-booking
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Time slot already booked" });
    }
    res.status(500).json({ message: "Internal Server Error" });
  }
};
