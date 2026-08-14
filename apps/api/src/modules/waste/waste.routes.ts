import { Router } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { wasteSchema, paginationQuerySchema, GALLERY_UPLOAD } from "@buildscience/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateQuery } from "../../middleware/validate.js";
import { handleGalleryUpload, uploadPublicRoot } from "../../middleware/upload.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, paginate } from "../../utils/response.js";
import { AppError } from "../../utils/AppError.js";
import { prisma } from "../../services/prisma.js";
import { toWasteDetail, toWasteListItem } from "./waste.serializers.js";

export const wasteRouter = Router();

const include = { admin: true, images: { orderBy: { sortOrder: "asc" as const } } };

/**
 * @openapi
 * /waste:
 *   get:
 *     tags: [Waste]
 *     summary: Chiqindi e'lonlari ro'yxati (ochiq, mehmon uchun ham)
 *     security: []
 *     responses:
 *       200:
 *         description: OK
 */
wasteRouter.get(
  "/waste",
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req, res) => {
    const { search, page, pageSize } = paginationQuerySchema.parse(req.query);
    const where = { deletedAt: null, ...(search ? { factoryName: { contains: search, mode: "insensitive" as const } } : {}) };
    const [waste, total] = await Promise.all([
      prisma.waste.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include }),
      prisma.waste.count({ where }),
    ]);
    ok(res, paginate(waste.map(toWasteListItem), page, pageSize, total));
  })
);

/**
 * @openapi
 * /waste/{wasteId}:
 *   get:
 *     tags: [Waste]
 *     summary: Chiqindi e'loni tafsiloti (ochiq, mehmon uchun ham)
 *     security: []
 *     parameters:
 *       - in: path
 *         name: wasteId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Topilmadi
 */
wasteRouter.get(
  "/waste/:wasteId",
  asyncHandler(async (req, res) => {
    const waste = await prisma.waste.findFirst({ where: { id: req.params.wasteId, deletedAt: null }, include });
    if (!waste) throw AppError.notFound("Chiqindi e'loni topilmadi.");
    ok(res, toWasteDetail(waste));
  })
);

/**
 * @openapi
 * /admin/waste:
 *   get:
 *     tags: [Waste]
 *     summary: O'z chiqindi e'lonlarim ro'yxati (ADMIN)
 *     responses:
 *       200:
 *         description: OK
 */
wasteRouter.get(
  "/company/waste",
  requireAuth,
  requireRole("ADMIN"),
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = paginationQuerySchema.parse(req.query);
    const where = { deletedAt: null, adminId: req.user!.id };
    const [waste, total] = await Promise.all([
      prisma.waste.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include }),
      prisma.waste.count({ where }),
    ]);
    ok(res, paginate(waste.map(toWasteListItem), page, pageSize, total));
  })
);

/**
 * @openapi
 * /admin/waste:
 *   post:
 *     tags: [Waste]
 *     summary: Yangi chiqindi e'loni joylashtirish (ADMIN, rasm galereyasi bilan)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [factoryName, composition, volume, annualVolume]
 *             properties:
 *               factoryName: { type: string }
 *               composition: { type: string }
 *               volume: { type: string }
 *               annualVolume: { type: string }
 *               description: { type: string }
 *               images: { type: array, items: { type: string, format: binary } }
 *     responses:
 *       201:
 *         description: Yaratildi
 */
