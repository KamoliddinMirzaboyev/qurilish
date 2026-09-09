import path from "node:path";
import fs from "node:fs/promises";
import type { Prisma } from "@prisma/client";
import { type AdminStats, type Paginated, type AuthUser, type CreateAdminInput } from "@buildscience/shared";
import { prisma } from "../../services/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { hashPassword } from "../../utils/password.js";
import { normalizePhone } from "../../utils/phone.js";
import { destroyUserSessions } from "../../utils/sessionAuth.js";
import { assertPhoneAvailable } from "../../utils/unique.js";
import { uploadPublicRoot, uploadRoot } from "../../middleware/upload.js";
import { toAuthUser } from "../../utils/serializers.js";
import { toProblemListItem } from "../problems/problems.serializers.js";
import { toProposalListItem } from "../proposals/proposals.serializers.js";
import { toWasteListItem } from "../waste/waste.serializers.js";
import { categoryValue, problemStatus, proposalStatus, userRole, userStatus } from "../../utils/queryEnums.js";

export async function getSystemAdminStats(): Promise<AdminStats> {
  const [totalUsers, totalAdmins, openProblems, totalProposals, acceptedProposals, blockedUsers, totalMines, totalWaste] =
    await Promise.all([
      prisma.user.count({ where: { role: "USER", deletedAt: null } }),
      prisma.user.count({ where: { role: "ADMIN", deletedAt: null } }),
      prisma.problem.count({ where: { status: "OPEN", deletedAt: null } }),
      prisma.proposal.count({ where: { deletedAt: null } }),
      prisma.proposal.count({ where: { status: "ACCEPTED", deletedAt: null } }),
      prisma.user.count({ where: { status: "BLOCKED", deletedAt: null } }),
      prisma.mine.count({ where: { deletedAt: null } }),
      prisma.waste.count({ where: { deletedAt: null } }),
    ]);

  return { totalUsers, totalAdmins, openProblems, totalProposals, acceptedProposals, blockedUsers, totalMines, totalWaste };
}

export async function createAdminAccount(body: CreateAdminInput): Promise<AuthUser> {
  const email = body.email.toLowerCase();
  const phone = normalizePhone(body.phone);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw AppError.unprocessable("Bu email allaqachon ro'yxatdan o'tgan.", { email: ["Bu email allaqachon ro'yxatdan o'tgan."] });
  }
  await assertPhoneAvailable(phone);
  const created = await prisma.user.create({
    data: {
      role: "ADMIN",
      name: body.name,
      email,
      phone,
      passwordHash: await hashPassword(body.password),
      organization: body.organization || null,
      status: "ACTIVE",
    },
  });
  return toAuthUser(created);
}

export async function getAdminUsersList(query: {
  search?: string;
  page: number;
  pageSize: number;
  role?: string;
  status?: string;
  sort?: string;
}): Promise<Paginated<AuthUser>> {
  const { search, page, pageSize, role, status, sort } = query;
  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(userRole(role) ? { role: userRole(role) } : {}),
    ...(userStatus(status) ? { status: userStatus(status) } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
            { organization: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.UserOrderByWithRelationInput = { createdAt: sort === "oldest" ? "asc" : "desc" };

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.user.count({ where }),
  ]);

  return {
    items: users.map(toAuthUser),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function updateUserStatusByAdmin(
  userId: string,
  newStatus: "ACTIVE" | "BLOCKED",
  currentAdminId: string
): Promise<AuthUser> {
  if (userId === currentAdminId) {
    throw AppError.badRequest("O'z hisobingiz holatini o'zgartira olmaysiz.");
  }
  const user = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } });
  if (!user) throw AppError.notFound("Foydalanuvchi topilmadi.");
  if (user.role === "SUPERADMIN") {
    throw AppError.forbidden("SUPERADMIN holatini o'zgartirib bo'lmaydi.");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { status: newStatus },
  });

  if (newStatus === "BLOCKED") {
    await destroyUserSessions(user.id);
  }

  return toAuthUser(updated);
}

export async function deleteUserByAdmin(userId: string, currentAdminId: string): Promise<void> {
  if (userId === currentAdminId) {
    throw AppError.badRequest("O'z hisobingizni o'chira olmaysiz.");
  }
  const user = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } });
  if (!user) throw AppError.notFound("Foydalanuvchi topilmadi.");
  if (user.role === "SUPERADMIN") {
    throw AppError.forbidden("SUPERADMIN akkauntini o'chirib bo'lmaydi.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { deletedAt: new Date(), status: "BLOCKED" },
  });
  await destroyUserSessions(user.id);
}

