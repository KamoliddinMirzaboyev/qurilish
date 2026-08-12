import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ success: false, message: "So'ralgan manzil topilmadi." });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ success: false, message: err.message, errors: err.errors });
  }

  if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
    return res.status(409).json({ success: false, message: "Bu ma'lumot allaqachon mavjud." });
  }

  console.error(err);

  return res.status(500).json({ success: false, message: "Kutilmagan server xatoligi yuz berdi. Qayta urinib ko'ring." });
}
