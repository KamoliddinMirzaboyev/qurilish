import { Router } from "express";
import { adminUserStatusSchema, createAdminSchema, paginationQuerySchema } from "@buildscience/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, paginate } from "../../utils/response.js";
import {
  getSystemAdminStats,
  createAdminAccount,
  getAdminUsersList,
  updateUserStatusByAdmin,
  deleteUserByAdmin,
  getAdminProblemsList,
  deleteAdminProblem,
  getAdminProposalsList,
  deleteAdminProposal,
  getAdminWasteList,
  deleteAdminWaste,
} from "./admin.service.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("SUPERADMIN"));

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
    const stats = await getSystemAdminStats();
    ok(res, stats);
  })
);

/**
 * @openapi
 * /admin/admins:
 *   post:
 *     tags: [Admin]
 *     summary: Yangi ADMIN (firma) akkaunt yaratish (SUPERADMIN)
 *     responses:
 *       201:
 *         description: Yaratildi
 */
adminRouter.post(
  "/admins",
  validateBody(createAdminSchema),
  asyncHandler(async (req, res) => {
    const created = await createAdminAccount(req.body);
    ok(res, created, 201);
  })
);

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Foydalanuvchilar ro'yxati (SUPERADMIN)
 *     responses:
 *       200:
 *         description: OK
 */
adminRouter.get(
  "/users",
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req, res) => {
    const { search, page, pageSize, role, status } = paginationQuerySchema.parse(req.query);
    const sort = req.query.sort as string | undefined;
    const result = await getAdminUsersList({ search, page, pageSize, role, status, sort });
    ok(res, paginate(result.items, result.page, result.pageSize, result.total));
  })
);

/**
 * @openapi
 * /admin/users/{userId}/status:
 *   patch:
 *     tags: [Admin]
 *     summary: Foydalanuvchi holatini o'zgartirish (SUPERADMIN)
 *     responses:
 *       200:
 *         description: OK
 */
adminRouter.patch(
  "/users/:userId/status",
  validateBody(adminUserStatusSchema),
  asyncHandler(async (req, res) => {
    const updated = await updateUserStatusByAdmin(req.params.userId!, req.body.status, req.user!.id);
    ok(res, updated);
  })
);

/**
 * @openapi
 * /admin/users/{userId}:
 *   delete:
 *     tags: [Admin]
 *     summary: Foydalanuvchini o'chirish (soft delete, SUPERADMIN)
 *     responses:
 *       204:
 *         description: O'chirildi
 */
adminRouter.delete(
  "/users/:userId",
  asyncHandler(async (req, res) => {
    await deleteUserByAdmin(req.params.userId!, req.user!.id);
    res.status(204).send();
  })
);

/**
 * @openapi
 * /admin/problems:
 *   get:
 *     tags: [Admin]
 *     summary: Barcha muammolar ro'yxati (SUPERADMIN)
 *     responses:
 *       200:
 *         description: OK
 */
adminRouter.get(
  "/problems",
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req, res) => {
    const { search, page, pageSize } = paginationQuerySchema.parse(req.query);
    const { category, status, sort } = req.query as Record<string, string | undefined>;
    const result = await getAdminProblemsList({ search, category, status, sort, page, pageSize });
    ok(res, paginate(result.items, result.page, result.pageSize, result.total));
  })
);

/**
 * @openapi
 * /admin/problems/{problemId}:
 *   delete:
 *     tags: [Admin]
 *     summary: Muammoni o'chirish (soft delete, SUPERADMIN)
 *     responses:
 *       204:
 *         description: O'chirildi
 */
adminRouter.delete(
  "/problems/:problemId",
  asyncHandler(async (req, res) => {
    await deleteAdminProblem(req.params.problemId!);
    res.status(204).send();
  })
);

/**
 * @openapi
 * /admin/proposals:
 *   get:
 *     tags: [Admin]
 *     summary: Barcha takliflar ro'yxati (SUPERADMIN)
 *     responses:
 *       200:
 *         description: OK
 */
adminRouter.get(
  "/proposals",
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req, res) => {
    const { search, page, pageSize, status } = paginationQuerySchema.parse(req.query);
    const sort = req.query.sort as string | undefined;
    const result = await getAdminProposalsList({ search, status, sort, page, pageSize });
    ok(res, paginate(result.items, result.page, result.pageSize, result.total));
  })
);

/**
 * @openapi
 * /admin/proposals/{proposalId}:
 *   delete:
 *     tags: [Admin]
 *     summary: Taklifni o'chirish (soft delete, SUPERADMIN)
 *     responses:
 *       204:
 *         description: O'chirildi
 */
adminRouter.delete(
  "/proposals/:proposalId",
  asyncHandler(async (req, res) => {
    await deleteAdminProposal(req.params.proposalId!);
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
    const sort = req.query.sort as string | undefined;
    const result = await getAdminWasteList({ search, sort, page, pageSize });
    ok(res, paginate(result.items, result.page, result.pageSize, result.total));
  })
);

/**
 * @openapi
 * /admin/waste/{wasteId}:
 *   delete:
 *     tags: [Admin]
 *     summary: Chiqindi e'lonini o'chirish (soft delete, SUPERADMIN)
 *     responses:
 *       204:
 *         description: O'chirildi
 */
adminRouter.delete(
  "/waste/:wasteId",
  asyncHandler(async (req, res) => {
    await deleteAdminWaste(req.params.wasteId!);
    res.status(204).send();
  })
);
