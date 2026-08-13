import type { Role, UserStatus, ProblemStatus, ProposalStatus, BudgetType, Category } from "./enums.js";

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PublicUser {
  id: string;
  role: Role;
  name: string;
  organization: string | null;
  specialization: string | null;
  bio: string | null;
}

export interface AuthUser extends PublicUser {
  email: string;
  phone: string;
  status: UserStatus;
  createdAt: string;
}

export interface ProblemListItem {
  id: string;
  title: string;
  descriptionExcerpt: string;
  category: Category;
  budgetType: BudgetType;
  budgetAmount: string | null;
  status: ProblemStatus;
  companyName: string;
  proposalCount: number;
  coverImageUrl: string | null;
  createdAt: string;
}

export interface ProblemDetail extends Omit<ProblemListItem, "descriptionExcerpt"> {
  description: string;
  companyId: string;
  matchedAt: string | null;
  closedAt: string | null;
  images: GalleryImage[];
}

export interface ProposalListItem {
  id: string;
  problemId: string;
  scientistId: string;
  scientistName: string;
  specialization: string | null;
  organization: string | null;
  scientistBio: string | null;
  solutionText: string;
  estimatedDays: number;
  priceNegotiable: boolean;
  proposedPrice: string | null;
  attachmentOriginalName: string | null;
  attachmentSize: number | null;
  status: ProposalStatus;
  createdAt: string;
  acceptedAt: string | null;
  problemTitle?: string;
  problemStatus?: ProblemStatus;
  category?: Category;
  companyName?: string;
}

export interface ConnectionCompanyView {
  proposalId: string;
  problemId: string;
  problemTitle: string;
  scientistName: string;
  scientistEmail: string;
  scientistPhone: string;
  specialization: string | null;
  organization: string | null;
  acceptedAt: string;
}

export interface ConnectionScientistView {
  proposalId: string;
  problemId: string;
  problemTitle: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  acceptedAt: string;
}

export interface PublicStats {
  openProblems: number;
  matchedProblems: number;
  totalAdmins: number;
  totalUsers: number;
}

export interface CompanyStats {
  openProblems: number;
  matchedProblems: number;
  closedProblems: number;
  totalProposals: number;
}

export interface AdminStats {
  totalUsers: number;
  totalAdmins: number;
  openProblems: number;
  totalProposals: number;
  acceptedProposals: number;
  blockedUsers: number;
  totalMines: number;
  totalWaste: number;
}

export interface GalleryImage {
  id: string;
  url: string;
}

export interface MineListItem {
  id: string;
  name: string;
  location: string;
  rawMaterialType: string;
  volume: string;
  coverImageUrl: string | null;
  imageUrls: string[];
  adminName: string;
  createdAt: string;
}

export interface MineDetail {
  id: string;
  adminId: string;
  name: string;
  description: string | null;
  location: string;
  rawMaterialType: string;
  volume: string;
  images: GalleryImage[];
  adminName: string;
  createdAt: string;
}

export interface WasteListItem {
  id: string;
  factoryName: string;
  composition: string;
  volume: string;
  annualVolume: string;
  coverImageUrl: string | null;
  adminName: string;
  createdAt: string;
}

export interface WasteDetail {
  id: string;
  adminId: string;
  factoryName: string;
  composition: string;
  volume: string;
  annualVolume: string;
  description: string | null;
  images: GalleryImage[];
  adminName: string;
  createdAt: string;
}
