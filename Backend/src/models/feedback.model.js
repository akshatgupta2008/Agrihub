import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    submittedByRole: {
      type: String,
      enum: ["patient", "doctor", "admin", "guest"],
      default: "guest",
      index: true,
    },
    submittedById: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 200,
      default: "",
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: false,
    },
    message: {
      type: String,
      trim: true,
      required: true,
      minlength: 3,
      maxlength: 2000,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ submittedByRole: 1, createdAt: -1 });

const Feedback = mongoose.model("Feedback", feedbackSchema);

export default Feedback;
