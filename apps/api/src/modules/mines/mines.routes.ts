import { Router } from "express";
import { mineSchema, paginationQuerySchema } from "@buildscience/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateQuery, validateBody } from "../../middleware/validate.js";
import { handleGalleryUpload } from "../../middleware/upload.js";
import { uploadLimiter } from "../../middleware/rateLimit.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, paginate } from "../../utils/response.js";
import {
  getPublicMines,
  getMineDetailById,
  getMinesByAdmin,
  createMine,
  updateMine,
  deleteMineImage,
  deleteMine,
} from "./mines.service.js";

export const minesRouter = Router();

/**
 * @openapi
 * /mines:
 *   get:
 *     tags: [Mines]
 *     summary: Konlar ro'yxati (ochiq, mehmon uchun ham)
 *     responses:
 *       200:
 *         description: OK
 */
minesRouter.get(
  "/mines",
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req, res) => {
    const { search, page, pageSize } = paginationQuerySchema.parse(req.query);
    const result = await getPublicMines({ search, page, pageSize });
    ok(res, paginate(result.items, result.page, result.pageSize, result.total));
  })
);

/**
 * @openapi
 * /mines/{mineId}:
 *   get:
 *     tags: [Mines]
 *     summary: Kon tafsiloti (ochiq, mehmon uchun ham)
 *     responses:
 *       200:
 *         description: OK
 */
minesRouter.get(
  "/mines/:mineId",
  asyncHandler(async (req, res) => {
    const mine = await getMineDetailById(req.params.mineId!);
    ok(res, mine);
  })
);

// COMPANY (ADMIN) marshrutlari
minesRouter.get(
  "/company/mines",
  requireAuth,
  requireRole("ADMIN"),
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req, res) => {
    const { search, page, pageSize } = paginationQuerySchema.parse(req.query);
    const result = await getMinesByAdmin(req.user!.id, { search, page, pageSize });
    ok(res, paginate(result.items, result.page, result.pageSize, result.total));
  })
);

minesRouter.post(
  "/company/mines",
  requireAuth,
  requireRole("ADMIN"),
  uploadLimiter,
  handleGalleryUpload,
  validateBody(mineSchema),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const mine = await createMine(req.user!.id, req.body, files);
    ok(res, mine, 201);
  })
);

minesRouter.patch(
  "/company/mines/:mineId",
  requireAuth,
  requireRole("ADMIN"),
  uploadLimiter,
  handleGalleryUpload,
  validateBody(mineSchema),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const updated = await updateMine(req.params.mineId!, req.user!.id, req.user!.role, req.body, files);
    ok(res, updated);
  })
);

minesRouter.delete(
  "/company/mines/:mineId/images/:imageId",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await deleteMineImage(req.params.mineId!, req.params.imageId!, req.user!.id, req.user!.role);
    res.status(204).send();
  })
);

minesRouter.delete(
  "/company/mines/:mineId",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await deleteMine(req.params.mineId!, req.user!.id, req.user!.role);
    res.status(204).send();
  })
);

// SUPERADMIN marshrutlari
minesRouter.get(
  "/admin/mines",
  requireAuth,
  requireRole("SUPERADMIN"),
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req, res) => {
    const { search, page, pageSize } = paginationQuerySchema.parse(req.query);
    const result = await getMinesByAdmin(null, { search, page, pageSize });
    ok(res, paginate(result.items, result.page, result.pageSize, result.total));
  })
);

minesRouter.post(
  "/admin/mines",
  requireAuth,
  requireRole("SUPERADMIN"),
  uploadLimiter,
  handleGalleryUpload,
  validateBody(mineSchema),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const mine = await createMine(req.user!.id, req.body, files);
    ok(res, mine, 201);
  })
);

minesRouter.patch(
  "/admin/mines/:mineId",
  requireAuth,
  requireRole("SUPERADMIN"),
  uploadLimiter,
  handleGalleryUpload,
  validateBody(mineSchema),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const updated = await updateMine(req.params.mineId!, req.user!.id, req.user!.role, req.body, files);
    ok(res, updated);
  })
);

minesRouter.delete(
  "/admin/mines/:mineId/images/:imageId",
  requireAuth,
  requireRole("SUPERADMIN"),
  asyncHandler(async (req, res) => {
    await deleteMineImage(req.params.mineId!, req.params.imageId!, req.user!.id, req.user!.role);
    res.status(204).send();
  })
);

minesRouter.delete(
  "/admin/mines/:mineId",
  requireAuth,
  requireRole("SUPERADMIN"),
  asyncHandler(async (req, res) => {
    await deleteMine(req.params.mineId!, req.user!.id, req.user!.role);
    res.status(204).send();
  })
);
