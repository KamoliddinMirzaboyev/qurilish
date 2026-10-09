import { prisma } from "./prisma.js";

const NOTIFICATION_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export async function runMaintenance(): Promise<void> {
  const now = new Date();
  const notificationCutoff = new Date(now.getTime() - NOTIFICATION_RETENTION_MS);
  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { createdAt: { lt: notificationCutoff } } }),
    prisma.passwordResetToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }] },
    }),
  ]);
}
