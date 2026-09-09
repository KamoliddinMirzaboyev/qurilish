import { prisma } from "../services/prisma.js";
import { AppError } from "./AppError.js";

export async function assertPhoneAvailable(phone: string, excludeUserId?: string) {
  const existing = await prisma.user.findFirst({
    where: { phone, deletedAt: null, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
    select: { id: true },
  });
  if (existing) {
    throw AppError.unprocessable("Bu telefon raqami allaqachon band.", { phone: ["Bu telefon raqami allaqachon band."] });
  }
}
