import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/response.js";
import { AppError } from "../../utils/AppError.js";
import { prisma } from "../../services/prisma.js";
import type { ConnectionCompanyView, ConnectionScientistView } from "@buildscience/shared";

export const connectionsRouter = Router();

/**
 * @openapi
 * /connections:
 *   get:
 *     tags: [Connections]
 *     summary: Qabul qilingan takliflar bo'yicha bog'lanishlar ro'yxati (COMPANY/SCIENTIST)
 *     responses:
 *       200:
 *         description: OK
 */
connectionsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (user.role === "ADMIN") {
      const proposals = await prisma.proposal.findMany({
        where: { status: "ACCEPTED", deletedAt: null, scientist: { deletedAt: null }, problem: { companyId: user.id } },
        include: { scientist: true, problem: true },
        orderBy: { acceptedAt: "desc" },
      });
      const items: ConnectionCompanyView[] = proposals.map((p) => ({
        proposalId: p.id,
        problemId: p.problemId,
        problemTitle: p.problem.title,
        scientistName: p.scientist.name,
        scientistEmail: p.scientist.email,
        scientistPhone: p.scientist.phone,
        specialization: p.scientist.specialization,
        organization: p.scientist.organization,
        acceptedAt: p.acceptedAt!.toISOString(),
      }));
      return ok(res, { items });
    }

    if (user.role === "USER") {
      const proposals = await prisma.proposal.findMany({
        where: { status: "ACCEPTED", deletedAt: null, scientistId: user.id, problem: { company: { deletedAt: null } } },
        include: { problem: { include: { company: true } } },
        orderBy: { acceptedAt: "desc" },
      });
      const items: ConnectionScientistView[] = proposals.map((p) => ({
        proposalId: p.id,
        problemId: p.problemId,
        problemTitle: p.problem.title,
        companyName: p.problem.company.name,
        companyEmail: p.problem.company.email,
        companyPhone: p.problem.company.phone,
        acceptedAt: p.acceptedAt!.toISOString(),
      }));
      return ok(res, { items });
    }

    ok(res, { items: [] });
  })
);

/**
 * @openapi
 * /connections/{proposalId}:
 *   get:
 *     tags: [Connections]
 *     summary: Bitta bog'lanish tafsiloti
 *     parameters:
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
connectionsRouter.get(
  "/:proposalId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const proposal = await prisma.proposal.findFirst({
      where: { id: req.params.proposalId, status: "ACCEPTED", deletedAt: null },
      include: { scientist: true, problem: { include: { company: true } } },
    });
    if (!proposal) throw AppError.notFound("Bog'lanish topilmadi.");

    const isCompanyOwner = user.role === "ADMIN" && proposal.problem.companyId === user.id;
    const isAcceptedScientist = user.role === "USER" && proposal.scientistId === user.id;
    const isAdmin = user.role === "SUPERADMIN";
    if (!isCompanyOwner && !isAcceptedScientist && !isAdmin) throw AppError.forbidden();

    if (isAcceptedScientist) {
      const item: ConnectionScientistView = {
        proposalId: proposal.id,
        problemId: proposal.problemId,
        problemTitle: proposal.problem.title,
        companyName: proposal.problem.company.name,
        companyEmail: proposal.problem.company.email,
        companyPhone: proposal.problem.company.phone,
        acceptedAt: proposal.acceptedAt!.toISOString(),
      };
      return ok(res, item);
    }

    const item: ConnectionCompanyView = {
      proposalId: proposal.id,
      problemId: proposal.problemId,
      problemTitle: proposal.problem.title,
      scientistName: proposal.scientist.name,
      scientistEmail: proposal.scientist.email,
      scientistPhone: proposal.scientist.phone,
      specialization: proposal.scientist.specialization,
      organization: proposal.scientist.organization,
      acceptedAt: proposal.acceptedAt!.toISOString(),
    };
    ok(res, item);
  })
);
