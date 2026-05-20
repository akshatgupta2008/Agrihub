import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
    },
    time: {
      type: String,
      required: true,
    },
    mode: {
      type: String,
      enum: ["offline", "online"],
      default: "offline",
      index: true,
    },
    meetLink: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "booked", "rejected", "completed", "cancelled"],
      default: "booked",
      index: true,
    },
    doctorDecisionAt: {
      type: Date,
    },
    meetLinkUploadedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Prevent double-booking for active appointments
appointmentSchema.index(
  { doctor: 1, date: 1, time: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["pending", "booked", "completed"] } },
  }
);

const Appointment = mongoose.model("Appointment", appointmentSchema);

export default Appointment;
