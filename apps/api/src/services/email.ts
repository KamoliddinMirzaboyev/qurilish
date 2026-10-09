import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

let transport: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransport() {
  if (!env.passwordReset.enabled) {
    throw new AppError(503, "Parolni tiklash xizmati vaqtincha mavjud emas.");
  }
  transport ??= nodemailer.createTransport({
    host: env.passwordReset.smtpHost,
    port: env.passwordReset.smtpPort,
    secure: env.passwordReset.smtpSecure,
    auth: { user: env.passwordReset.smtpUser, pass: env.passwordReset.smtpPass },
  });
  return transport;
}

export async function sendPasswordResetEmail(recipient: string, resetUrl: string): Promise<void> {
  await getTransport().sendMail({
    from: env.passwordReset.emailFrom,
    to: recipient,
    subject: "BuildScience — parolni tiklash",
    text: `Parolni tiklash uchun quyidagi havolani oching. Havola 30 daqiqa amal qiladi:\n\n${resetUrl}\n\nAgar bu so'rovni siz yubormagan bo'lsangiz, xatni e'tiborsiz qoldiring.`,
    html: `<p>Parolni tiklash uchun quyidagi havolani oching. Havola 30 daqiqa amal qiladi:</p><p><a href="${escapeHtml(resetUrl)}">Parolni tiklash</a></p><p>Agar bu so'rovni siz yubormagan bo'lsangiz, xatni e'tiborsiz qoldiring.</p>`,
  });
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
