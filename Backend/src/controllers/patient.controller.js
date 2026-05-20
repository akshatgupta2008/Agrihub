import Patient from "../models/patient.model.js";
import { signToken, setAuthCookie, clearAuthCookie } from "../lib/auth.js";
import { hashPassword, verifyPassword } from "../services/password.service.js";

const cleanString = (v) => String(v ?? "").trim();
const cleanEmail = (v) => cleanString(v).toLowerCase();
const emptyToUndefined = (v) => {
  const s = cleanString(v);
  return s ? s : undefined;
};

export const signup = async (req, res) => {
  const { fullName, email, password, aadhaarNumber, disabilityId, patientType } = req.body;

  try {
    const name = cleanString(fullName);
    const emailNorm = cleanEmail(email);
    const pwd = String(password ?? "");

    if (!name || !emailNorm || !pwd) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (pwd.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existing = await Patient.findOne({ email: emailNorm });
    if (existing) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await hashPassword(pwd);

    const patientTypeNorm = patientType === "special" ? "special" : "general";

    const newPatient = await Patient.create({
      fullName: name,
      email: emailNorm,
      password: hashedPassword,
      // IMPORTANT: don't store empty strings in unique fields, it breaks signups.
      aadhaarNumber: emptyToUndefined(aadhaarNumber),
      disabilityId: emptyToUndefined(disabilityId),
      patientType: patientTypeNorm,
    });

    const token = signToken({ userId: newPatient._id, role: "patient" });
    setAuthCookie(res, token);

    res.status(201).json({
      role: "patient",
      _id: newPatient._id,
      fullName: newPatient.fullName,
      email: newPatient.email,
      patientType: newPatient.patientType,
    });
  } catch (error) {
    if (error?.code === 11000) {
      // Duplicate unique fields (email/aadhaar/disability)
      return res.status(409).json({ message: "Account already exists with the provided details" });
    }
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const emailNorm = cleanEmail(email);
    const pwd = String(password ?? "");

    if (!emailNorm || !pwd) return res.status(400).json({ message: "All fields are required" });

    const patient = await Patient.findOne({ email: emailNorm });
    if (!patient) return res.status(400).json({ message: "Invalid credentials" });

    const ok = await verifyPassword(pwd, patient.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    const token = signToken({ userId: patient._id, role: "patient" });
    setAuthCookie(res, token);

    res.status(200).json({
      role: "patient",
      _id: patient._id,
      fullName: patient.fullName,
      email: patient.email,
      patientType: patient.patientType,
    });
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    clearAuthCookie(res);
    res.status(200).json({ message: "Logged out successfully" });
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json({ role: "patient", ...req.user.toObject() });
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};
