import { Router } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import type { Prisma } from "@prisma/client";
import { createProposalSchema, updateProposalSchema, paginationQuerySchema } from "@buildscience/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateQuery } from "../../middleware/validate.js";
import { handleProposalUpload, uploadRoot } from "../../middleware/upload.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, paginate } from "../../utils/response.js";
import { AppError } from "../../utils/AppError.js";
import { prisma } from "../../services/prisma.js";
import { toProposalListItem } from "./proposals.serializers.js";

export const proposalsRouter = Router();

/**
 * @openapi
 * /company/proposals/recent:
 *   get:
 *     tags: [Proposals]
 *     summary: Kompaniyaning so'nggi 5 ta taklifi (COMPANY)
 *     responses:
 *       200:
 *         description: OK
 */
proposalsRouter.get(
  "/company/proposals/recent",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const proposals = await prisma.proposal.findMany({
      where: { deletedAt: null, problem: { companyId: req.user!.id, deletedAt: null } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { scientist: true, problem: { include: { company: true } } },
    });
    ok(res, { items: proposals.map(toProposalListItem) });
  })
);

/**
 * @openapi
 * /company/proposals:
 *   get:
 *     tags: [Proposals]
 *     summary: Kompaniyaning barcha muammolariga kelgan takliflar (sahifalangan, COMPANY)
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: OK
 */
proposalsRouter.get(
  "/company/proposals",
  requireAuth,
  requireRole("ADMIN"),
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = paginationQuerySchema.parse(req.query);
    const status = typeof req.query.status === "string" ? req.query.status : undefined;

    const where: Prisma.ProposalWhereInput = {
      deletedAt: null,
      problem: { companyId: req.user!.id, deletedAt: null },
      ...(status && status !== "ALL" ? { status: status as Prisma.EnumProposalStatusFilter["equals"] } : {}),
    };

    const [proposals, total] = await Promise.all([
      prisma.proposal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { scientist: true, problem: { include: { company: true } } },
      }),
      prisma.proposal.count({ where }),
    ]);

    ok(res, paginate(proposals.map(toProposalListItem), page, pageSize, total));
  })
);

function parseProposalBody(body: Record<string, unknown>) {
  const result = createProposalSchema.safeParse({
    solutionText: body.solutionText,
    estimatedDays: body.estimatedDays,
    priceNegotiable: body.priceNegotiable === "true" || body.priceNegotiable === true,
    proposedPrice: body.proposedPrice === "" || body.proposedPrice == null ? null : body.proposedPrice,
  });
  return result;
}

async function removeFileSafely(storedName: string | null) {
  if (!storedName) return;
  const filePath = path.join(uploadRoot, storedName);
  try {
    await fs.unlink(filePath);
  } catch {
    // ponytail: best-effort cleanup, file may already be gone
  }
}

/**
 * @openapi
 * /problems/{problemId}/proposals:
 *   post:
 *     tags: [Proposals]
 *     summary: Muammoga taklif yuborish (SCIENTIST, fayl ilova qilish mumkin)
 *     parameters:
 *       - in: path
 *         name: problemId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [solutionText, estimatedDays, priceNegotiable]
 *             properties:
 *               solutionText: { type: string }
 *               estimatedDays: { type: integer }
 *               priceNegotiable: { type: boolean }
 *               proposedPrice: { type: number, nullable: true }
 *               attachment: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Yuborildi
 */
proposalsRouter.post(
  "/problems/:problemId/proposals",
  requireAuth,
  requireRole("USER"),
  handleProposalUpload,
  asyncHandler(async (req, res) => {
    const parsed = parseProposalBody(req.body);
    if (!parsed.success) {
      await removeFileSafely(req.file?.filename ?? null);
      const errors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "form";
        errors[key] = [...(errors[key] ?? []), issue.message];
      }
      throw AppError.unprocessable("Kiritilgan ma'lumotlarda xatolik bor.", errors);
    }

    const problem = await prisma.problem.findFirst({ where: { id: req.params.problemId, deletedAt: null } });
    if (!problem) {
      await removeFileSafely(req.file?.filename ?? null);
      throw AppError.notFound("Muammo topilmadi.");
    }
    if (problem.status !== "OPEN") {
      await removeFileSafely(req.file?.filename ?? null);
      throw AppError.conflict("Bu muammoga taklif yuborib bo'lmaydi.");
    }

    const existing = await prisma.proposal.findFirst({
      where: { problemId: problem.id, scientistId: req.user!.id, deletedAt: null },
    });
    if (existing) {
      await removeFileSafely(req.file?.filename ?? null);
      throw AppError.conflict("Siz bu muammoga allaqachon taklif yuborgansiz.");
    }

    const proposal = await prisma.proposal.create({
      data: {
        problemId: problem.id,
        scientistId: req.user!.id,
        solutionText: parsed.data.solutionText,
        estimatedDays: parsed.data.estimatedDays,
        priceNegotiable: parsed.data.priceNegotiable,
        proposedPrice: parsed.data.proposedPrice ?? null,
        attachmentOriginalName: req.file?.originalname ?? null,
        attachmentStoredName: req.file?.filename ?? null,
        attachmentMime: req.file?.mimetype ?? null,
        attachmentSize: req.file?.size ?? null,
        status: "PENDING",
      },
      include: { scientist: true },
    });

    ok(res, toProposalListItem(proposal), 201);
  })
);

