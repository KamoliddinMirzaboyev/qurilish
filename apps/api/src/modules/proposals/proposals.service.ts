import path from "node:path";
import fs from "node:fs/promises";
import type { Prisma } from "@prisma/client";
import { createProposalSchema, updateProposalSchema, type ProposalListItem, type Paginated } from "@buildscience/shared";
import { prisma } from "../../services/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { uploadRoot } from "../../middleware/upload.js";
import { isPathInside } from "../../utils/files.js";
import { pushNotification } from "../../services/notifications.js";
import { proposalStatus } from "../../utils/queryEnums.js";
import { toProposalListItem } from "./proposals.serializers.js";

export async function removeFileSafely(storedName: string | null | undefined): Promise<void> {
  if (!storedName) return;
  const filePath = path.join(uploadRoot, storedName);
  try {
    await fs.unlink(filePath);
  } catch {
    // best-effort cleanup
  }
}

export async function getRecentCompanyProposals(companyId: string): Promise<ProposalListItem[]> {
  const proposals = await prisma.proposal.findMany({
    where: { deletedAt: null, problem: { companyId, deletedAt: null } },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { scientist: true, problem: { include: { company: true } } },
  });
  return proposals.map(toProposalListItem);
}

export async function getCompanyProposals(
  companyId: string,
  page: number,
  pageSize: number,
  status?: string
): Promise<Paginated<ProposalListItem>> {
  const where: Prisma.ProposalWhereInput = {
    deletedAt: null,
    problem: { companyId, deletedAt: null },
    ...(proposalStatus(status) ? { status: proposalStatus(status) } : {}),
  };

  const [proposals, total] = await Promise.all([
    prisma.proposal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { scientist: true, problem: { include: { company: true } } },
    }),
    prisma.proposal.count({ where }),
  ]);

  return {
    items: proposals.map(toProposalListItem),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getProblemProposals(
  problemId: string,
  user: { id: string; role: string }
): Promise<ProposalListItem[]> {
  const problem = await prisma.problem.findFirst({ where: { id: problemId, deletedAt: null } });
  if (!problem) throw AppError.notFound("Muammo topilmadi.");
  if (user.role !== "SUPERADMIN" && problem.companyId !== user.id) {
    throw AppError.forbidden();
  }

  const proposals = await prisma.proposal.findMany({
    where: { problemId: problem.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { scientist: true },
  });

  return proposals.map(toProposalListItem);
}

export async function getScientistProposals(
  scientistId: string,
  page: number,
  pageSize: number,
  status?: string
): Promise<Paginated<ProposalListItem>> {
  const where: Prisma.ProposalWhereInput = {
    scientistId,
    deletedAt: null,
    ...(proposalStatus(status) ? { status: proposalStatus(status) } : {}),
  };

  const [proposals, total] = await Promise.all([
    prisma.proposal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { scientist: true, problem: { include: { company: true } } },
    }),
    prisma.proposal.count({ where }),
  ]);

  return {
    items: proposals.map(toProposalListItem),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function loadProposalWithAccess(proposalId: string, userId: string, role: string) {
  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, deletedAt: null },
    include: { scientist: true, problem: { include: { company: true } } },
  });
  if (!proposal) throw AppError.notFound("Taklif topilmadi.");

  const isOwnerScientist = proposal.scientistId === userId;
  const isOwnerCompany = proposal.problem?.companyId === userId;
  const isAdmin = role === "SUPERADMIN";
  if (!isOwnerScientist && !isOwnerCompany && !isAdmin) throw AppError.forbidden();

  return proposal;
}

