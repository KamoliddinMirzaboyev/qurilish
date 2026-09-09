import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { removeUploadedFiles } from "../utils/files.js";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ success: false, message: "So'ralgan manzil topilmadi." });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  void removeUploadedFiles(req);

  if (err instanceof AppError) {
    return res.status(err.status).json({ success: false, message: err.message, errors: err.errors });
  }

  if (err instanceof SyntaxError && "status" in err && (err as { status: number }).status === 400) {
    return res.status(400).json({ success: false, message: "So'rov formati (JSON) noto'g'ri." });
  }

  if (err && typeof err === "object" && "code" in err) {
    const prismaErr = err as { code: string; meta?: Record<string, unknown> };
    if (prismaErr.code === "P2002") {
      return res.status(409).json({ success: false, message: "Bu ma'lumot allaqachon mavjud." });
    }
    if (prismaErr.code === "P2003") {
      return res.status(400).json({ success: false, message: "Bog'liq ma'lumot topilmadi yoki cheklov buzildi." });
    }
    if (prismaErr.code === "P2025") {
      return res.status(404).json({ success: false, message: "Talab qilingan yozuv topilmadi." });
    }
  }

  console.error(err);

  return res.status(500).json({ success: false, message: "Kutilmagan server xatoligi yuz berdi. Qayta urinib ko'ring." });
}
