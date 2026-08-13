import type { Mine, MineImage, User } from "@prisma/client";
import type { MineListItem, MineDetail } from "@buildscience/shared";
import { env } from "../../config/env.js";

type MineWithRelations = Mine & { admin: User; images: MineImage[] };

function imageUrl(storedName: string) {
  return `${env.publicUploadBaseUrl}/${storedName}`;
}

export function toMineListItem(mine: MineWithRelations): MineListItem {
  return {
    id: mine.id,
    name: mine.name,
    location: mine.location,
    rawMaterialType: mine.rawMaterialType,
    volume: mine.volume,
    coverImageUrl: mine.images[0] ? imageUrl(mine.images[0].storedName) : null,
    imageUrls: mine.images.map((img) => imageUrl(img.storedName)),
    adminName: mine.admin.name,
    createdAt: mine.createdAt.toISOString(),
  };
}

export function toMineDetail(mine: MineWithRelations): MineDetail {
  return {
    id: mine.id,
    adminId: mine.adminId,
    name: mine.name,
    description: mine.description,
    location: mine.location,
    rawMaterialType: mine.rawMaterialType,
    volume: mine.volume,
    images: mine.images.map((img) => ({ id: img.id, url: imageUrl(img.storedName) })),
    adminName: mine.admin.name,
    createdAt: mine.createdAt.toISOString(),
  };
}