export async function createProposal(
  problemId: string,
  scientist: { id: string; name: string },
  body: Record<string, unknown>,
  file?: Express.Multer.File
): Promise<ProposalListItem> {
  const parsed = createProposalSchema.safeParse({
    solutionText: body.solutionText,
    estimatedDays: body.estimatedDays,
    priceNegotiable: body.priceNegotiable === "true" || body.priceNegotiable === true,
    proposedPrice: body.proposedPrice === "" || body.proposedPrice == null ? null : body.proposedPrice,
  });

  if (!parsed.success) {
    await removeFileSafely(file?.filename);
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      errors[key] = [...(errors[key] ?? []), issue.message];
    }
    throw AppError.unprocessable("Kiritilgan ma'lumotlarda xatolik bor.", errors);
  }

  const problem = await prisma.problem.findFirst({ where: { id: problemId, deletedAt: null } });
  if (!problem) {
    await removeFileSafely(file?.filename);
    throw AppError.notFound("Muammo topilmadi.");
  }
  if (problem.status !== "OPEN") {
    await removeFileSafely(file?.filename);
    throw AppError.conflict("Bu muammoga taklif yuborib bo'lmaydi.");
  }

  const existing = await prisma.proposal.findFirst({
    where: { problemId: problem.id, scientistId: scientist.id, deletedAt: null },
  });
  if (existing && existing.status !== "WITHDRAWN") {
    await removeFileSafely(file?.filename);
    throw AppError.conflict("Siz bu muammoga allaqachon taklif yuborgansiz.");
  }

  const attachmentData = {
    attachmentOriginalName: file?.originalname ?? null,
    attachmentStoredName: file?.filename ?? null,
    attachmentMime: file?.mimetype ?? null,
    attachmentSize: file?.size ?? null,
  };

  const proposal = existing
    ? await prisma.proposal.update({
        where: { id: existing.id },
        data: {
          solutionText: parsed.data.solutionText,
          estimatedDays: parsed.data.estimatedDays,
          priceNegotiable: parsed.data.priceNegotiable,
          proposedPrice: parsed.data.proposedPrice ?? null,
          ...attachmentData,
          status: "PENDING",
          withdrawnAt: null,
        },
        include: { scientist: true },
      })
    : await prisma.proposal.create({
        data: {
          problemId: problem.id,
          scientistId: scientist.id,
          solutionText: parsed.data.solutionText,
          estimatedDays: parsed.data.estimatedDays,
          priceNegotiable: parsed.data.priceNegotiable,
          proposedPrice: parsed.data.proposedPrice ?? null,
          ...attachmentData,
          status: "PENDING",
        },
        include: { scientist: true },
      });

  if (existing?.attachmentStoredName && file) {
    await removeFileSafely(existing.attachmentStoredName);
  }

  void pushNotification({
    userId: problem.companyId,
    type: "PROPOSAL_RECEIVED",
    title: "Yangi taklif kelib tushdi",
    body: `${scientist.name} «${problem.title}» muammosi uchun yechim taklif qildi.`,
    link: `/app/admin/problems/${problem.id}/proposals`,
  });

  return toProposalListItem(proposal);
}

export async function updateProposal(
  proposalId: string,
  userId: string,
  body: Record<string, unknown>,
  file?: Express.Multer.File
): Promise<ProposalListItem> {
  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, deletedAt: null },
    include: { problem: true },
  });
  if (!proposal) {
    await removeFileSafely(file?.filename);
    throw AppError.notFound("Taklif topilmadi.");
  }
  if (proposal.scientistId !== userId) {
    await removeFileSafely(file?.filename);
    throw AppError.forbidden();
  }
  if (proposal.status !== "PENDING" || proposal.problem?.status !== "OPEN") {
    await removeFileSafely(file?.filename);
    throw AppError.conflict("Faqat kutilayotgan va ochiq muammo bo'yicha taklifni tahrirlash mumkin.");
  }

  const parsed = updateProposalSchema.safeParse({
    solutionText: body.solutionText,
    estimatedDays: body.estimatedDays,
    priceNegotiable: body.priceNegotiable === "true" || body.priceNegotiable === true,
    proposedPrice: body.proposedPrice === "" || body.proposedPrice == null ? null : body.proposedPrice,
  });
  if (!parsed.success) {
    await removeFileSafely(file?.filename);
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      errors[key] = [...(errors[key] ?? []), issue.message];
    }
    throw AppError.unprocessable("Kiritilgan ma'lumotlarda xatolik bor.", errors);
  }

  const oldStoredName = proposal.attachmentStoredName;
  const updated = await prisma.proposal.update({
    where: { id: proposal.id },
    data: {
      solutionText: parsed.data.solutionText,
      estimatedDays: parsed.data.estimatedDays,
      priceNegotiable: parsed.data.priceNegotiable,
      proposedPrice: parsed.data.proposedPrice ?? null,
      ...(file
        ? {
            attachmentOriginalName: file.originalname,
            attachmentStoredName: file.filename,
            attachmentMime: file.mimetype,
            attachmentSize: file.size,
          }
        : {}),
    },
    include: { scientist: true },
  });

  if (file && oldStoredName) {
    await removeFileSafely(oldStoredName);
  }

  return toProposalListItem(updated);
}

