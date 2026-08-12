import { Router } from "express";
import { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema } from "@buildscience/shared";
import { validateBody } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { authLimiter } from "../../middleware/rateLimit.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/response.js";
import { toAuthUser } from "../../utils/serializers.js";
import { registerUser, authenticateUser } from "./auth.service.js";
import { prisma } from "../../services/prisma.js";
import { verifyPassword, hashPassword } from "../../utils/password.js";
import { normalizePhone } from "../../utils/phone.js";
import { AppError } from "../../utils/AppError.js";
import { env } from "../../config/env.js";

export const authRouter = Router();

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
    req.session.userId = user.id;
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
    req.session.userId = user.id;
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
    res.clearCookie(env.sessionCookieName);
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
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        name: req.body.name,
        phone: normalizePhone(req.body.phone),
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
  validateBody(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const valid = await verifyPassword(req.body.currentPassword, req.user!.passwordHash);
    if (!valid) throw AppError.badRequest("Joriy parol noto'g'ri.", { currentPassword: ["Joriy parol noto'g'ri."] });

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { passwordHash: await hashPassword(req.body.newPassword) },
    });
    ok(res, { updated: true });
  })
);
