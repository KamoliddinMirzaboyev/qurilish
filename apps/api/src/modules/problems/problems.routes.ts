import { Router } from "express";
import {
  createProblemSchema,
  updateProblemSchema,
  problemQuerySchema,
  paginationQuerySchema,
} from "@buildscience/shared";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { optionalAuth } from "../../middleware/optionalAuth.js";
import { handleGalleryUpload } from "../../middleware/upload.js";
import { uploadLimiter } from "../../middleware/rateLimit.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, paginate } from "../../utils/response.js";
import {
  getOpenProblems,
  getCompanyProblems,
  getCompanyStats,
  getProblemDetail,
  createProblem,
  updateProblem,
  deleteProblemImage,
  deleteProblem,
  closeProblem,
} from "./problems.service.js";

export const problemsRouter = Router();

/**
 * @openapi
 * /problems:
 *   get:
 *     tags: [Problems]
 *     summary: Ochiq muammolar ro'yxati (filtr/qidiruv/sahifalash)
 *     security: []
 *     responses:
 *       200:
 *         description: OK
 */
problemsRouter.get(
  "/problems",
  validateQuery(problemQuerySchema),
  asyncHandler(async (req, res) => {
    const query = problemQuerySchema.parse(req.query);
    const result = await getOpenProblems(query);
    ok(res, paginate(result.items, result.page, result.pageSize, result.total));
  })
);

/**
 * @openapi
 * /company/problems:
 *   get:
 *     tags: [Problems]
 *     summary: Kompaniyaning o'z muammolari ro'yxati (COMPANY)
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
    const { page, pageSize, status } = paginationQuerySchema.parse(req.query);
    const result = await getCompanyProblems(req.user!.id, { status, page, pageSize });
    ok(res, paginate(result.items, result.page, result.pageSize, result.total));
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
    const stats = await getCompanyStats(req.user!.id);
    ok(res, stats);
  })
);

/**
 * @openapi
 * /problems/{problemId}:
 *   get:
 *     tags: [Problems]
 *     summary: Muammo tafsiloti
 *     security: []
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
    const detail = await getProblemDetail(req.params.problemId!, {
      id: req.user?.id,
      role: req.user?.role,
    });
    ok(res, detail);
  })
);

/**
 * @openapi
 * /problems:
 *   post:
 *     tags: [Problems]
 *     summary: Yangi muammo yaratish (COMPANY)
 *     responses:
 *       201:
 *         description: Yaratildi
 */
problemsRouter.post(
  "/problems",
  requireAuth,
  requireRole("ADMIN"),
  uploadLimiter,
  handleGalleryUpload,
  validateBody(createProblemSchema),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const created = await createProblem(req.user!.id, req.body, files);
    ok(res, created, 201);
  })
);

/**
 * @openapi
 * /problems/{problemId}:
 *   patch:
 *     tags: [Problems]
 *     summary: Muammoni tahrirlash (faqat OPEN holatda, COMPANY egasi)
 *     responses:
 *       200:
 *         description: OK
 */
problemsRouter.patch(
  "/problems/:problemId",
  requireAuth,
  requireRole("ADMIN"),
  uploadLimiter,
  handleGalleryUpload,
  validateBody(updateProblemSchema),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const updated = await updateProblem(req.params.problemId!, req.user!.id, req.body, files);
    ok(res, updated);
  })
);

/**
 * @openapi
 * /problems/{problemId}/images/{imageId}:
 *   delete:
 *     tags: [Problems]
 *     summary: Muammo rasmini o'chirish (COMPANY egasi)
 *     responses:
 *       204:
 *         description: O'chirildi
 */
problemsRouter.delete(
  "/problems/:problemId/images/:imageId",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await deleteProblemImage(req.params.problemId!, req.params.imageId!, req.user!.id);
    res.status(204).send();
  })
);

/**
 * @openapi
 * /problems/{problemId}:
 *   delete:
 *     tags: [Problems]
 *     summary: Muammoni o'chirish (takliflari bo'lmasa, COMPANY egasi)
 *     responses:
 *       204:
 *         description: O'chirildi
 */
problemsRouter.delete(
  "/problems/:problemId",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await deleteProblem(req.params.problemId!, req.user!.id);
    res.status(204).send();
  })
);

/**
 * @openapi
 * /problems/{problemId}/close:
 *   post:
 *     tags: [Problems]
 *     summary: Muammoni yopish (COMPANY egasi) — kutilayotgan takliflar rad etiladi
 *     responses:
 *       200:
 *         description: OK
 */
problemsRouter.post(
  "/problems/:problemId/close",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const closed = await closeProblem(req.params.problemId!, req.user!.id);
    ok(res, closed);
  })
);
