import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { env } from "../config/env.js";

// Session store uchun alohida, chegaralangan pool — Prisma pool'idan mustaqil.
export const sessionPgPool = new pg.Pool({
  connectionString: env.databaseUrl,
  max: env.pgPoolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

const PgSession = connectPgSimple(session);

export const sessionMiddleware = session({
  store: new PgSession({
    pool: sessionPgPool,
    tableName: "session",
    createTableIfMissing: true,
    // Muddati o'tgan sessiyalarni davriy tozalash — jadval shishib ketmasin.
    pruneSessionInterval: 15 * 60, // sekund
  }),
  name: env.sessionCookieName,
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  proxy: true,
  cookie: {
    httpOnly: true,
    secure: env.cookieSecure,
    // Cross-site deployment uchun "none" faqat secure=true (HTTPS) bilan ishlaydi.
    sameSite: env.cookieSameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
});
