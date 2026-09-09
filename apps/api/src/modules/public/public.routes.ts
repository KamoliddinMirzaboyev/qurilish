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
let cachedStats: { data: PublicStats; at: number } | null = null;
const STATS_TTL_MS = 60 * 1000;

publicRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=60");

    const now = Date.now();
    if (cachedStats && now - cachedStats.at < STATS_TTL_MS) {
      return ok(res, cachedStats.data);
    }

    const [openProblems, matchedProblems, totalAdmins, totalUsers] = await Promise.all([
      prisma.problem.count({ where: { status: "OPEN", deletedAt: null } }),
      prisma.problem.count({ where: { status: "MATCHED", deletedAt: null } }),
      prisma.user.count({ where: { role: "ADMIN", deletedAt: null } }),
      prisma.user.count({ where: { role: "USER", deletedAt: null } }),
    ]);
    const stats: PublicStats = { openProblems, matchedProblems, totalAdmins, totalUsers };
    cachedStats = { data: stats, at: now };
    ok(res, stats);
  })
);
