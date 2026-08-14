import { Router } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import type { Prisma } from "@prisma/client";
import {
  createProblemSchema,
  updateProblemSchema,
  problemQuerySchema,
  paginationQuerySchema,
  GALLERY_UPLOAD,
  type CompanyStats,
} from "@buildscience/shared";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { optionalAuth } from "../../middleware/optionalAuth.js";
import { handleGalleryUpload, uploadPublicRoot } from "../../middleware/upload.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, paginate } from "../../utils/response.js";
import { AppError } from "../../utils/AppError.js";
import { prisma } from "../../services/prisma.js";
import { toProblemDetail, toProblemListItem } from "./problems.serializers.js";
import { pushNotification } from "../../services/notifications.js";

export const problemsRouter = Router();

/**
 * @openapi
 * /problems:
 *   get:
 *     tags: [Problems]
 *     summary: Ochiq muammolar ro'yxati (filtr/qidiruv/sahifalash)
 *     security: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: budgetType
 *         schema: { type: string }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [newest, oldest, budgetHigh, budgetLow] }
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
problemsRouter.get(
  "/problems",
  validateQuery(problemQuerySchema),
  asyncHandler(async (req, res) => {
    const { search, category, budgetType, sort, page, pageSize } = problemQuerySchema.parse(req.query);

    const where: Prisma.ProblemWhereInput = {
      status: "OPEN",
      deletedAt: null,
      ...(category ? { category: category as Prisma.EnumCategoryFilter["equals"] } : {}),
      ...(budgetType ? { budgetType: budgetType as Prisma.EnumBudgetTypeFilter["equals"] } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.ProblemOrderByWithRelationInput =
      sort === "oldest"
        ? { createdAt: "asc" }
        : sort === "budgetHigh"
          ? { budgetAmount: { sort: "desc", nulls: "last" } }
          : sort === "budgetLow"
            ? { budgetAmount: { sort: "asc", nulls: "last" } }
            : { createdAt: "desc" };

    const [problems, total] = await Promise.all([
      prisma.problem.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          company: true,
          images: { orderBy: { sortOrder: "asc" } },
          _count: { select: { proposals: { where: { deletedAt: null } } } },
        },
      }),
      prisma.problem.count({ where }),
    ]);

    const items = problems.map((p) => toProblemListItem(p, p._count.proposals));
    ok(res, paginate(items, page, pageSize, total));
  })
);

/**
 * @openapi
 * /company/problems:
 *   get:
 *     tags: [Problems]
 *     summary: Kompaniyaning o'z muammolari ro'yxati (COMPANY)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
problemsRouter.get(
  "/company/problems",
  requireAuth,
  requireRole("ADMIN"),
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = paginationQuerySchema.parse(req.query);
    const status = typeof req.query.status === "string" ? req.query.status : undefined;

    const where: Prisma.ProblemWhereInput = {
      companyId: req.user!.id,
      deletedAt: null,
      ...(status && status !== "ALL" ? { status: status as Prisma.EnumProblemStatusFilter["equals"] } : {}),
    };

    const [problems, total] = await Promise.all([
      prisma.problem.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          company: true,
          images: { orderBy: { sortOrder: "asc" } },
          _count: { select: { proposals: { where: { deletedAt: null } } } },
        },
      }),
      prisma.problem.count({ where }),
    ]);

    const items = problems.map((p) => toProblemListItem(p, p._count.proposals));
    ok(res, paginate(items, page, pageSize, total));
  })
);

/**
 * @openapi
 * /company/stats:
 *   get:
 *     tags: [Problems]
 *     summary: Kompaniya statistikasi (COMPANY)
 *     responses:
 *       200:
 *         description: OK
 */
problemsRouter.get(
  "/company/stats",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const companyId = req.user!.id;
    const [openProblems, matchedProblems, closedProblems, totalProposals] = await Promise.all([
      prisma.problem.count({ where: { companyId, deletedAt: null, status: "OPEN" } }),
      prisma.problem.count({ where: { companyId, deletedAt: null, status: "MATCHED" } }),
      prisma.problem.count({ where: { companyId, deletedAt: null, status: "CLOSED" } }),
      prisma.proposal.count({ where: { deletedAt: null, problem: { companyId, deletedAt: null } } }),
    ]);
    const stats: CompanyStats = { openProblems, matchedProblems, closedProblems, totalProposals };
    ok(res, stats);
  })
);