/**
 * @openapi
 * /problems/{problemId}/proposals:
 *   get:
 *     tags: [Proposals]
 *     summary: Muammoga kelgan takliflar ro'yxati (COMPANY egasi yoki ADMIN)
 *     parameters:
 *       - in: path
 *         name: problemId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
proposalsRouter.get(
  "/problems/:problemId/proposals",
  requireAuth,
  asyncHandler(async (req, res) => {
    const problem = await prisma.problem.findFirst({ where: { id: req.params.problemId, deletedAt: null } });
    if (!problem) throw AppError.notFound("Muammo topilmadi.");
    if (req.user!.role !== "SUPERADMIN" && problem.companyId !== req.user!.id) {
      throw AppError.forbidden();
    }

    const proposals = await prisma.proposal.findMany({
      where: { problemId: problem.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { scientist: true },
    });

    ok(res, { items: proposals.map(toProposalListItem) });
  })
);

/**
 * @openapi
 * /proposals/mine:
 *   get:
 *     tags: [Proposals]
 *     summary: O'zimning takliflarim (SCIENTIST)
 *     responses:
 *       200:
 *         description: OK
 */
proposalsRouter.get(
  "/proposals/mine",
  requireAuth,
  requireRole("USER"),
  asyncHandler(async (req, res) => {
    const proposals = await prisma.proposal.findMany({
      where: { scientistId: req.user!.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { scientist: true, problem: { include: { company: true } } },
    });
    ok(res, { items: proposals.map(toProposalListItem) });
  })
);

async function loadProposalWithAccess(proposalId: string, userId: string, role: string) {
  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, deletedAt: null },
    include: { scientist: true, problem: { include: { company: true } } },
  });
  if (!proposal) throw AppError.notFound("Taklif topilmadi.");

  const isOwnerScientist = proposal.scientistId === userId;
  const isOwnerCompany = proposal.problem?.companyId === userId;
  const isAdmin = role === "SUPERADMIN";
  if (!isOwnerScientist && !isOwnerCompany && !isAdmin) throw AppError.forbidden();

  return proposal;
}

/**
 * @openapi
 * /proposals/{proposalId}:
 *   get:
 *     tags: [Proposals]
 *     summary: Taklif tafsiloti (egasi, muammo kompaniyasi yoki ADMIN)
 *     parameters:
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
proposalsRouter.get(
  "/proposals/:proposalId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const proposal = await loadProposalWithAccess(req.params.proposalId!, req.user!.id, req.user!.role);
    ok(res, toProposalListItem(proposal));
  })
);

/**
 * @openapi
 * /proposals/{proposalId}:
 *   patch:
 *     tags: [Proposals]
 *     summary: Taklifni tahrirlash (faqat PENDING, SCIENTIST egasi)
 *     parameters:
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [solutionText, estimatedDays, priceNegotiable]
 *             properties:
 *               solutionText: { type: string }
 *               estimatedDays: { type: integer }
 *               priceNegotiable: { type: boolean }
 *               proposedPrice: { type: number, nullable: true }
 *               attachment: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: OK
 */
proposalsRouter.patch(
  "/proposals/:proposalId",
  requireAuth,
  requireRole("USER"),
  handleProposalUpload,
  asyncHandler(async (req, res) => {
    const proposal = await prisma.proposal.findFirst({
      where: { id: req.params.proposalId, deletedAt: null },
      include: { problem: true },
    });
    if (!proposal) {
      await removeFileSafely(req.file?.filename ?? null);
      throw AppError.notFound("Taklif topilmadi.");
    }
    if (proposal.scientistId !== req.user!.id) {
      await removeFileSafely(req.file?.filename ?? null);
      throw AppError.forbidden();
    }
    if (proposal.status !== "PENDING" || proposal.problem?.status !== "OPEN") {
      await removeFileSafely(req.file?.filename ?? null);
      throw AppError.conflict("Faqat kutilayotgan va ochiq muammo bo'yicha taklifni tahrirlash mumkin.");
    }

    const parsed = updateProposalSchema.safeParse({
      solutionText: req.body.solutionText,
      estimatedDays: req.body.estimatedDays,
      priceNegotiable: req.body.priceNegotiable === "true" || req.body.priceNegotiable === true,
      proposedPrice: req.body.proposedPrice === "" || req.body.proposedPrice == null ? null : req.body.proposedPrice,
    });
    if (!parsed.success) {
      await removeFileSafely(req.file?.filename ?? null);
      const errors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "form";
        errors[key] = [...(errors[key] ?? []), issue.message];
      }
      throw AppError.unprocessable("Kiritilgan ma'lumotlarda xatolik bor.", errors);
    }

    const oldStoredName = proposal.attachmentStoredName;
    const updated = await prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        solutionText: parsed.data.solutionText,
        estimatedDays: parsed.data.estimatedDays,
        priceNegotiable: parsed.data.priceNegotiable,
        proposedPrice: parsed.data.proposedPrice ?? null,
        ...(req.file
          ? {
              attachmentOriginalName: req.file.originalname,
              attachmentStoredName: req.file.filename,
              attachmentMime: req.file.mimetype,
              attachmentSize: req.file.size,
            }
          : {}),
      },
      include: { scientist: true },
    });

    if (req.file && oldStoredName) {
      await removeFileSafely(oldStoredName);
    }

    ok(res, toProposalListItem(updated));
  })
);

