import rateLimit from "express-rate-limit";

const isTest = process.env.NODE_ENV === "test";

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { success: false, message: "Urinishlar soni ko'p. Birozdan so'ng qayta urinib ko'ring." },
});

export const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { success: false, message: "Urinishlar soni ko'p. Birozdan so'ng qayta urinib ko'ring." },
});

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { success: false, message: "Yuklashlar soni ko'p. Birozdan so'ng qayta urinib ko'ring." },
});