async function loadVisibleProblem(problemId: string, userId?: string, userRole?: string) {
  const problem = await prisma.problem.findFirst({
    where: { id: problemId, deletedAt: null },
    include: {
      company: true,
      images: { orderBy: { sortOrder: "asc" } },
      _count: { select: { proposals: { where: { deletedAt: null } } } },
    },
  });
  if (!problem) throw AppError.notFound("Muammo topilmadi.");

  if (problem.status === "OPEN") return problem;

  const isOwner = userId === problem.companyId;
  const isAdmin = userRole === "SUPERADMIN";
  if (isOwner || isAdmin) return problem;

  if (userId) {
    const hasProposal = await prisma.proposal.findFirst({ where: { problemId, scientistId: userId, deletedAt: null } });
    if (hasProposal) return problem;
  }

  throw AppError.notFound("Muammo topilmadi.");
}

/**
 * @openapi
 * /problems/{problemId}:
 *   get:
 *     tags: [Problems]
 *     summary: Muammo tafsiloti
 *     security: []
 *     parameters:
 *       - in: path
 *         name: problemId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Topilmadi
 */
problemsRouter.get(
  "/problems/:problemId",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const problem = await loadVisibleProblem(req.params.problemId!, req.user?.id, req.user?.role);
    ok(res, toProblemDetail(problem, problem._count.proposals));
  })
);

/**
 * @openapi
 * /problems:
 *   post:
 *     tags: [Problems]
 *     summary: Yangi muammo yaratish (COMPANY)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, category, budgetType]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               category: { type: string }
 *               budgetType: { type: string }
 *               budgetAmount: { type: number, nullable: true }
 *     responses:
 *       201:
 *         description: Yaratildi
 */
problemsRouter.post(
  "/problems",
  requireAuth,
  requireRole("ADMIN"),
  handleGalleryUpload,
  validateBody(createProblemSchema),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const problem = await prisma.problem.create({
      data: {
        companyId: req.user!.id,
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        budgetType: req.body.budgetType,
        budgetAmount: req.body.budgetAmount ?? null,
        status: "OPEN",
        images: {
          create: files.map((f, i) => ({
            storedName: f.filename,
            originalName: f.originalname,
            mimeType: f.mimetype,
            size: f.size,
            sortOrder: i,
          })),
        },
      },
      include: { company: true, images: { orderBy: { sortOrder: "asc" } }, _count: { select: { proposals: true } } },
    });
    ok(res, toProblemDetail(problem, problem._count.proposals), 201);
  })
);

async function loadOwnedOpenProblem(problemId: string, companyId: string) {
  const problem = await prisma.problem.findFirst({ where: { id: problemId, deletedAt: null } });
  if (!problem) throw AppError.notFound("Muammo topilmadi.");
  if (problem.companyId !== companyId) throw AppError.forbidden();
  return problem;
}

/**
 * @openapi
 * /problems/{problemId}:
 *   patch:
 *     tags: [Problems]
 *     summary: Muammoni tahrirlash (faqat OPEN holatda, COMPANY egasi)
 *     parameters:
 *       - in: path
 *         name: problemId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, category, budgetType]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               category: { type: string }
 *               budgetType: { type: string }
 *               budgetAmount: { type: number, nullable: true }
 *     responses:
 *       200:
 *         description: OK
 */
problemsRouter.patch(
  "/problems/:problemId",
  requireAuth,
  requireRole("ADMIN"),
  handleGalleryUpload,
  validateBody(updateProblemSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.problem.findFirst({ where: { id: req.params.problemId, deletedAt: null }, include: { images: true } });
    if (!existing) throw AppError.notFound("Muammo topilmadi.");
    if (existing.companyId !== req.user!.id) throw AppError.forbidden();
    if (existing.status !== "OPEN") {
      throw AppError.conflict("Faqat ochiq muammoni tahrirlash mumkin.");
    }
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (existing.images.length + files.length > GALLERY_UPLOAD.MAX_IMAGES) {
      throw AppError.badRequest(`Bitta muammo uchun jami ${GALLERY_UPLOAD.MAX_IMAGES} tadan ortiq rasm bo'lishi mumkin emas.`);
    }
    const updated = await prisma.problem.update({
      where: { id: existing.id },
      data: {
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        budgetType: req.body.budgetType,
        budgetAmount: req.body.budgetAmount ?? null,
        images: {
          create: files.map((f, i) => ({
            storedName: f.filename,
            originalName: f.originalname,
            mimeType: f.mimetype,
            size: f.size,
            sortOrder: existing.images.length + i,
          })),
        },
      },
      include: { company: true, images: { orderBy: { sortOrder: "asc" } }, _count: { select: { proposals: true } } },
    });
    ok(res, toProblemDetail(updated, updated._count.proposals));
  })
);

