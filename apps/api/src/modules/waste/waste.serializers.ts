import type { Waste, WasteImage, User } from "@prisma/client";
import type { WasteListItem, WasteDetail } from "@buildscience/shared";
import { env } from "../../config/env.js";

type WasteWithRelations = Waste & { admin: User; images: WasteImage[] };

function imageUrl(storedName: string) {
  return `${env.publicUploadBaseUrl}/${storedName}`;
}

export function toWasteListItem(waste: WasteWithRelations): WasteListItem {
  return {
    id: waste.id,
    factoryName: waste.factoryName,
    composition: waste.composition,
    volume: waste.volume,
    annualVolume: waste.annualVolume,
    coverImageUrl: waste.images[0] ? imageUrl(waste.images[0].storedName) : null,
    adminName: waste.admin.name,
    createdAt: waste.createdAt.toISOString(),
  };
}

export function toWasteDetail(waste: WasteWithRelations): WasteDetail {
  return {
    id: waste.id,
    adminId: waste.adminId,
    factoryName: waste.factoryName,
    composition: waste.composition,
    volume: waste.volume,
    annualVolume: waste.annualVolume,
    description: waste.description,
    images: waste.images.map((img) => ({ id: img.id, url: imageUrl(img.storedName) })),
    adminName: waste.admin.name,
    createdAt: waste.createdAt.toISOString(),
  };
}
