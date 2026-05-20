import { clearAuthCookie } from "../lib/auth.js";

export const logout = (req, res) => {
  try {
    clearAuthCookie(res);
    res.status(200).json({ message: "Logged out successfully" });
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
  }
};
