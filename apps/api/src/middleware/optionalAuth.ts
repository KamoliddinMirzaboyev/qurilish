import type { NextFunction, Request, Response } from "express";
import { prisma } from "../services/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const optionalAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const userId = req.session.userId;
  if (userId) {
    const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null, status: "ACTIVE" } });
    if (user) req.user = user;
    else req.session.userId = undefined;
  }
  next();
});
