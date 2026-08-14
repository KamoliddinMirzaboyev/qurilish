import { Router } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { mineSchema, paginationQuerySchema, GALLERY_UPLOAD } from "@buildscience/shared";
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
 *     summary: Barcha konlar ro'yxati, to'liq rasm galereyasi bilan (SUPERADMIN)
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
    ok(res, paginate(mines.map(toMineDetail), page, pageSize, total));
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
        lat: parsed.data.lat,
        lng: parsed.data.lng,
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
 *   patch:
 *     tags: [Mines]
 *     summary: Konni tahrirlash (SUPERADMIN, yangi rasmlar qo'shish mumkin)
 *     parameters:
 *       - in: path
 *         name: mineId
 *         required: true
 *         schema: { type: string }
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
 *       200:
 *         description: OK
 */
minesRouter.patch(
  "/admin/mines/:mineId",
  requireAuth,
  requireRole("SUPERADMIN"),
  handleGalleryUpload,
  asyncHandler(async (req, res) => {
    const existing = await prisma.mine.findFirst({ where: { id: req.params.mineId, deletedAt: null }, include: { images: true } });
    if (!existing) throw AppError.notFound("Kon topilmadi.");

    const parsed = mineSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) errors[issue.path.join(".") || "form"] = [issue.message];
      throw AppError.unprocessable("Kiritilgan ma'lumotlarda xatolik bor.", errors);
    }

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (existing.images.length + files.length > GALLERY_UPLOAD.MAX_IMAGES) {
      throw AppError.badRequest(`Bitta kon uchun jami ${GALLERY_UPLOAD.MAX_IMAGES} tadan ortiq rasm bo'lishi mumkin emas.`);
    }
    const updated = await prisma.mine.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        location: parsed.data.location,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        rawMaterialType: parsed.data.rawMaterialType,
        volume: parsed.data.volume,
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
      include,
    });
    ok(res, toMineDetail(updated));
  })
);

/**
 * @openapi
 * /admin/mines/{mineId}/images/{imageId}:
 *   delete:
 *     tags: [Mines]
 *     summary: Kon rasmini o'chirish (SUPERADMIN)
 *     parameters:
 *       - in: path
 *         name: mineId
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
minesRouter.delete(
  "/admin/mines/:mineId/images/:imageId",
  requireAuth,
  requireRole("SUPERADMIN"),
  asyncHandler(async (req, res) => {
    const image = await prisma.mineImage.findFirst({ where: { id: req.params.imageId, mineId: req.params.mineId } });
    if (!image) throw AppError.notFound("Rasm topilmadi.");
    await prisma.mineImage.delete({ where: { id: image.id } });
    await fs.unlink(path.join(uploadPublicRoot, image.storedName)).catch(() => undefined);
    res.status(204).send();
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
    await prisma.$transaction([
      prisma.mine.update({ where: { id: mine.id }, data: { deletedAt: new Date() } }),
      prisma.mineImage.deleteMany({ where: { mineId: mine.id } }),
    ]);
    await Promise.all(mine.images.map((img) => fs.unlink(path.join(uploadPublicRoot, img.storedName)).catch(() => undefined)));
    res.status(204).send();
  })
);
