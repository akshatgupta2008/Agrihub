import mongoose from "mongoose";

const patientSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    aadhaarNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    disabilityId: {
      type: String,
      unique: true,
      sparse: true,
    },
    patientType: {
      type: String,
      enum: ["general", "special"],
      default: "general",
    },
  },
  { timestamps: true }
);

const Patient = mongoose.model("Patient", patientSchema);

export default Patient;