export async function withdrawProposal(proposalId: string, user: { id: string; name: string }): Promise<ProposalListItem> {
  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, deletedAt: null },
    include: { problem: true },
  });
  if (!proposal) throw AppError.notFound("Taklif topilmadi.");
  if (proposal.scientistId !== user.id) throw AppError.forbidden();
  if (proposal.status !== "PENDING") {
    throw AppError.conflict("Faqat kutilayotgan taklifni bekor qilish mumkin.");
  }

  const updated = await prisma.proposal.update({
    where: { id: proposal.id },
    data: { status: "WITHDRAWN", withdrawnAt: new Date() },
    include: { scientist: true, problem: true },
  });

  if (updated.problem) {
    void pushNotification({
      userId: updated.problem.companyId,
      type: "PROPOSAL_WITHDRAWN",
      title: "Taklif bekor qilindi",
      body: `${user.name} «${updated.problem.title}» bo'yicha taklifini bekor qildi.`,
      link: `/app/admin/problems/${updated.problemId}/proposals`,
    });
  }

  return toProposalListItem(updated);
}

export async function acceptProposal(proposalId: string, companyId: string): Promise<ProposalListItem> {
  const result = await prisma.$transaction(async (tx) => {
    const proposal = await tx.proposal.findFirst({ where: { id: proposalId, deletedAt: null } });
    if (!proposal) throw AppError.notFound("Taklif topilmadi.");

    const problem = await tx.problem.findFirst({ where: { id: proposal.problemId, deletedAt: null } });
    if (!problem) throw AppError.notFound("Muammo topilmadi.");
    if (problem.companyId !== companyId) throw AppError.forbidden();
    if (proposal.status !== "PENDING") throw AppError.conflict("Faqat kutilayotgan takliflarni qabul qilish mumkin.");

    const scientist = await tx.user.findFirst({
      where: { id: proposal.scientistId, status: "ACTIVE", deletedAt: null },
    });
    if (!scientist) throw AppError.conflict("Olim faol emas.");

    const claim = await tx.problem.updateMany({
      where: { id: problem.id, status: "OPEN" },
      data: { status: "MATCHED", matchedAt: new Date() },
    });
    if (claim.count === 0) {
      throw AppError.conflict("Muammo allaqachon boshqa taklif bilan yopilgan.");
    }

    await tx.proposal.update({
      where: { id: proposal.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    const pendingSiblings = await tx.proposal.findMany({
      where: { problemId: problem.id, status: "PENDING", id: { not: proposal.id }, deletedAt: null },
      select: { scientistId: true },
    });

    await tx.proposal.updateMany({
      where: { problemId: problem.id, status: "PENDING", id: { not: proposal.id } },
      data: { status: "REJECTED" },
    });

    return {
      accepted: await tx.proposal.findFirstOrThrow({ where: { id: proposal.id }, include: { scientist: true } }),
      problemTitle: problem.title,
      rejectedIds: pendingSiblings.map((p) => p.scientistId),
    };
  });

  void pushNotification({
    userId: result.accepted.scientistId,
    type: "PROPOSAL_ACCEPTED",
    title: "Taklifingiz qabul qilindi",
    body: `«${result.problemTitle}» muammosi bo'yicha taklifingiz tanlandi. Kontaktlar ochildi.`,
    link: "/app/connections",
  });

  for (const rejectedScientistId of result.rejectedIds) {
    void pushNotification({
      userId: rejectedScientistId,
      type: "PROPOSAL_REJECTED",
      title: "Taklif rad etildi",
      body: `«${result.problemTitle}» uchun boshqa taklif tanlandi.`,
      link: "/app/user/proposals",
    });
  }

  return toProposalListItem(result.accepted);
}

export async function getProposalAttachment(proposalId: string, user: { id: string; role: string }) {
  const proposal = await loadProposalWithAccess(proposalId, user.id, user.role);
  if (!proposal.attachmentStoredName || !proposal.attachmentOriginalName) {
    throw AppError.notFound("Fayl mavjud emas.");
  }

  const filePath = path.join(uploadRoot, proposal.attachmentStoredName);
  const resolved = path.resolve(filePath);
  if (!isPathInside(uploadRoot, resolved)) {
    throw AppError.badRequest("Noto'g'ri fayl so'rovi.");
  }

  return {
    resolvedPath: resolved,
    originalName: proposal.attachmentOriginalName,
    mimeType: proposal.attachmentMime,
  };
}
