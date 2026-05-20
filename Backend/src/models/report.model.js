import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    // Optional: a doctor may also create a report; admin-uploaded reports may not have a doctor
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      index: true,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },

    // PDF stored in Cloudinary (optional for legacy/text-only reports)
    fileUrl: {
      type: String,
      trim: true,
    },
    filePublicId: {
      type: String,
      trim: true,
      index: true,
    },
    fileOriginalName: {
      type: String,
      trim: true,
    },
    fileMimeType: {
      type: String,
      trim: true,
    },
    fileBytes: {
      type: Number,
      min: 0,
    },

    uploadedByRole: {
      type: String,
      enum: ["admin", "doctor"],
      default: "admin",
      index: true,
    },
  },
  { timestamps: true }
);

const Report = mongoose.model("Report", reportSchema);

export default Report;
