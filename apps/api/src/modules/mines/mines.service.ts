import path from "node:path";
import fs from "node:fs/promises";
import type { Prisma } from "@prisma/client";
import { GALLERY_UPLOAD, type MineInput, type MineDetail, type MineListItem, type Paginated } from "@buildscience/shared";
import { prisma } from "../../services/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { uploadPublicRoot } from "../../middleware/upload.js";
import { toMineDetail, toMineListItem } from "./mines.serializers.js";

const adminSelect = {
  id: true,
  name: true,
  email: true,
  organization: true,
} as const;

const include = {
  admin: { select: adminSelect },
  images: { orderBy: { sortOrder: "asc" as const } },
};

export async function getPublicMines(query: { search?: string; page: number; pageSize: number }): Promise<Paginated<MineListItem>> {
  const { search, page, pageSize } = query;
  const where: Prisma.MineWhereInput = {
    deletedAt: null,
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
  };

  const [mines, total] = await Promise.all([
    prisma.mine.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include }),
    prisma.mine.count({ where }),
  ]);

  return {
    items: mines.map((m) => toMineListItem(m as never)),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getMineDetailById(mineId: string): Promise<MineDetail> {
  const mine = await prisma.mine.findFirst({ where: { id: mineId, deletedAt: null }, include });
  if (!mine) throw AppError.notFound("Kon topilmadi.");
  return toMineDetail(mine as never);
}

export async function getMinesByAdmin(
  adminId: string | null,
  query: { search?: string; page: number; pageSize: number }
): Promise<Paginated<MineDetail>> {
  const { search, page, pageSize } = query;
  const where: Prisma.MineWhereInput = {
    deletedAt: null,
    ...(adminId ? { adminId } : {}),
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
  };

  const [mines, total] = await Promise.all([
    prisma.mine.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include }),
    prisma.mine.count({ where }),
  ]);

  return {
    items: mines.map((m) => toMineDetail(m as never)),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function createMine(
  creatorId: string,
  input: MineInput,
  files: Express.Multer.File[] = []
): Promise<MineDetail> {
  const mine = await prisma.mine.create({
    data: {
      adminId: creatorId,
      name: input.name,
      description: input.description || null,
      location: input.location,
      lat: input.lat,
      lng: input.lng,
      rawMaterialType: input.rawMaterialType,
      volume: input.volume,
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

  return toMineDetail(mine as never);
}

export async function updateMine(
  mineId: string,
  userId: string,
  userRole: string,
  input: MineInput,
  files: Express.Multer.File[] = []
): Promise<MineDetail> {
  const existing = await prisma.mine.findFirst({ where: { id: mineId, deletedAt: null }, include: { images: true } });
  if (!existing) throw AppError.notFound("Kon topilmadi.");
  if (userRole !== "SUPERADMIN" && existing.adminId !== userId) {
    throw AppError.forbidden();
  }

  if (existing.images.length + files.length > GALLERY_UPLOAD.MAX_IMAGES) {
    throw AppError.badRequest(`Bitta kon uchun jami ${GALLERY_UPLOAD.MAX_IMAGES} tadan ortiq rasm bo'lishi mumkin emas.`);
  }

  const updated = await prisma.mine.update({
    where: { id: existing.id },
    data: {
      name: input.name,
      description: input.description || null,
      location: input.location,
      lat: input.lat,
      lng: input.lng,
      rawMaterialType: input.rawMaterialType,
      volume: input.volume,
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

  return toMineDetail(updated as never);
}

export async function deleteMineImage(
  mineId: string,
  imageId: string,
  userId: string,
  userRole: string
): Promise<void> {
  const mine = await prisma.mine.findFirst({ where: { id: mineId, deletedAt: null } });
  if (!mine) throw AppError.notFound("Kon topilmadi.");
  if (userRole !== "SUPERADMIN" && mine.adminId !== userId) {
    throw AppError.forbidden();
  }

  const image = await prisma.mineImage.findFirst({ where: { id: imageId, mineId } });
  if (!image) throw AppError.notFound("Rasm topilmadi.");

  await prisma.mineImage.delete({ where: { id: image.id } });
  await fs.unlink(path.join(uploadPublicRoot, image.storedName)).catch(() => undefined);
}

export async function deleteMine(mineId: string, userId: string, userRole: string): Promise<void> {
  const mine = await prisma.mine.findFirst({ where: { id: mineId, deletedAt: null }, include: { images: true } });
  if (!mine) throw AppError.notFound("Kon topilmadi.");
  if (userRole !== "SUPERADMIN" && mine.adminId !== userId) {
    throw AppError.forbidden();
  }

  await prisma.$transaction([
    prisma.mine.update({ where: { id: mine.id }, data: { deletedAt: new Date() } }),
    prisma.mineImage.deleteMany({ where: { mineId: mine.id } }),
  ]);
  await Promise.all(mine.images.map((img) => fs.unlink(path.join(uploadPublicRoot, img.storedName)).catch(() => undefined)));
}
