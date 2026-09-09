import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { csrfCookieOptions, newCsrfToken, readCookie } from "../utils/sessionAuth.js";

export const CSRF_COOKIE = "bs_csrf";
export const CSRF_HEADER = "x-csrf-token";

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

export function ensureCsrfCookie(req: Request, res: Response): string {
  const existing = readCookie(req, CSRF_COOKIE);
  if (existing && existing.length >= 32) {
    res.cookie(CSRF_COOKIE, existing, csrfCookieOptions());
    return existing;
  }
  const token = newCsrfToken();
  res.cookie(CSRF_COOKIE, token, csrfCookieOptions());
  return token;
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (env.nodeEnv === "test") return next();

  const token = ensureCsrfCookie(req, res);
  if (SAFE.has(req.method.toUpperCase())) return next();

  const path = req.path;
  if (path === "/api/health" || path.startsWith("/api/health/")) return next();

  const header = req.get(CSRF_HEADER) ?? "";
  if (!header || header !== token) {
    return next(AppError.forbidden("CSRF token noto'g'ri."));
  }
  next();
}
