import { prisma } from "../../services/prisma.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { normalizePhone } from "../../utils/phone.js";
import { AppError } from "../../utils/AppError.js";
import type { RegisterInput } from "@buildscience/shared";

export async function registerUser(input: RegisterInput) {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw AppError.unprocessable("Bu email allaqachon ro'yxatdan o'tgan.", { email: ["Bu email allaqachon ro'yxatdan o'tgan."] });
  }

  const user = await prisma.user.create({
    data: {
      role: "USER",
      name: input.name,
      email,
      phone: normalizePhone(input.phone),
      passwordHash: await hashPassword(input.password),
      organization: input.organization || null,
      specialization: input.specialization || null,
      status: "ACTIVE",
    },
  });

  return user;
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findFirst({ where: { email: email.toLowerCase(), deletedAt: null } });
  if (!user) throw AppError.badRequest("Email yoki parol noto'g'ri.");

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw AppError.badRequest("Email yoki parol noto'g'ri.");

  if (user.status === "BLOCKED") {
    throw new AppError(403, "Ushbu foydalanuvchi bloklangan. Administrator bilan bog'laning.");
  }

  return user;
}
