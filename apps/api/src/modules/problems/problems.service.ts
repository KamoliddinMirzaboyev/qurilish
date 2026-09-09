import path from "node:path";
import fs from "node:fs/promises";
import type { Prisma } from "@prisma/client";
import {
  GALLERY_UPLOAD,
  type ProblemListItem,
  type ProblemDetail,
  type CompanyStats,
  type Paginated,
  type CreateProblemInput,
  type UpdateProblemInput,
  type ProblemQuery,
} from "@buildscience/shared";
import { prisma } from "../../services/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { uploadPublicRoot } from "../../middleware/upload.js";
import { pushNotification } from "../../services/notifications.js";
import { problemStatus } from "../../utils/queryEnums.js";
import { toProblemDetail, toProblemListItem } from "./problems.serializers.js";

const companySelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  organization: true,
  specialization: true,
  bio: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

export async function getOpenProblems(query: ProblemQuery): Promise<Paginated<ProblemListItem>> {
  const { search, category, budgetType, sort, page, pageSize } = query;

  const where: Prisma.ProblemWhereInput = {
    status: "OPEN",
    deletedAt: null,
    ...(category ? { category: category as Prisma.EnumCategoryFilter["equals"] } : {}),
    ...(budgetType ? { budgetType: budgetType as Prisma.EnumBudgetTypeFilter["equals"] } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ProblemOrderByWithRelationInput =
    sort === "oldest"
      ? { createdAt: "asc" }
      : sort === "budgetHigh"
        ? { budgetAmount: { sort: "desc", nulls: "last" } }
        : sort === "budgetLow"
          ? { budgetAmount: { sort: "asc", nulls: "last" } }
          : { createdAt: "desc" };

  const [problems, total] = await Promise.all([
    prisma.problem.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        company: { select: companySelect },
        images: { orderBy: { sortOrder: "asc" } },
        _count: { select: { proposals: { where: { deletedAt: null } } } },
      },
    }),
    prisma.problem.count({ where }),
  ]);

  return {
    items: problems.map((p) => toProblemListItem(p as never, p._count.proposals)),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getCompanyProblems(
  companyId: string,
  query: { status?: string; page: number; pageSize: number }
): Promise<Paginated<ProblemListItem>> {
  const { status, page, pageSize } = query;
  const where: Prisma.ProblemWhereInput = {
    companyId,
    deletedAt: null,
    ...(problemStatus(status) ? { status: problemStatus(status) } : {}),
  };

  const [problems, total] = await Promise.all([
    prisma.problem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        company: { select: companySelect },
        images: { orderBy: { sortOrder: "asc" } },
        _count: { select: { proposals: { where: { deletedAt: null } } } },
      },
    }),
    prisma.problem.count({ where }),
  ]);

  return {
    items: problems.map((p) => toProblemListItem(p as never, p._count.proposals)),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getCompanyStats(companyId: string): Promise<CompanyStats> {
  const [openProblems, matchedProblems, closedProblems, totalProposals] = await Promise.all([
    prisma.problem.count({ where: { companyId, deletedAt: null, status: "OPEN" } }),
    prisma.problem.count({ where: { companyId, deletedAt: null, status: "MATCHED" } }),
    prisma.problem.count({ where: { companyId, deletedAt: null, status: "CLOSED" } }),
    prisma.proposal.count({ where: { deletedAt: null, problem: { companyId, deletedAt: null } } }),
  ]);
  return { openProblems, matchedProblems, closedProblems, totalProposals };
}

export async function loadVisibleProblem(problemId: string, userId?: string, userRole?: string) {
  const problem = await prisma.problem.findFirst({
    where: { id: problemId, deletedAt: null },
    include: {
      company: { select: companySelect },
      images: { orderBy: { sortOrder: "asc" } },
      _count: { select: { proposals: { where: { deletedAt: null } } } },
    },
  });
  if (!problem) throw AppError.notFound("Muammo topilmadi.");

  if (problem.status === "OPEN") return problem;

  const isOwner = userId === problem.companyId;
  const isAdmin = userRole === "SUPERADMIN";
  if (isOwner || isAdmin) return problem;

  if (userId) {
    const hasProposal = await prisma.proposal.findFirst({ where: { problemId, scientistId: userId, deletedAt: null } });
    if (hasProposal) return problem;
  }

  throw AppError.notFound("Muammo topilmadi.");
}

export async function getProblemDetail(problemId: string, user?: { id?: string; role?: string }): Promise<ProblemDetail> {
  const problem = await loadVisibleProblem(problemId, user?.id, user?.role);
  let myProposal: { id: string } | null = null;
  if (user?.id && user.role === "USER") {
    myProposal = await prisma.proposal.findFirst({
      where: { problemId: problem.id, scientistId: user.id, deletedAt: null },
      select: { id: true },
    });
  }
  return toProblemDetail(problem as never, problem._count.proposals, myProposal);
}

export async function createProblem(
  companyId: string,
  input: CreateProblemInput,
  files: Express.Multer.File[] = []
): Promise<ProblemDetail> {
  const problem = await prisma.problem.create({
    data: {
      companyId,
      title: input.title,
      description: input.description,
      category: input.category,
      budgetType: input.budgetType,
      budgetAmount: input.budgetAmount ?? null,
      status: "OPEN",
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
    include: {
      company: { select: companySelect },
      images: { orderBy: { sortOrder: "asc" } },
      _count: { select: { proposals: true } },
    },
  });
  return toProblemDetail(problem as never, problem._count.proposals);
}

export async function loadOwnedOpenProblem(problemId: string, companyId: string) {
  const problem = await prisma.problem.findFirst({ where: { id: problemId, deletedAt: null } });
  if (!problem) throw AppError.notFound("Muammo topilmadi.");
  if (problem.companyId !== companyId) throw AppError.forbidden();
  if (problem.status !== "OPEN") throw AppError.conflict("Faqat ochiq muammo ustida bu amalni bajarish mumkin.");
  return problem;
}

export async function updateProblem(
  problemId: string,
  companyId: string,
  input: UpdateProblemInput,
  files: Express.Multer.File[] = []
): Promise<ProblemDetail> {
  const existing = await prisma.problem.findFirst({
    where: { id: problemId, deletedAt: null },
    include: { images: true },
  });
  if (!existing) throw AppError.notFound("Muammo topilmadi.");
  if (existing.companyId !== companyId) throw AppError.forbidden();
  if (existing.status !== "OPEN") {
    throw AppError.conflict("Faqat ochiq muammoni tahrirlash mumkin.");
  }

  if (existing.images.length + files.length > GALLERY_UPLOAD.MAX_IMAGES) {
    throw AppError.badRequest(`Bitta muammo uchun jami ${GALLERY_UPLOAD.MAX_IMAGES} tadan ortiq rasm bo'lishi mumkin emas.`);
  }

  const updated = await prisma.problem.update({
    where: { id: existing.id },
    data: {
      title: input.title,
      description: input.description,
      category: input.category,
      budgetType: input.budgetType,
      budgetAmount: input.budgetAmount ?? null,
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
    include: {
      company: { select: companySelect },
      images: { orderBy: { sortOrder: "asc" } },
      _count: { select: { proposals: true } },
    },
  });

  return toProblemDetail(updated as never, updated._count.proposals);
}

export async function deleteProblemImage(problemId: string, imageId: string, companyId: string): Promise<void> {
  await loadOwnedOpenProblem(problemId, companyId);
  const image = await prisma.problemImage.findFirst({ where: { id: imageId, problemId } });
  if (!image) throw AppError.notFound("Rasm topilmadi.");

  await prisma.problemImage.delete({ where: { id: image.id } });
  await fs.unlink(path.join(uploadPublicRoot, image.storedName)).catch(() => undefined);
}

export async function deleteProblem(problemId: string, companyId: string): Promise<void> {
  const existing = await loadOwnedOpenProblem(problemId, companyId);
  const proposalCount = await prisma.proposal.count({ where: { problemId: existing.id, deletedAt: null } });
  if (proposalCount > 0) {
    throw AppError.conflict("Takliflari mavjud muammoni o'chirib bo'lmaydi.");
  }

  const images = await prisma.problemImage.findMany({ where: { problemId: existing.id } });
  await prisma.$transaction([
    prisma.problem.update({ where: { id: existing.id }, data: { deletedAt: new Date() } }),
    prisma.problemImage.deleteMany({ where: { problemId: existing.id } }),
  ]);
  await Promise.all(images.map((img) => fs.unlink(path.join(uploadPublicRoot, img.storedName)).catch(() => undefined)));
}

export async function closeProblem(problemId: string, companyId: string): Promise<ProblemDetail> {
  const existing = await loadOwnedOpenProblem(problemId, companyId);

  const pending = await prisma.proposal.findMany({
    where: { problemId: existing.id, status: "PENDING", deletedAt: null },
    select: { scientistId: true },
  });

  const updated = await prisma.$transaction(async (tx) => {
    const claim = await tx.problem.updateMany({
      where: { id: existing.id, status: "OPEN" },
      data: { status: "CLOSED", closedAt: new Date() },
    });
    if (claim.count === 0) {
      throw AppError.conflict("Muammo allaqachon yopilgan yoki moslashgan.");
    }
    await tx.proposal.updateMany({
      where: { problemId: existing.id, status: "PENDING" },
      data: { status: "REJECTED" },
    });
    return tx.problem.findFirstOrThrow({
      where: { id: existing.id },
      include: {
        company: { select: companySelect },
        images: { orderBy: { sortOrder: "asc" } },
        _count: { select: { proposals: true } },
      },
    });
  });

  for (const p of pending) {
    void pushNotification({
      userId: p.scientistId,
      type: "PROBLEM_CLOSED",
      title: "E'lon yopildi",
      body: `«${existing.title}» yopildi, kutilayotgan takliflar rad etildi.`,
      link: "/app/user/proposals",
    });
  }

  return toProblemDetail(updated as never, updated._count.proposals);
}
