import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { adminUserStatusSchema, createAdminSchema, paginationQuerySchema, type AdminStats } from "@buildscience/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, paginate } from "../../utils/response.js";
import { AppError } from "../../utils/AppError.js";
import { prisma } from "../../services/prisma.js";
import { toAuthUser } from "../../utils/serializers.js";
import { hashPassword } from "../../utils/password.js";
import { normalizePhone } from "../../utils/phone.js";
import { toProblemListItem } from "../problems/problems.serializers.js";
import { toProposalListItem } from "../proposals/proposals.serializers.js";
import { toMineListItem } from "../mines/mines.serializers.js";
import { toWasteListItem } from "../waste/waste.serializers.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("SUPERADMIN"));

function sortOrder(req: { query: Record<string, unknown> }): "asc" | "desc" {
  return req.query.sort === "oldest" ? "asc" : "desc";
}

/**
 * @openapi
 * /admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Umumiy tizim statistikasi (SUPERADMIN)
 *     responses:
 *       200:
 *         description: OK
 */
adminRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [totalUsers, totalAdmins, openProblems, totalProposals, acceptedProposals, blockedUsers, totalMines, totalWaste] =
      await Promise.all([
        prisma.user.count({ where: { role: "USER", deletedAt: null } }),
        prisma.user.count({ where: { role: "ADMIN", deletedAt: null } }),
        prisma.problem.count({ where: { status: "OPEN", deletedAt: null } }),
        prisma.proposal.count({ where: { deletedAt: null } }),
        prisma.proposal.count({ where: { status: "ACCEPTED", deletedAt: null } }),
        prisma.user.count({ where: { status: "BLOCKED", deletedAt: null } }),
        prisma.mine.count({ where: { deletedAt: null } }),
        prisma.waste.count({ where: { deletedAt: null } }),
      ]);

    const stats: AdminStats = { totalUsers, totalAdmins, openProblems, totalProposals, acceptedProposals, blockedUsers, totalMines, totalWaste };
    ok(res, stats);
  })
);

/**
 * @openapi
 * /admin/admins:
 *   post:
 *     tags: [Admin]
 *     summary: Yangi ADMIN (firma) akkaunt yaratish (SUPERADMIN)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               password: { type: string }
 *               organization: { type: string }
 *     responses:
 *       201:
 *         description: Yaratildi
 */
adminRouter.post(
  "/admins",
  validateBody(createAdminSchema),
  asyncHandler(async (req, res) => {
    const email = req.body.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw AppError.unprocessable("Bu email allaqachon ro'yxatdan o'tgan.", { email: ["Bu email allaqachon ro'yxatdan o'tgan."] });
    }
    const created = await prisma.user.create({
      data: {
        role: "ADMIN",
        name: req.body.name,
        email,
        phone: normalizePhone(req.body.phone),
        passwordHash: await hashPassword(req.body.password),
        organization: req.body.organization || null,
        status: "ACTIVE",
      },
    });
    ok(res, toAuthUser(created), 201);
  })
);

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Foydalanuvchilar ro'yxati (ADMIN)
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema: { type: string }
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
adminRouter.get(
  "/users",
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req, res) => {
    const { search, page, pageSize } = paginationQuerySchema.parse(req.query);
    const role = typeof req.query.role === "string" ? req.query.role : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(role && role !== "ALL" ? { role: role as Prisma.EnumRoleFilter["equals"] } : {}),
      ...(status && status !== "ALL" ? { status: status as Prisma.EnumUserStatusFilter["equals"] } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, orderBy: { createdAt: sortOrder(req) }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.user.count({ where }),
    ]);

    ok(res, paginate(users.map(toAuthUser), page, pageSize, total));
  })
);

/**
 * @openapi
 * /admin/users/{userId}/status:
 *   patch:
 *     tags: [Admin]
 *     summary: Foydalanuvchi holatini o'zgartirish — ACTIVE/BLOCKED (ADMIN)
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [ACTIVE, BLOCKED] }
 *     responses:
 *       200:
 *         description: OK
 */