wasteRouter.post(
  "/company/waste",
  requireAuth,
  requireRole("ADMIN"),
  handleGalleryUpload,
  asyncHandler(async (req, res) => {
    const parsed = wasteSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) errors[issue.path.join(".") || "form"] = [issue.message];
      throw AppError.unprocessable("Kiritilgan ma'lumotlarda xatolik bor.", errors);
    }
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const waste = await prisma.waste.create({
      data: {
        adminId: req.user!.id,
        factoryName: parsed.data.factoryName,
        composition: parsed.data.composition,
        volume: parsed.data.volume,
        annualVolume: parsed.data.annualVolume,
        description: parsed.data.description || null,
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
    ok(res, toWasteDetail(waste), 201);
  })
);

/**
 * @openapi
 * /company/waste/{wasteId}:
 *   patch:
 *     tags: [Waste]
 *     summary: Chiqindi e'lonini tahrirlash (o'zi joylashtirgan ADMIN, yangi rasmlar qo'shish mumkin)
 *     parameters:
 *       - in: path
 *         name: wasteId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [factoryName, composition, volume, annualVolume]
 *             properties:
 *               factoryName: { type: string }
 *               composition: { type: string }
 *               volume: { type: string }
 *               annualVolume: { type: string }
 *               description: { type: string }
 *               images: { type: array, items: { type: string, format: binary } }
 *     responses:
 *       200:
 *         description: OK
 */
wasteRouter.patch(
  "/company/waste/:wasteId",
  requireAuth,
  requireRole("ADMIN"),
  handleGalleryUpload,
  asyncHandler(async (req, res) => {
    const existing = await prisma.waste.findFirst({ where: { id: req.params.wasteId, deletedAt: null }, include: { images: true } });
    if (!existing) throw AppError.notFound("Chiqindi e'loni topilmadi.");
    if (existing.adminId !== req.user!.id) throw AppError.forbidden();

    const parsed = wasteSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) errors[issue.path.join(".") || "form"] = [issue.message];
      throw AppError.unprocessable("Kiritilgan ma'lumotlarda xatolik bor.", errors);
    }

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (existing.images.length + files.length > GALLERY_UPLOAD.MAX_IMAGES) {
      throw AppError.badRequest(`Bitta e'lon uchun jami ${GALLERY_UPLOAD.MAX_IMAGES} tadan ortiq rasm bo'lishi mumkin emas.`);
    }
    const updated = await prisma.waste.update({
      where: { id: existing.id },
      data: {
        factoryName: parsed.data.factoryName,
        composition: parsed.data.composition,
        volume: parsed.data.volume,
        annualVolume: parsed.data.annualVolume,
        description: parsed.data.description || null,
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
    ok(res, toWasteDetail(updated));
  })
);

/**
 * @openapi
 * /company/waste/{wasteId}/images/{imageId}:
 *   delete:
 *     tags: [Waste]
 *     summary: Chiqindi rasmini o'chirish (o'zi joylashtirgan ADMIN)
 *     parameters:
 *       - in: path
 *         name: wasteId
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
wasteRouter.delete(
  "/company/waste/:wasteId/images/:imageId",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const waste = await prisma.waste.findFirst({ where: { id: req.params.wasteId, deletedAt: null } });
    if (!waste) throw AppError.notFound("Chiqindi e'loni topilmadi.");
    if (waste.adminId !== req.user!.id) throw AppError.forbidden();

    const image = await prisma.wasteImage.findFirst({ where: { id: req.params.imageId, wasteId: req.params.wasteId } });
    if (!image) throw AppError.notFound("Rasm topilmadi.");
    await prisma.wasteImage.delete({ where: { id: image.id } });
    await fs.unlink(path.join(uploadPublicRoot, image.storedName)).catch(() => undefined);
    res.status(204).send();
  })
);

/**
 * @openapi
 * /admin/waste/{wasteId}:
 *   delete:
 *     tags: [Waste]
 *     summary: Chiqindi e'lonini o'chirish (o'zi joylashtirgan ADMIN)
 *     parameters:
 *       - in: path
 *         name: wasteId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: O'chirildi
 */
wasteRouter.delete(
  "/company/waste/:wasteId",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const waste = await prisma.waste.findFirst({ where: { id: req.params.wasteId, deletedAt: null }, include: { images: true } });
    if (!waste) throw AppError.notFound("Chiqindi e'loni topilmadi.");
    if (waste.adminId !== req.user!.id) throw AppError.forbidden();
    await prisma.$transaction([
      prisma.waste.update({ where: { id: waste.id }, data: { deletedAt: new Date() } }),
      prisma.wasteImage.deleteMany({ where: { wasteId: waste.id } }),
    ]);
    await Promise.all(waste.images.map((img) => fs.unlink(path.join(uploadPublicRoot, img.storedName)).catch(() => undefined)));
    res.status(204).send();
  })
);
