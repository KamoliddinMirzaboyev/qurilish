import crypto from "node:crypto";
import { prisma } from "../../services/prisma.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { normalizePhone } from "../../utils/phone.js";
import { AppError } from "../../utils/AppError.js";
import { assertPhoneAvailable } from "../../utils/unique.js";
import { destroyUserSessions } from "../../utils/sessionAuth.js";
import { env } from "../../config/env.js";
import type { RegisterInput } from "@buildscience/shared";
import { sendPasswordResetEmail } from "../../services/email.js";

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

function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordReset(email: string): Promise<{ message: string; resetToken?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findFirst({
    where: { email: normalizedEmail, deletedAt: null },
    select: { id: true, email: true, status: true },
  });

  if (!env.passwordReset.enabled && env.isProduction) {
    throw new AppError(503, "Parolni tiklash xizmati vaqtincha mavjud emas.");
  }

  let token: string | undefined;
  if (user && user.status !== "BLOCKED") {
    token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = hashResetToken(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } }),
    ]);

    if (env.passwordReset.enabled) {
      const resetUrl = `${env.webOrigin}/reset-password?token=${encodeURIComponent(token)}`;
      try {
        await sendPasswordResetEmail(user.email, resetUrl);
      } catch {
        await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
        throw new AppError(503, "Parolni tiklash xatini yuborib bo'lmadi. Keyinroq qayta urinib ko'ring.");
      }
    }
  }

  return {
    message: "Agar ko'rsatilgan email tizimda mavjud bo'lsa, parolni tiklash yo'riqnomasi yuborildi.",
    ...(env.nodeEnv !== "production" && token ? { resetToken: token } : {}),
  };
}

export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
  const tokenHash = hashResetToken(token);
  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt <= new Date() || resetRecord.user.deletedAt) {
    throw AppError.badRequest("Parolni tiklash havolasi yaroqsiz, ishlatilgan yoki muddati o'tgan.");
  }
  if (resetRecord.user.status === "BLOCKED") {
    throw new AppError(403, "Ushbu foydalanuvchi bloklangan. Administrator bilan bog'laning.");
  }
  const newHash = await hashPassword(newPassword);
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: resetRecord.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) throw AppError.badRequest("Parolni tiklash havolasi allaqachon ishlatilgan.");
    await tx.user.update({ where: { id: resetRecord.userId }, data: { passwordHash: newHash } });
    await tx.passwordResetToken.deleteMany({
      where: { userId: resetRecord.userId, id: { not: resetRecord.id } },
    });
  });

  await destroyUserSessions(resetRecord.userId);

  return { success: true };
}
