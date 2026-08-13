import type { Problem, ProblemImage, User } from "@prisma/client";
import type { ProblemDetail, ProblemListItem } from "@buildscience/shared";
import { env } from "../../config/env.js";

type ProblemWithCompany = Problem & { company: User; images: ProblemImage[]; _count?: { proposals: number } };

function excerpt(text: string, length = 180) {
  return text.length > length ? `${text.slice(0, length).trim()}…` : text;
}

function imageUrl(storedName: string) {
  return `${env.publicUploadBaseUrl}/${storedName}`;
}

export function toProblemListItem(problem: ProblemWithCompany, proposalCount: number): ProblemListItem {
  return {
    id: problem.id,
    title: problem.title,
    descriptionExcerpt: excerpt(problem.description),
    category: problem.category,
    budgetType: problem.budgetType,
    budgetAmount: problem.budgetAmount ? problem.budgetAmount.toString() : null,
    status: problem.status,
    companyName: problem.company.name,
    proposalCount,
    coverImageUrl: problem.images[0] ? imageUrl(problem.images[0].storedName) : null,
    imageUrls: (problem.images ?? []).map((img) => imageUrl(img.storedName)),
    createdAt: problem.createdAt.toISOString(),
  };
}

export function toProblemDetail(problem: ProblemWithCompany, proposalCount: number): ProblemDetail {
  return {
    id: problem.id,
    companyId: problem.companyId,
    title: problem.title,
    description: problem.description,
    category: problem.category,
    budgetType: problem.budgetType,
    budgetAmount: problem.budgetAmount ? problem.budgetAmount.toString() : null,
    status: problem.status,
    companyName: problem.company.name,
    proposalCount,
    coverImageUrl: problem.images[0] ? imageUrl(problem.images[0].storedName) : null,
    imageUrls: (problem.images ?? []).map((img) => imageUrl(img.storedName)),
    images: problem.images.map((img) => ({ id: img.id, url: imageUrl(img.storedName) })),
    createdAt: problem.createdAt.toISOString(),
    matchedAt: problem.matchedAt ? problem.matchedAt.toISOString() : null,
    closedAt: problem.closedAt ? problem.closedAt.toISOString() : null,
  };
}
