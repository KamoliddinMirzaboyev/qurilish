import crypto from "node:crypto";
import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { sessionPgPool } from "../middleware/session.js";

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: "/",
  } as const;
}

export function csrfCookieOptions() {
  return {
    httpOnly: false,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  } as const;
}

export function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function newCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function establishSession(req: Request, userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = userId;
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

export async function destroyUserSessions(userId: string): Promise<void> {
  await sessionPgPool.query(`DELETE FROM session WHERE sess->>'userId' = $1`, [userId]);
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(env.sessionCookieName, sessionCookieOptions());
}
