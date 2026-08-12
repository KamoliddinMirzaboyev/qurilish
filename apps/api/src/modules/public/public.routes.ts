import { Router } from "express";
import { prisma } from "../../services/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/response.js";
import type { PublicStats } from "@buildscience/shared";

export const publicRouter = Router();

/**
 * @openapi
 * /public/stats:
 *   get:
 *     tags: [Public]
 *     summary: Bosh sahifa uchun umumiy statistika
 *     security: []
 *     responses:
 *       200:
 *         description: OK
 */
publicRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [openProblems, matchedProblems, totalAdmins, totalUsers] = await Promise.all([
      prisma.problem.count({ where: { status: "OPEN", deletedAt: null } }),
      prisma.problem.count({ where: { status: "MATCHED", deletedAt: null } }),
      prisma.user.count({ where: { role: "ADMIN", deletedAt: null } }),
      prisma.user.count({ where: { role: "USER", deletedAt: null } }),
    ]);
    const stats: PublicStats = { openProblems, matchedProblems, totalAdmins, totalUsers };
    ok(res, stats);
  })
);
