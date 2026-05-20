import express from "express";
import Doctor from "../models/doctor.model.js";

const router = express.Router();

router.get("/doctors", async (req, res) => {
  try {
    const doctors = await Doctor.find({})
      .select("fullName specialty licenseNumber isAvailable slots hospital averageRating ratingCount")
      .sort({ averageRating: -1, ratingCount: -1, fullName: 1 })
      .lean();
    res.status(200).json(doctors);
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