/**
 * @openapi
 * /proposals/{proposalId}/withdraw:
 *   post:
 *     tags: [Proposals]
 *     summary: Taklifni bekor qilish (faqat PENDING, SCIENTIST egasi)
 *     parameters:
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
proposalsRouter.post(
  "/proposals/:proposalId/withdraw",
  requireAuth,
  requireRole("USER"),
  asyncHandler(async (req, res) => {
    const proposal = await prisma.proposal.findFirst({ where: { id: req.params.proposalId, deletedAt: null } });
    if (!proposal) throw AppError.notFound("Taklif topilmadi.");
    if (proposal.scientistId !== req.user!.id) throw AppError.forbidden();
    if (proposal.status !== "PENDING") throw AppError.conflict("Bu bosqichdagi taklifni bekor qilib bo'lmaydi.");

    const updated = await prisma.proposal.update({
      where: { id: proposal.id },
      data: { status: "WITHDRAWN", withdrawnAt: new Date() },
      include: { scientist: true },
    });
    ok(res, toProposalListItem(updated));
  })
);

/**
 * @openapi
 * /proposals/{proposalId}/accept:
 *   post:
 *     tags: [Proposals]
 *     summary: Taklifni qabul qilish (COMPANY egasi) — muammo MATCHED bo'ladi, qolgan takliflar rad etiladi
 *     parameters:
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
proposalsRouter.post(
  "/proposals/:proposalId/accept",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const proposalId = req.params.proposalId;

    const result = await prisma.$transaction(async (tx) => {
      const proposal = await tx.proposal.findFirst({ where: { id: proposalId, deletedAt: null } });
      if (!proposal) throw AppError.notFound("Taklif topilmadi.");

      const problem = await tx.problem.findFirst({ where: { id: proposal.problemId, deletedAt: null } });
      if (!problem) throw AppError.notFound("Muammo topilmadi.");
      if (problem.companyId !== req.user!.id) throw AppError.forbidden();
      if (proposal.status !== "PENDING") throw AppError.conflict("Faqat kutilayotgan takliflarni qabul qilish mumkin.");

      const scientist = await tx.user.findFirst({
        where: { id: proposal.scientistId, status: "ACTIVE", deletedAt: null },
      });
      if (!scientist) throw AppError.conflict("Olim faol emas.");

      const claim = await tx.problem.updateMany({
        where: { id: problem.id, status: "OPEN" },
        data: { status: "MATCHED", matchedAt: new Date() },
      });
      if (claim.count === 0) {
        throw AppError.conflict("Muammo allaqachon boshqa taklif bilan yopilgan.");
      }

      await tx.proposal.update({
        where: { id: proposal.id },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      });

      await tx.proposal.updateMany({
        where: { problemId: problem.id, status: "PENDING", id: { not: proposal.id } },
        data: { status: "REJECTED" },
      });

      return tx.proposal.findFirstOrThrow({ where: { id: proposal.id }, include: { scientist: true } });
    });

    ok(res, toProposalListItem(result));
  })
);

/**
 * @openapi
 * /proposals/{proposalId}/attachment:
 *   get:
 *     tags: [Proposals]
 *     summary: Taklifga ilova qilingan faylni yuklab olish
 *     parameters:
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Fayl
 *         content:
 *           application/octet-stream:
 *             schema: { type: string, format: binary }
 *       404:
 *         description: Fayl mavjud emas
 */
proposalsRouter.get(
  "/proposals/:proposalId/attachment",
  requireAuth,
  asyncHandler(async (req, res) => {
    const proposal = await loadProposalWithAccess(req.params.proposalId!, req.user!.id, req.user!.role);
    if (!proposal.attachmentStoredName || !proposal.attachmentOriginalName) {
      throw AppError.notFound("Fayl mavjud emas.");
    }

    const filePath = path.join(uploadRoot, proposal.attachmentStoredName);
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(uploadRoot))) {
      throw AppError.badRequest("Noto'g'ri fayl so'rovi.");
    }

    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(proposal.attachmentOriginalName)}"`);
    if (proposal.attachmentMime) res.setHeader("Content-Type", proposal.attachmentMime);
    res.sendFile(resolved, (err) => {
      if (err && !res.headersSent) {
        res.status(404).json({ success: false, message: "Fayl topilmadi." });
      }
    });
  })
);