adminRouter.patch(
  "/users/:userId/status",
  validateBody(adminUserStatusSchema),
  asyncHandler(async (req, res) => {
    if (req.params.userId === req.user!.id) {
      throw AppError.badRequest("O'zingizni bloklay olmaysiz.");
    }
    const target = await prisma.user.findFirst({ where: { id: req.params.userId, deletedAt: null } });
    if (!target) throw AppError.notFound("Foydalanuvchi topilmadi.");

    const updated = await prisma.user.update({ where: { id: target.id }, data: { status: req.body.status } });
    ok(res, toAuthUser(updated));
  })
);

/**
 * @openapi
 * /admin/users/{userId}:
 *   delete:
 *     tags: [Admin]
 *     summary: Foydalanuvchini o'chirish (soft delete, ADMIN)
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: O'chirildi
 */
adminRouter.delete(
  "/users/:userId",
  asyncHandler(async (req, res) => {
    if (req.params.userId === req.user!.id) {
      throw AppError.badRequest("O'zingizni o'chira olmaysiz.");
    }
    const target = await prisma.user.findFirst({ where: { id: req.params.userId, deletedAt: null } });
    if (!target) throw AppError.notFound("Foydalanuvchi topilmadi.");

    await prisma.user.update({ where: { id: target.id }, data: { deletedAt: new Date() } });
    res.status(204).send();
  })
);

/**
 * @openapi
 * /admin/problems:
 *   get:
 *     tags: [Admin]
 *     summary: Barcha muammolar ro'yxati (ADMIN)
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
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
adminRouter.get(
  "/problems",
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req, res) => {
    const { search, page, pageSize } = paginationQuerySchema.parse(req.query);
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;

    const where: Prisma.ProblemWhereInput = {
      deletedAt: null,
      ...(category && category !== "ALL" ? { category: category as Prisma.EnumCategoryFilter["equals"] } : {}),
      ...(status && status !== "ALL" ? { status: status as Prisma.EnumProblemStatusFilter["equals"] } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    };

    const [problems, total] = await Promise.all([
      prisma.problem.findMany({
        where,
        orderBy: { createdAt: sortOrder(req) },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { company: true, _count: { select: { proposals: { where: { deletedAt: null } } } } },
      }),
      prisma.problem.count({ where }),
    ]);

    ok(res, paginate(problems.map((p) => toProblemListItem(p, p._count.proposals)), page, pageSize, total));
  })
);

/**
 * @openapi
 * /admin/problems/{problemId}:
 *   delete:
 *     tags: [Admin]
 *     summary: Muammoni o'chirish (soft delete, ADMIN)
 *     parameters:
 *       - in: path
 *         name: problemId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: O'chirildi
 */
adminRouter.delete(
  "/problems/:problemId",
  asyncHandler(async (req, res) => {
    const problem = await prisma.problem.findFirst({ where: { id: req.params.problemId, deletedAt: null } });
    if (!problem) throw AppError.notFound("Muammo topilmadi.");
    await prisma.problem.update({ where: { id: problem.id }, data: { deletedAt: new Date() } });
    res.status(204).send();
  })
);

/**
 * @openapi
 * /admin/proposals:
 *   get:
 *     tags: [Admin]
 *     summary: Barcha takliflar ro'yxati (ADMIN)
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
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
adminRouter.get(
  "/proposals",
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req, res) => {
    const { search, page, pageSize } = paginationQuerySchema.parse(req.query);
    const status = typeof req.query.status === "string" ? req.query.status : undefined;

    const where: Prisma.ProposalWhereInput = {
      deletedAt: null,
      ...(status && status !== "ALL" ? { status: status as Prisma.EnumProposalStatusFilter["equals"] } : {}),
      ...(search
        ? {
            OR: [
              { scientist: { name: { contains: search, mode: "insensitive" } } },
              { problem: { title: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [proposals, total] = await Promise.all([
      prisma.proposal.findMany({
        where,
        orderBy: { createdAt: sortOrder(req) },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { scientist: true, problem: { include: { company: true } } },
      }),
      prisma.proposal.count({ where }),
    ]);

    ok(res, paginate(proposals.map(toProposalListItem), page, pageSize, total));
  })
);

/**
 * @openapi
 * /admin/proposals/{proposalId}:
 *   delete:
 *     tags: [Admin]
 *     summary: Taklifni o'chirish (soft delete, ADMIN)
 *     parameters:
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: O'chirildi
 */
