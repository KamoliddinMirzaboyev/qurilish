import { z } from "zod";

const booleanFlag = z.enum(["0", "1"]).optional().transform((value) => value === "1");
const positiveInteger = (fallback: number, max: number) => z.coerce.number().int().positive().max(max).default(fallback);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: positiveInteger(4000, 65535),
  DATABASE_URL: z.string().min(1, "DATABASE_URL majburiy."),
  SESSION_SECRET: z.string().min(1, "SESSION_SECRET majburiy."),
  SESSION_COOKIE_NAME: z.string().regex(/^[A-Za-z0-9_-]+$/).default("bs_session"),
  WEB_ORIGIN: z.string().min(1, "WEB_ORIGIN majburiy."),
  COOKIE_SAMESITE: z.enum(["lax", "none", "strict"]).optional(),
  COOKIE_SECURE: booleanFlag,
  UPLOAD_DIR: z.string().min(1).default("uploads"),
  MAX_UPLOAD_MB: positiveInteger(10, 50),
  PUBLIC_UPLOAD_BASE_URL: z.string().min(1).default("/uploads/public"),
  PG_POOL_MAX: positiveInteger(10, 100),
  PASSWORD_RESET_ENABLED: booleanFlag,
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: positiveInteger(587, 65535),
  SMTP_SECURE: booleanFlag,
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  ADMIN_NAME: z.string().optional(),
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PHONE: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
}).superRefine((value, ctx) => {
  const origins = value.WEB_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);
  if (value.NODE_ENV === "production" && (origins.length === 0 || origins.includes("*"))) {
    ctx.addIssue({ code: "custom", path: ["WEB_ORIGIN"], message: "Production'da aniq origin talab qilinadi." });
  }
  for (const origin of origins) {
    if (origin === "*" && value.NODE_ENV !== "production") continue;
    try {
      const parsedOrigin = new URL(origin);
      if (!parsedOrigin.protocol.startsWith("http") || parsedOrigin.origin !== origin) throw new Error();
    } catch {
      ctx.addIssue({ code: "custom", path: ["WEB_ORIGIN"], message: `Origin noto'g'ri: ${origin}` });
    }
  }
  if (value.NODE_ENV === "production" && value.SESSION_SECRET.length < 32) {
    ctx.addIssue({ code: "custom", path: ["SESSION_SECRET"], message: "Production SESSION_SECRET kamida 32 belgi bo'lishi kerak." });
  }
  if (value.NODE_ENV === "production" && /change-this|dev-only|example|password/i.test(value.SESSION_SECRET)) {
    ctx.addIssue({ code: "custom", path: ["SESSION_SECRET"], message: "Production SESSION_SECRET namunaviy qiymat bo'lishi mumkin emas." });
  }
  const effectiveSecure = process.env.COOKIE_SECURE === undefined ? value.NODE_ENV === "production" : value.COOKIE_SECURE;
  const effectiveSameSite = value.COOKIE_SAMESITE ?? (value.NODE_ENV === "production" ? "none" : "lax");
  if (effectiveSameSite === "none" && !effectiveSecure) {
    ctx.addIssue({ code: "custom", path: ["COOKIE_SECURE"], message: "SameSite=None uchun Secure cookie majburiy." });
  }
  if (value.PASSWORD_RESET_ENABLED) {
    for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"] as const) {
      if (!value[key]) ctx.addIssue({ code: "custom", path: [key], message: `${key} password reset uchun majburiy.` });
    }
  }
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`Environment konfiguratsiyasi noto'g'ri: ${details}`);
}

const value = parsed.data;
const isProduction = value.NODE_ENV === "production";
const origins = value.WEB_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);

export const env = {
  nodeEnv: value.NODE_ENV,
  isProduction,
  port: value.PORT,
  databaseUrl: value.DATABASE_URL,
  sessionSecret: value.SESSION_SECRET,
  sessionCookieName: value.SESSION_COOKIE_NAME,
  corsOrigin: origins.length === 1 && origins[0] === "*" ? true : origins,
  webOrigin: origins[0]!,
  cookieSameSite: value.COOKIE_SAMESITE ?? (isProduction ? "none" : "lax"),
  cookieSecure: process.env.COOKIE_SECURE === undefined ? isProduction : value.COOKIE_SECURE,
  uploadDir: value.UPLOAD_DIR,
  maxUploadMb: value.MAX_UPLOAD_MB,
  publicUploadBaseUrl: value.PUBLIC_UPLOAD_BASE_URL,
  pgPoolMax: value.PG_POOL_MAX,
  passwordReset: {
    enabled: value.PASSWORD_RESET_ENABLED,
    smtpHost: value.SMTP_HOST ?? "",
    smtpPort: value.SMTP_PORT,
    smtpSecure: value.SMTP_SECURE,
    smtpUser: value.SMTP_USER ?? "",
    smtpPass: value.SMTP_PASS ?? "",
    emailFrom: value.EMAIL_FROM ?? "",
  },
  admin: {
    name: value.ADMIN_NAME ?? "",
    email: (value.ADMIN_EMAIL ?? "").toLowerCase(),
    phone: value.ADMIN_PHONE ?? "",
    password: value.ADMIN_PASSWORD ?? "",
  },
};
