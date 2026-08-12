import { Router } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { wasteSchema, paginationQuerySchema } from "@buildscience/shared";
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
    await prisma.waste.update({ where: { id: waste.id }, data: { deletedAt: new Date() } });
    await Promise.all(waste.images.map((img) => fs.unlink(path.join(uploadPublicRoot, img.storedName)).catch(() => undefined)));
    res.status(204).send();
  })
);
