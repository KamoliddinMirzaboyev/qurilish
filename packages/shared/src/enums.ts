export const Role = {
  SUPERADMIN: "SUPERADMIN",
  ADMIN: "ADMIN",
  USER: "USER",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const UserStatus = {
  ACTIVE: "ACTIVE",
  BLOCKED: "BLOCKED",
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const ProblemStatus = {
  OPEN: "OPEN",
  MATCHED: "MATCHED",
  CLOSED: "CLOSED",
} as const;
export type ProblemStatus = (typeof ProblemStatus)[keyof typeof ProblemStatus];

export const ProposalStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  WITHDRAWN: "WITHDRAWN",
} as const;
export type ProposalStatus = (typeof ProposalStatus)[keyof typeof ProposalStatus];

export const BudgetType = {
  FIXED: "FIXED",
  NEGOTIABLE: "NEGOTIABLE",
} as const;
export type BudgetType = (typeof BudgetType)[keyof typeof BudgetType];

export const Category = {
  CONSTRUCTION: "CONSTRUCTION",
  CONCRETE_CEMENT: "CONCRETE_CEMENT",
  BUILDING_MATERIALS: "BUILDING_MATERIALS",
  CHEMISTRY: "CHEMISTRY",
  LOGISTICS: "LOGISTICS",
  ENERGY_EFFICIENCY: "ENERGY_EFFICIENCY",
  SEISMIC_SAFETY: "SEISMIC_SAFETY",
  ECOLOGY: "ECOLOGY",
  OTHER: "OTHER",
} as const;
export type Category = (typeof Category)[keyof typeof Category];

export const ROLE_LABELS_UZ: Record<Role, string> = {
  SUPERADMIN: "Hokimiyat",
  ADMIN: "Firma",
  USER: "Foydalanuvchi",
};

export const USER_STATUS_LABELS_UZ: Record<UserStatus, string> = {
  ACTIVE: "Faol",
  BLOCKED: "Bloklangan",
};

export const PROBLEM_STATUS_LABELS_UZ: Record<ProblemStatus, string> = {
  OPEN: "Ochiq",
  MATCHED: "Foydalanuvchi tanlangan",
  CLOSED: "Yopilgan",
};

export const PROPOSAL_STATUS_LABELS_UZ: Record<ProposalStatus, string> = {
  PENDING: "Kutilmoqda",
  ACCEPTED: "Qabul qilindi",
  REJECTED: "Rad etildi",
  WITHDRAWN: "Bekor qilindi",
};

export const BUDGET_TYPE_LABELS_UZ: Record<BudgetType, string> = {
  FIXED: "Aniq budjet",
  NEGOTIABLE: "Kelishilgan holda",
};

export const CATEGORY_LABELS_UZ: Record<Category, string> = {
  CONSTRUCTION: "Qurilish",
  CONCRETE_CEMENT: "Beton va sement",
  BUILDING_MATERIALS: "Qurilish materiallari",
  CHEMISTRY: "Kimyo",
  LOGISTICS: "Logistika",
  ENERGY_EFFICIENCY: "Energiya samaradorligi",
  SEISMIC_SAFETY: "Seysmik barqarorlik",
  ECOLOGY: "Ekologiya",
  OTHER: "Boshqa",
};
