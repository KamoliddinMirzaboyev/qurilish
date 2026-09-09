import { Router } from "express";
import { prisma } from "../../services/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const healthRouter = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: API va bazaning holatini tekshirish
 *     security: []
 *     responses:
 *       200:
 *         description: OK
 */
healthRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    let dbOk = true;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbOk = false;
    }
    res.status(dbOk ? 200 : 503).json({
      success: true,
      data: { api: "ok", database: dbOk ? "ok" : "down" },
    });
  })
);
