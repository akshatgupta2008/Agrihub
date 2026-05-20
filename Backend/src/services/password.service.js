import bcrypt from "bcryptjs";

export const hashPassword = async (plainPassword) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(String(plainPassword), salt);
};

export const verifyPassword = (plainPassword, hashedPassword) => {
  return bcrypt.compare(String(plainPassword), String(hashedPassword));
};
