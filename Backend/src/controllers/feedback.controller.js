import Feedback from "../models/feedback.model.js";

const safeString = (v) => String(v ?? "").trim();

export const submitFeedback = async (req, res) => {
  try {
    const message = safeString(req.body?.message);

    const ratingRaw = req.body?.rating;
    const ratingNum = ratingRaw === "" || ratingRaw === null || typeof ratingRaw === "undefined" ? null : Number(ratingRaw);

    if (!message || message.length < 3) {
      return res.status(400).json({ message: "Feedback message is required" });
    }

    if (ratingNum !== null && (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5)) {
      return res.status(400).json({ message: "rating must be a number from 1 to 5" });
    }

    const submittedByRole = req.role;
    const submittedById = req.user?._id;
    const name = safeString(req.user?.fullName);
    const email = safeString(req.user?.email).toLowerCase();

    const created = await Feedback.create({
      submittedByRole,
      submittedById,
      name,
      email,
      rating: ratingNum === null ? undefined : ratingNum,
      message,
      metadata: {
        userAgent: safeString(req.headers["user-agent"]),
        origin: safeString(req.headers.origin),
        referer: safeString(req.headers.referer),
      },
    });

    res.status(201).json({ message: "Feedback submitted", feedbackId: created._id });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};
