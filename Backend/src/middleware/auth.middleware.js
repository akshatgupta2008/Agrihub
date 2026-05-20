import jwt from "jsonwebtoken";
import { ENV } from "../lib/ENV.js";
import Patient from "../models/patient.model.js";
import Doctor from "../models/doctor.model.js";
import Admin from "../models/admin.model.js";

const roleModel = {
  patient: Patient,
  doctor: Doctor,
  admin: Admin,
};

export const requireAuth = async (req, res, next) => {
  try {
    if (!ENV.JWT_SECRET) {
      return res.status(500).json({ message: "Server misconfigured: JWT secret missing" });
    }

    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    const { userId, role } = decoded || {};

    const Model = roleModel[role];
    if (!Model) return res.status(401).json({ message: "Unauthorized" });

    const user = await Model.findById(userId).select("-password");
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    req.user = user;
    req.role = role;
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.role || !roles.includes(req.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
};