/**
 * @openapi
 * /problems/{problemId}/images/{imageId}:
 *   delete:
 *     tags: [Problems]
 *     summary: Muammo rasmini o'chirish (COMPANY egasi)
 *     parameters:
 *       - in: path
 *         name: problemId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: O'chirildi
 */
problemsRouter.delete(
  "/problems/:problemId/images/:imageId",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await loadOwnedOpenProblem(req.params.problemId!, req.user!.id);
    const image = await prisma.problemImage.findFirst({ where: { id: req.params.imageId, problemId: req.params.problemId } });
    if (!image) throw AppError.notFound("Rasm topilmadi.");
    await prisma.problemImage.delete({ where: { id: image.id } });
    await fs.unlink(path.join(uploadPublicRoot, image.storedName)).catch(() => undefined);
    res.status(204).send();
  })
);

/**
 * @openapi
 * /problems/{problemId}:
 *   delete:
 *     tags: [Problems]
 *     summary: Muammoni o'chirish (takliflari bo'lmasa, COMPANY egasi)
 *     parameters:
 *       - in: path
 *         name: problemId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: O'chirildi
 */
problemsRouter.delete(
  "/problems/:problemId",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const existing = await loadOwnedOpenProblem(req.params.problemId!, req.user!.id);
    const proposalCount = await prisma.proposal.count({ where: { problemId: existing.id, deletedAt: null } });
    if (proposalCount > 0) {
      throw AppError.conflict("Takliflari mavjud muammoni o'chirib bo'lmaydi.");
    }
    const images = await prisma.problemImage.findMany({ where: { problemId: existing.id } });
    await prisma.$transaction([
      prisma.problem.update({ where: { id: existing.id }, data: { deletedAt: new Date() } }),
      prisma.problemImage.deleteMany({ where: { problemId: existing.id } }),
    ]);
    await Promise.all(images.map((img) => fs.unlink(path.join(uploadPublicRoot, img.storedName)).catch(() => undefined)));
    res.status(204).send();
  })
);

/**
 * @openapi
 * /problems/{problemId}/close:
 *   post:
 *     tags: [Problems]
 *     summary: Muammoni yopish (COMPANY egasi) — kutilayotgan takliflar rad etiladi
 *     parameters:
 *       - in: path
 *         name: problemId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
problemsRouter.post(
  "/problems/:problemId/close",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const existing = await loadOwnedOpenProblem(req.params.problemId!, req.user!.id);
    if (existing.status !== "OPEN") {
      throw AppError.conflict("Faqat ochiq muammoni yopish mumkin.");
    }

    const pending = await prisma.proposal.findMany({
      where: { problemId: existing.id, status: "PENDING", deletedAt: null },
      select: { scientistId: true },
    });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.proposal.updateMany({
        where: { problemId: existing.id, status: "PENDING" },
        data: { status: "REJECTED" },
      });
      return tx.problem.update({
        where: { id: existing.id },
        data: { status: "CLOSED", closedAt: new Date() },
        include: { company: true, images: { orderBy: { sortOrder: "asc" } }, _count: { select: { proposals: true } } },
      });
    });

    for (const p of pending) {
      void pushNotification({
        userId: p.scientistId,
        type: "PROBLEM_CLOSED",
        title: "E'lon yopildi",
        body: `«${existing.title}» yopildi, kutilayotgan takliflar rad etildi.`,
        link: "/app/user/proposals",
      });
    }

    ok(res, toProblemDetail(updated, updated._count.proposals));
  })
);
