import { Router } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { mineSchema, paginationQuerySchema } from "@buildscience/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateQuery } from "../../middleware/validate.js";
import { handleGalleryUpload, uploadPublicRoot } from "../../middleware/upload.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, paginate } from "../../utils/response.js";
import { AppError } from "../../utils/AppError.js";
import { prisma } from "../../services/prisma.js";
import { toMineDetail, toMineListItem } from "./mines.serializers.js";

export const minesRouter = Router();

const include = { admin: true, images: { orderBy: { sortOrder: "asc" as const } } };

/**
 * @openapi
 * /mines:
 *   get:
 *     tags: [Mines]
 *     summary: Konlar ro'yxati (ochiq, mehmon uchun ham)
 *     security: []
 *     responses:
 *       200:
 *         description: OK
 */
minesRouter.get(
  "/mines",
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req, res) => {
    const { search, page, pageSize } = paginationQuerySchema.parse(req.query);
    const where = { deletedAt: null, ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}) };
    const [mines, total] = await Promise.all([
      prisma.mine.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include }),
      prisma.mine.count({ where }),
    ]);
    ok(res, paginate(mines.map(toMineListItem), page, pageSize, total));
  })
);

/**
 * @openapi
 * /mines/{mineId}:
 *   get:
 *     tags: [Mines]
 *     summary: Kon tafsiloti (ochiq, mehmon uchun ham)
 *     security: []
 *     parameters:
 *       - in: path
 *         name: mineId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Topilmadi
 */
minesRouter.get(
  "/mines/:mineId",
  asyncHandler(async (req, res) => {
    const mine = await prisma.mine.findFirst({ where: { id: req.params.mineId, deletedAt: null }, include });
    if (!mine) throw AppError.notFound("Kon topilmadi.");
    ok(res, toMineDetail(mine));
  })
);

/**
 * @openapi
 * /admin/mines:
 *   get:
 *     tags: [Mines]
 *     summary: Barcha konlar ro'yxati (SUPERADMIN)
 *     responses:
 *       200:
 *         description: OK
 */
minesRouter.get(
  "/admin/mines",
  requireAuth,
  requireRole("SUPERADMIN"),
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req, res) => {
    const { search, page, pageSize } = paginationQuerySchema.parse(req.query);
    const where = { deletedAt: null, ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}) };
    const [mines, total] = await Promise.all([
      prisma.mine.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include }),
      prisma.mine.count({ where }),
    ]);
    ok(res, paginate(mines.map(toMineListItem), page, pageSize, total));
  })
);

/**
 * @openapi
 * /admin/mines:
 *   post:
 *     tags: [Mines]
 *     summary: Yangi kon joylashtirish (SUPERADMIN, rasm galereyasi bilan)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, location, rawMaterialType, volume]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               location: { type: string }
 *               rawMaterialType: { type: string }
 *               volume: { type: string }
 *               images: { type: array, items: { type: string, format: binary } }
 *     responses:
 *       201:
 *         description: Yaratildi
 */
minesRouter.post(
  "/admin/mines",
  requireAuth,
  requireRole("SUPERADMIN"),
  handleGalleryUpload,
  asyncHandler(async (req, res) => {
    const parsed = mineSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) errors[issue.path.join(".") || "form"] = [issue.message];
      throw AppError.unprocessable("Kiritilgan ma'lumotlarda xatolik bor.", errors);
    }
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const mine = await prisma.mine.create({
      data: {
        adminId: req.user!.id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        location: parsed.data.location,
        rawMaterialType: parsed.data.rawMaterialType,
        volume: parsed.data.volume,
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
      include,
    });
    ok(res, toMineDetail(mine), 201);
  })
);

/**
 * @openapi
 * /admin/mines/{mineId}:
 *   delete:
 *     tags: [Mines]
 *     summary: Konni o'chirish (SUPERADMIN)
 *     parameters:
 *       - in: path
 *         name: mineId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: O'chirildi
 */
minesRouter.delete(
  "/admin/mines/:mineId",
  requireAuth,
  requireRole("SUPERADMIN"),
  asyncHandler(async (req, res) => {
    const mine = await prisma.mine.findFirst({ where: { id: req.params.mineId, deletedAt: null }, include: { images: true } });
    if (!mine) throw AppError.notFound("Kon topilmadi.");
    await prisma.mine.update({ where: { id: mine.id }, data: { deletedAt: new Date() } });
    await Promise.all(mine.images.map((img) => fs.unlink(path.join(uploadPublicRoot, img.storedName)).catch(() => undefined)));
    res.status(204).send();
  })
);
