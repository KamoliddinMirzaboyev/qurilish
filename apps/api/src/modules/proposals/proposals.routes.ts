import { Router } from "express";
import { paginationQuerySchema } from "@buildscience/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateQuery } from "../../middleware/validate.js";
import { handleProposalUpload } from "../../middleware/upload.js";
import { uploadLimiter } from "../../middleware/rateLimit.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, paginate } from "../../utils/response.js";
import { toProposalListItem } from "./proposals.serializers.js";
import {
  getRecentCompanyProposals,
  getCompanyProposals,
  getProblemProposals,
  getScientistProposals,
  loadProposalWithAccess,
  createProposal,
  updateProposal,
  withdrawProposal,
  acceptProposal,
  getProposalAttachment,
} from "./proposals.service.js";

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
    const items = await getRecentCompanyProposals(req.user!.id);
    ok(res, { items });
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
    const { page, pageSize, status } = paginationQuerySchema.parse(req.query);
    const result = await getCompanyProposals(req.user!.id, page, pageSize, status);
    ok(res, paginate(result.items, result.page, result.pageSize, result.total));
  })
);

/**
 * @openapi
 * /problems/{problemId}/proposals:
 *   get:
 *     tags: [Proposals]
 *     summary: Muammoning barcha takliflari (faqat COMPANY egasi yoki SUPERADMIN)
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
    const items = await getProblemProposals(req.params.problemId!, {
      id: req.user!.id,
      role: req.user!.role,
    });
    ok(res, { items });
  })
);

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
 *     responses:
 *       201:
 *         description: Yuborildi
 */
proposalsRouter.post(
  "/problems/:problemId/proposals",
  requireAuth,
  requireRole("USER"),
  uploadLimiter,
  handleProposalUpload,
  asyncHandler(async (req, res) => {
    const proposal = await createProposal(
      req.params.problemId!,
      { id: req.user!.id, name: req.user!.name },
      req.body as Record<string, unknown>,
      req.file
    );
    ok(res, proposal, 201);
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
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req, res) => {
    const { page, pageSize, status } = paginationQuerySchema.parse(req.query);
    const result = await getScientistProposals(req.user!.id, page, pageSize, status);
    ok(res, paginate(result.items, result.page, result.pageSize, result.total));
  })
);

/**
 * @openapi
 * /proposals/{proposalId}:
 *   get:
 *     tags: [Proposals]
 *     summary: Taklif tafsiloti (egasi, muammo kompaniyasi yoki ADMIN)
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
 *     responses:
 *       200:
 *         description: OK
 */
proposalsRouter.patch(
  "/proposals/:proposalId",
  requireAuth,
  requireRole("USER"),
  uploadLimiter,
  handleProposalUpload,
  asyncHandler(async (req, res) => {
    const updated = await updateProposal(
      req.params.proposalId!,
      req.user!.id,
      req.body as Record<string, unknown>,
      req.file
    );
    ok(res, updated);
  })
);

/**
 * @openapi
 * /proposals/{proposalId}/withdraw:
 *   post:
 *     tags: [Proposals]
 *     summary: Taklifni bekor qilish (faqat PENDING, SCIENTIST egasi)
 *     responses:
 *       200:
 *         description: OK
 */
proposalsRouter.post(
  "/proposals/:proposalId/withdraw",
  requireAuth,
  requireRole("USER"),
  asyncHandler(async (req, res) => {
    const updated = await withdrawProposal(req.params.proposalId!, {
      id: req.user!.id,
      name: req.user!.name,
    });
    ok(res, updated);
  })
);

/**
 * @openapi
 * /proposals/{proposalId}/accept:
 *   post:
 *     tags: [Proposals]
 *     summary: Taklifni qabul qilish (COMPANY egasi) — muammo MATCHED bo'ladi, qolgan takliflar rad etiladi
 *     responses:
 *       200:
 *         description: OK
 */
proposalsRouter.post(
  "/proposals/:proposalId/accept",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const accepted = await acceptProposal(req.params.proposalId!, req.user!.id);
    ok(res, accepted);
  })
);

/**
 * @openapi
 * /proposals/{proposalId}/attachment:
 *   get:
 *     tags: [Proposals]
 *     summary: Taklifga ilova qilingan faylni yuklab olish
 *     responses:
 *       200:
 *         description: Fayl
 */
proposalsRouter.get(
  "/proposals/:proposalId/attachment",
  requireAuth,
  asyncHandler(async (req, res) => {
    const attachment = await getProposalAttachment(req.params.proposalId!, {
      id: req.user!.id,
      role: req.user!.role,
    });
    const encoded = encodeURIComponent(attachment.originalName);
    res.setHeader("Content-Disposition", `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`);
    if (attachment.mimeType) res.setHeader("Content-Type", attachment.mimeType);
    res.sendFile(attachment.resolvedPath, (err) => {
      if (err && !res.headersSent) {
        res.status(404).json({ success: false, message: "Fayl topilmadi." });
      }
    });
  })
);