export async function getAdminProblemsList(query: {
  search?: string;
  category?: string;
  status?: string;
  sort?: string;
  page: number;
  pageSize: number;
}) {
  const { search, category, status, sort, page, pageSize } = query;
  const where: Prisma.ProblemWhereInput = {
    deletedAt: null,
    ...(categoryValue(category) ? { category: categoryValue(category) } : {}),
    ...(problemStatus(status) ? { status: problemStatus(status) } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            { company: { name: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ProblemOrderByWithRelationInput = { createdAt: sort === "oldest" ? "asc" : "desc" };

  const [problems, total] = await Promise.all([
    prisma.problem.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        company: true,
        images: { orderBy: { sortOrder: "asc" } },
        _count: { select: { proposals: { where: { deletedAt: null } } } },
      },
    }),
    prisma.problem.count({ where }),
  ]);

  return {
    items: problems.map((p) => toProblemListItem(p, p._count.proposals)),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function deleteAdminProblem(problemId: string): Promise<void> {
  const problem = await prisma.problem.findFirst({ where: { id: problemId, deletedAt: null }, include: { images: true } });
  if (!problem) throw AppError.notFound("Muammo topilmadi.");
  if (problem.status === "MATCHED") {
    throw AppError.conflict("Moslashgan muammoni o'chirib bo'lmaydi.");
  }
  await prisma.$transaction([
    prisma.problem.update({ where: { id: problem.id }, data: { deletedAt: new Date() } }),
    prisma.problemImage.deleteMany({ where: { problemId: problem.id } }),
  ]);
  await Promise.all(problem.images.map((img) => fs.unlink(path.join(uploadPublicRoot, img.storedName)).catch(() => undefined)));
}

export async function getAdminProposalsList(query: {
  search?: string;
  status?: string;
  sort?: string;
  page: number;
  pageSize: number;
}) {
  const { search, status, sort, page, pageSize } = query;
  const where: Prisma.ProposalWhereInput = {
    deletedAt: null,
    ...(proposalStatus(status) ? { status: proposalStatus(status) } : {}),
    ...(search
      ? {
          OR: [
            { solutionText: { contains: search, mode: "insensitive" } },
            { scientist: { name: { contains: search, mode: "insensitive" } } },
            { problem: { title: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ProposalOrderByWithRelationInput = { createdAt: sort === "oldest" ? "asc" : "desc" };

  const [proposals, total] = await Promise.all([
    prisma.proposal.findMany({
      where,
      orderBy,
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

export async function deleteAdminProposal(proposalId: string): Promise<void> {
  const proposal = await prisma.proposal.findFirst({ where: { id: proposalId, deletedAt: null } });
  if (!proposal) throw AppError.notFound("Taklif topilmadi.");
  if (proposal.status === "ACCEPTED") {
    throw AppError.conflict("Qabul qilingan taklifni o'chirib bo'lmaydi.");
  }
  await prisma.proposal.update({ where: { id: proposal.id }, data: { deletedAt: new Date() } });
  if (proposal.attachmentStoredName) {
    await fs.unlink(path.join(uploadRoot, proposal.attachmentStoredName)).catch(() => undefined);
  }
}

export async function getAdminWasteList(query: {
  search?: string;
  sort?: string;
  page: number;
  pageSize: number;
}) {
  const { search, sort, page, pageSize } = query;
  const where: Prisma.WasteWhereInput = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { factoryName: { contains: search, mode: "insensitive" } },
            { composition: { contains: search, mode: "insensitive" } },
            { admin: { name: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.WasteOrderByWithRelationInput = { createdAt: sort === "oldest" ? "asc" : "desc" };

  const [waste, total] = await Promise.all([
    prisma.waste.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { admin: true, images: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.waste.count({ where }),
  ]);

  return {
    items: waste.map(toWasteListItem),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function deleteAdminWaste(wasteId: string): Promise<void> {
  const waste = await prisma.waste.findFirst({ where: { id: wasteId, deletedAt: null }, include: { images: true } });
  if (!waste) throw AppError.notFound("Chiqindi e'loni topilmadi.");
  await prisma.$transaction([
    prisma.waste.update({ where: { id: waste.id }, data: { deletedAt: new Date() } }),
    prisma.wasteImage.deleteMany({ where: { wasteId: waste.id } }),
  ]);
  await Promise.all(waste.images.map((img) => fs.unlink(path.join(uploadPublicRoot, img.storedName)).catch(() => undefined)));
}