adminRouter.delete(
  "/proposals/:proposalId",
  asyncHandler(async (req, res) => {
    const proposal = await prisma.proposal.findFirst({ where: { id: req.params.proposalId, deletedAt: null } });
    if (!proposal) throw AppError.notFound("Taklif topilmadi.");
    await prisma.proposal.update({ where: { id: proposal.id }, data: { deletedAt: new Date() } });
    res.status(204).send();
  })
);

/**
 * @openapi
 * /admin/mines:
 *   get:
 *     tags: [Admin]
 *     summary: Barcha konlar ro'yxati (SUPERADMIN)
 *     responses:
 *       200:
 *         description: OK
 */
adminRouter.get(
  "/mines",
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req, res) => {
    const { search, page, pageSize } = paginationQuerySchema.parse(req.query);
    const where: Prisma.MineWhereInput = { deletedAt: null, ...(search ? { name: { contains: search, mode: "insensitive" } } : {}) };
    const [mines, total] = await Promise.all([
      prisma.mine.findMany({
        where,
        orderBy: { createdAt: sortOrder(req) },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { admin: true, images: { orderBy: { sortOrder: "asc" } } },
      }),
      prisma.mine.count({ where }),
    ]);
    ok(res, paginate(mines.map(toMineListItem), page, pageSize, total));
  })
);

/**
 * @openapi
 * /admin/mines/{mineId}:
 *   delete:
 *     tags: [Admin]
 *     summary: Konni o'chirish (soft delete, SUPERADMIN)
 *     parameters:
 *       - in: path
 *         name: mineId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: O'chirildi
 */
adminRouter.delete(
  "/mines/:mineId",
  asyncHandler(async (req, res) => {
    const mine = await prisma.mine.findFirst({ where: { id: req.params.mineId, deletedAt: null } });
    if (!mine) throw AppError.notFound("Kon topilmadi.");
    await prisma.mine.update({ where: { id: mine.id }, data: { deletedAt: new Date() } });
    res.status(204).send();
  })
);

/**
 * @openapi
 * /admin/waste:
 *   get:
 *     tags: [Admin]
 *     summary: Barcha chiqindi e'lonlari ro'yxati (SUPERADMIN)
 *     responses:
 *       200:
 *         description: OK
 */
adminRouter.get(
  "/waste",
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req, res) => {
    const { search, page, pageSize } = paginationQuerySchema.parse(req.query);
    const where: Prisma.WasteWhereInput = { deletedAt: null, ...(search ? { factoryName: { contains: search, mode: "insensitive" } } : {}) };
    const [waste, total] = await Promise.all([
      prisma.waste.findMany({
        where,
        orderBy: { createdAt: sortOrder(req) },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { admin: true, images: { orderBy: { sortOrder: "asc" } } },
      }),
      prisma.waste.count({ where }),
    ]);
    ok(res, paginate(waste.map(toWasteListItem), page, pageSize, total));
  })
);

/**
 * @openapi
 * /admin/waste/{wasteId}:
 *   delete:
 *     tags: [Admin]
 *     summary: Chiqindi e'lonini o'chirish (soft delete, SUPERADMIN)
 *     parameters:
 *       - in: path
 *         name: wasteId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: O'chirildi
 */
adminRouter.delete(
  "/waste/:wasteId",
  asyncHandler(async (req, res) => {
    const waste = await prisma.waste.findFirst({ where: { id: req.params.wasteId, deletedAt: null } });
    if (!waste) throw AppError.notFound("Chiqindi e'loni topilmadi.");
    await prisma.waste.update({ where: { id: waste.id }, data: { deletedAt: new Date() } });
    res.status(204).send();
  })
);
