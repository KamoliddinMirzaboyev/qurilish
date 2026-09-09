import crypto from "node:crypto";
import { prisma } from "../../services/prisma.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { normalizePhone } from "../../utils/phone.js";
import { AppError } from "../../utils/AppError.js";
import { assertPhoneAvailable } from "../../utils/unique.js";
import { destroyUserSessions } from "../../utils/sessionAuth.js";
import { env } from "../../config/env.js";
import type { RegisterInput } from "@buildscience/shared";

export async function registerUser(input: RegisterInput) {
  const email = input.email.toLowerCase();
  const phone = normalizePhone(input.phone);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw AppError.unprocessable("Ro'yxatdan o'tib bo'lmadi. Ma'lumotlarni tekshiring.", {
      email: ["Ro'yxatdan o'tib bo'lmadi. Ma'lumotlarni tekshiring."],
    });
  }
  await assertPhoneAvailable(phone);

  const user = await prisma.user.create({
    data: {
      role: "USER",
      name: input.name,
      email,
      phone,
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

function generateResetToken(userId: string, passwordHash: string): string {
  const exp = Date.now() + 1000 * 60 * 60; // 1 hour expiration
  const data = `${userId}:${exp}:${passwordHash.slice(-16)}`;
  const sig = crypto.createHmac("sha256", env.sessionSecret).update(data).digest("hex");
  const payload = JSON.stringify({ uid: userId, exp, sig });
  return Buffer.from(payload, "utf-8").toString("base64url");
}

function verifyResetToken(token: string, passwordHash: string): { userId: string } {
  let parsed: { uid?: string; exp?: number; sig?: string };
  try {
    const raw = Buffer.from(token, "base64url").toString("utf-8");
    parsed = JSON.parse(raw);
  } catch {
    throw AppError.badRequest("Parolni tiklash havolasi yaroqsiz yoki buzilgan.");
  }

  if (!parsed.uid || typeof parsed.exp !== "number" || !parsed.sig) {
    throw AppError.badRequest("Parolni tiklash havolasi yaroqsiz.");
  }

  if (Date.now() > parsed.exp) {
    throw AppError.badRequest("Parolni tiklash havolasining muddati o'tgan. Iltimos, qaytadan so'rov yuboring.");
  }

  const expectedData = `${parsed.uid}:${parsed.exp}:${passwordHash.slice(-16)}`;
  const expectedSig = crypto.createHmac("sha256", env.sessionSecret).update(expectedData).digest("hex");

  const sigBuf = Buffer.from(parsed.sig, "hex");
  const expectedBuf = Buffer.from(expectedSig, "hex");

  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw AppError.badRequest("Parolni tiklash havolasi yaroqsiz yoki allaqachon ishlatilgan.");
  }

  return { userId: parsed.uid };
}

export async function requestPasswordReset(email: string): Promise<{ message: string; resetToken?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findFirst({
    where: { email: normalizedEmail, deletedAt: null },
    select: { id: true, email: true, passwordHash: true, status: true },
  });

  let token: string | undefined;

  if (user && user.status !== "BLOCKED") {
    token = generateResetToken(user.id, user.passwordHash);
    const resetUrl = `${env.webOrigin}/reset-password?token=${token}`;
    // Production email integration hook; logs link in dev / staging
    console.log(`[AUTH] Password reset requested for ${user.email}: ${resetUrl}`);
  }

  return {
    message: "Agar ko'rsatilgan email tizimda mavjud bo'lsa, parolni tiklash yo'riqnomasi yuborildi.",
    ...(env.nodeEnv !== "production" && token ? { resetToken: token } : {}),
  };
}

export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
  let parsed: { uid?: string };
  try {
    const raw = Buffer.from(token, "base64url").toString("utf-8");
    parsed = JSON.parse(raw);
  } catch {
    throw AppError.badRequest("Parolni tiklash havolasi yaroqsiz yoki buzilgan.");
  }

  if (!parsed.uid) {
    throw AppError.badRequest("Parolni tiklash havolasi yaroqsiz.");
  }

  const user = await prisma.user.findUnique({
    where: { id: parsed.uid },
    select: { id: true, passwordHash: true, status: true, deletedAt: true },
  });

  if (!user || user.deletedAt) {
    throw AppError.badRequest("Foydalanuvchi topilmadi.");
  }

  if (user.status === "BLOCKED") {
    throw new AppError(403, "Ushbu foydalanuvchi bloklangan. Administrator bilan bog'laning.");
  }

  // Cryptographically verifies signature against user's current passwordHash and checks expiration
  verifyResetToken(token, user.passwordHash);

  // Update password
  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  // Invalidate all active sessions for this user
  await destroyUserSessions(user.id);

  return { success: true };
}
