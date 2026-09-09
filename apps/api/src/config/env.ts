const REQUIRED = ["DATABASE_URL", "SESSION_SECRET", "WEB_ORIGIN"] as const;

for (const key of REQUIRED) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const isProduction = process.env.NODE_ENV === "production";

// ADMIN_* faqat seed uchun kerak — runtime'da majburiy emas.
// Seed ishga tushganda o'zi tekshiradi (qarang: prisma/seed.ts).
const rawWebOrigin = (process.env.WEB_ORIGIN as string).trim();

if (isProduction && (rawWebOrigin === "*" || rawWebOrigin.length === 0)) {
  throw new Error("Production da WEB_ORIGIN aniq origin ro'yxati bo'lishi shart (* taqiqlanadi).");
}

if (isProduction && (process.env.SESSION_SECRET ?? "").includes("change-this-to-a-long-random-string")) {
  throw new Error("Production da SESSION_SECRET default qiymat bo'lishi mumkin emas.");
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction,
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL as string,
  sessionSecret: process.env.SESSION_SECRET as string,
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? "bs_session",
  /**
   * CORS siyosati:
   *  - "*"  → faqat non-prod: har qanday origin aks ettiriladi.
   *  - vergul bilan ajratilgan ro'yxat → faqat shu originlar.
   */
  corsOrigin: rawWebOrigin === "*" ? true : rawWebOrigin.split(",").map((o) => o.trim()).filter(Boolean),
  webOrigin: rawWebOrigin,
  cookieSameSite: (process.env.COOKIE_SAMESITE as "lax" | "none" | "strict" | undefined) ?? (isProduction ? "none" : "lax"),
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "1" : isProduction,
  uploadDir: process.env.UPLOAD_DIR ?? "uploads",
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 10),
  publicUploadBaseUrl: process.env.PUBLIC_UPLOAD_BASE_URL ?? "/uploads/public",
  pgPoolMax: Number(process.env.PG_POOL_MAX ?? 10),
  admin: {
    name: process.env.ADMIN_NAME ?? "",
    email: (process.env.ADMIN_EMAIL ?? "").toLowerCase(),
    phone: process.env.ADMIN_PHONE ?? "",
    password: process.env.ADMIN_PASSWORD ?? "",
  },
};
