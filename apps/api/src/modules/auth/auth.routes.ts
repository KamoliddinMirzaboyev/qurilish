import { Router } from "express";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  updateLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@buildscience/shared";
import { validateBody } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { authLimiter, sensitiveLimiter } from "../../middleware/rateLimit.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/response.js";
import { toAuthUser } from "../../utils/serializers.js";
import { registerUser, authenticateUser, requestPasswordReset, resetPassword } from "./auth.service.js";
import { prisma } from "../../services/prisma.js";
import { verifyPassword, hashPassword } from "../../utils/password.js";
import { normalizePhone } from "../../utils/phone.js";
import { AppError } from "../../utils/AppError.js";
import { clearSessionCookie, destroyUserSessions, establishSession } from "../../utils/sessionAuth.js";
import { ensureCsrfCookie } from "../../middleware/csrf.js";
import { assertPhoneAvailable } from "../../utils/unique.js";

export const authRouter = Router();

authRouter.get("/csrf", (req, res) => {
  const csrfToken = ensureCsrfCookie(req, res);
  ok(res, { csrfToken });
});

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Ro'yxatdan o'tish (har doim USER roli bilan yaratiladi)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone, password, passwordConfirm]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               password: { type: string }
 *               passwordConfirm: { type: string }
 *               organization: { type: string }
 *               specialization: { type: string }
 *     responses:
 *       201:
 *         description: Ro'yxatdan o'tildi, sessiya ochildi
 */
authRouter.post(
  "/register",
  authLimiter,
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const user = await registerUser(req.body);
    await establishSession(req, user.id);
    ok(res, toAuthUser(user), 201);
  })
);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Tizimga kirish
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Kirildi, sessiya ochildi
 */
authRouter.post(
  "/login",
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await authenticateUser(req.body.email, req.body.password);
    await establishSession(req, user.id);
    ok(res, toAuthUser(user));
  })
);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Tizimdan chiqish
 *     responses:
 *       200:
 *         description: Chiqildi
 */
authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => {
    clearSessionCookie(res);
    ok(res, { loggedOut: true });
  });
});

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Joriy foydalanuvchi ma'lumotlari
 *     responses:
 *       200:
 *         description: OK
 */
authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, toAuthUser(req.user!));
  })
);

/**
 * @openapi
 * /auth/profile:
 *   patch:
 *     tags: [Auth]
 *     summary: Profilni yangilash
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone]
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               organization: { type: string }
 *               specialization: { type: string }
 *               bio: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
authRouter.patch(
  "/profile",
  requireAuth,
  validateBody(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const phone = normalizePhone(req.body.phone);
    await assertPhoneAvailable(phone, req.user!.id);
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        name: req.body.name,
        phone,
        organization: req.body.organization || null,
        specialization: req.body.specialization || null,
        bio: req.body.bio || null,
      },
    });
    ok(res, toAuthUser(updated));
  })
);

/**
 * @openapi
 * /auth/password:
 *   patch:
 *     tags: [Auth]
 *     summary: Parolni almashtirish
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword, confirmPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string }
 *               confirmPassword: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
authRouter.patch(
  "/password",
  requireAuth,
  sensitiveLimiter,
  validateBody(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const valid = await verifyPassword(req.body.currentPassword, req.user!.passwordHash);
    if (!valid) throw AppError.badRequest("Joriy parol noto'g'ri.", { currentPassword: ["Joriy parol noto'g'ri."] });

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { passwordHash: await hashPassword(req.body.newPassword) },
    });
    await destroyUserSessions(req.user!.id);
    await establishSession(req, req.user!.id);
    ok(res, { updated: true });
  })
);

/**
 * @openapi
 * /auth/email:
 *   patch:
 *     tags: [Auth]
 *     summary: Login (email)ni almashtirish — joriy parol talab qilinadi
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newLogin, currentPassword]
 *             properties:
 *               newLogin: { type: string }
 *               currentPassword: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
authRouter.patch(
  "/email",
  requireAuth,
  sensitiveLimiter,
  validateBody(updateLoginSchema),
  asyncHandler(async (req, res) => {
    const valid = await verifyPassword(req.body.currentPassword, req.user!.passwordHash);
    if (!valid) throw AppError.badRequest("Joriy parol noto'g'ri.", { currentPassword: ["Joriy parol noto'g'ri."] });

    const newLogin: string = req.body.newLogin;
    const existing = await prisma.user.findUnique({ where: { email: newLogin } });
    if (existing && existing.id !== req.user!.id) {
      throw AppError.unprocessable("Bu login/email allaqachon band.", { newLogin: ["Bu login/email allaqachon band."] });
    }

    const updated = await prisma.user.update({ where: { id: req.user!.id }, data: { email: newLogin } });
    ok(res, toAuthUser(updated));
  })
);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Parolni tiklash uchun so'rov yuborish
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string }
 *     responses:
 *       200:
 *         description: So'rov qabul qilindi
 */
authRouter.post(
  "/forgot-password",
  authLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const result = await requestPasswordReset(req.body.email);
    ok(res, result);
  })
);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Parolni yangilash (token orqali)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword, confirmPassword]
 *             properties:
 *               token: { type: string }
 *               newPassword: { type: string }
 *               confirmPassword: { type: string }
 *     responses:
 *       200:
 *         description: Parol muvaffaqiyatli yangilandi
 */
authRouter.post(
  "/reset-password",
  authLimiter,
  validateBody(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const result = await resetPassword(req.body.token, req.body.newPassword);
    ok(res, result);
  })
);
