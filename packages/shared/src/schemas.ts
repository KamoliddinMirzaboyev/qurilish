import { z } from "zod";
import { BudgetType, Category } from "./enums.js";
import { LIMITS, PHONE_REGEX, PAGINATION, MINE_LIMITS, WASTE_LIMITS } from "./constants.js";

const name = z
  .string({ required_error: "Ismni kiriting." })
  .trim()
  .min(LIMITS.NAME_MIN, `Ism kamida ${LIMITS.NAME_MIN} ta belgidan iborat bo'lishi kerak.`)
  .max(LIMITS.NAME_MAX, `Ism ${LIMITS.NAME_MAX} ta belgidan oshmasligi kerak.`);
const email = z
  .string({ required_error: "Email kiriting." })
  .trim()
  .toLowerCase()
  .email("To'g'ri email manzilini kiriting.");
const phone = z
  .string({ required_error: "Telefon raqamini kiriting." })
  .trim()
  .regex(PHONE_REGEX, "Telefon raqami +998XXXXXXXXX formatida bo'lishi kerak.");
const password = z
  .string({ required_error: "Parolni kiriting." })
  .min(LIMITS.PASSWORD_MIN, `Parol kamida ${LIMITS.PASSWORD_MIN} ta belgidan iborat bo'lishi kerak.`);
const organization = z
  .string({ invalid_type_error: "Tashkilot nomi matn bo'lishi kerak." })
  .trim()
  .max(LIMITS.ORGANIZATION_MAX, `Tashkilot nomi ${LIMITS.ORGANIZATION_MAX} ta belgidan oshmasligi kerak.`)
  .optional()
  .or(z.literal(""));
const specialization = z
  .string({ invalid_type_error: "Mutaxassislik matn bo'lishi kerak." })
  .trim()
  .max(LIMITS.SPECIALIZATION_MAX, `Mutaxassislik ${LIMITS.SPECIALIZATION_MAX} ta belgidan oshmasligi kerak.`)
  .optional()
  .or(z.literal(""));
const bio = z
  .string({ invalid_type_error: "Bio matn bo'lishi kerak." })
  .trim()
  .max(LIMITS.BIO_MAX, `Bio ${LIMITS.BIO_MAX} ta belgidan oshmasligi kerak.`)
  .optional()
  .or(z.literal(""));

export const registerSchema = z
  .object({
    name,
    email,
    phone,
    password,
    passwordConfirm: z.string({ required_error: "Parolni takrorlang." }),
    organization,
    specialization,
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Parollar mos kelmadi.",
    path: ["passwordConfirm"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const createAdminSchema = z.object({
  name,
  email,
  phone,
  password,
  organization,
});
export type CreateAdminInput = z.infer<typeof createAdminSchema>;

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email yoki loginingizni kiriting." })
    .trim()
    .min(1, "Email yoki loginingizni kiriting.")
    .toLowerCase(),
  password: z.string({ required_error: "Parolni kiriting." }).min(1, "Parolni kiriting."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateProfileSchema = z.object({
  name,
  phone,
  organization,
  specialization,
  bio,
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ required_error: "Joriy parolni kiriting." }).min(1, "Joriy parolni kiriting."),
    newPassword: password,
    confirmPassword: z.string({ required_error: "Yangi parolni tasdiqlang." }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Parollar mos kelmadi.",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const updateLoginSchema = z.object({
  newLogin: z
    .string({ required_error: "Yangi login/email kiriting." })
    .trim()
    .toLowerCase()
    .min(3, "Login kamida 3 ta belgidan iborat bo'lishi kerak.")
    .max(255, "Login 255 ta belgidan oshmasligi kerak."),
  currentPassword: z.string({ required_error: "Joriy parolni kiriting." }).min(1, "Joriy parolni kiriting."),
});
export type UpdateLoginInput = z.infer<typeof updateLoginSchema>;

const categoryEnum = z.enum(
  [
    Category.CONSTRUCTION,
    Category.CONCRETE_CEMENT,
    Category.BUILDING_MATERIALS,
    Category.CHEMISTRY,
    Category.LOGISTICS,
    Category.ENERGY_EFFICIENCY,
    Category.SEISMIC_SAFETY,
    Category.ECOLOGY,
    Category.OTHER,
  ],
  { errorMap: () => ({ message: "Noto'g'ri yo'nalish tanlandi." }) }
);

const budgetTypeEnum = z.enum([BudgetType.FIXED, BudgetType.NEGOTIABLE], {
  errorMap: () => ({ message: "Noto'g'ri budjet turi." }),
});

export const createProblemSchema = z
  .object({
    title: z
      .string({ required_error: "Sarlavhani kiriting." })
      .trim()
      .min(LIMITS.PROBLEM_TITLE_MIN, `Sarlavha kamida ${LIMITS.PROBLEM_TITLE_MIN} ta belgidan iborat bo'lishi kerak.`)
      .max(LIMITS.PROBLEM_TITLE_MAX, `Sarlavha ${LIMITS.PROBLEM_TITLE_MAX} ta belgidan oshmasligi kerak.`),
    description: z
      .string({ required_error: "Muammo tavsifini kiriting." })
      .trim()
      .min(
        LIMITS.PROBLEM_DESCRIPTION_MIN,
        `Muammo tavsifi kamida ${LIMITS.PROBLEM_DESCRIPTION_MIN} ta belgidan iborat bo'lishi kerak.`
      )
      .max(LIMITS.PROBLEM_DESCRIPTION_MAX, `Muammo tavsifi ${LIMITS.PROBLEM_DESCRIPTION_MAX} ta belgidan oshmasligi kerak.`),
    category: categoryEnum,
    budgetType: budgetTypeEnum,
    budgetAmount: z.coerce
      .number({ invalid_type_error: "Budjet miqdorini kiriting." })
      .positive("Budjet miqdori musbat son bo'lishi kerak.")
      .optional()
      .nullable(),
  })
  .refine((data) => (data.budgetType === BudgetType.FIXED ? data.budgetAmount != null && data.budgetAmount > 0 : true), {
    message: "Budjet miqdorini kiriting.",
    path: ["budgetAmount"],
  })
  .refine((data) => (data.budgetType === BudgetType.NEGOTIABLE ? data.budgetAmount == null : true), {
    message: "Kelishilgan holatda budjet miqdori kiritilmaydi.",
    path: ["budgetAmount"],
  });
export type CreateProblemInput = z.infer<typeof createProblemSchema>;

export const updateProblemSchema = createProblemSchema;

export const problemQuerySchema = z.object({
  search: z.string({ invalid_type_error: "Qidiruv matni noto'g'ri." }).trim().max(200, "Qidiruv matni 200 ta belgidan oshmasligi kerak.").optional(),
  category: categoryEnum.optional(),
  budgetType: budgetTypeEnum.optional(),
  sort: z
    .enum(["newest", "oldest", "budgetHigh", "budgetLow"], {
      errorMap: () => ({ message: "Noto'g'ri saralash turi." }),
    })
    .default("newest"),
  page: z.coerce.number({ invalid_type_error: "Sahifa raqami noto'g'ri." }).int("Sahifa butun son bo'lishi kerak.").min(1, "Sahifa raqami kamida 1 bo'lishi kerak.").default(1),
  pageSize: z.coerce.number({ invalid_type_error: "Sahifa hajmi noto'g'ri." }).int("Sahifa hajmi butun son bo'lishi kerak.").min(1, "Sahifa hajmi kamida 1 bo'lishi kerak.").max(PAGINATION.MAX_PAGE_SIZE, `Sahifa hajmi ${PAGINATION.MAX_PAGE_SIZE} dan oshmasligi kerak.`).default(PAGINATION.DEFAULT_PAGE_SIZE),
});
export type ProblemQueryInput = z.infer<typeof problemQuerySchema>;

export const createProposalSchema = z
  .object({
    solutionText: z
      .string({ required_error: "Yechim tavsifini kiriting." })
      .trim()
      .min(
        LIMITS.PROPOSAL_SOLUTION_MIN,
        `Yechim tavsifi kamida ${LIMITS.PROPOSAL_SOLUTION_MIN} ta belgidan iborat bo'lishi kerak.`
      )
      .max(LIMITS.PROPOSAL_SOLUTION_MAX, `Yechim tavsifi ${LIMITS.PROPOSAL_SOLUTION_MAX} ta belgidan oshmasligi kerak.`),
    estimatedDays: z.coerce
      .number({ invalid_type_error: "Bajarish muddatini to'g'ri kiriting.", required_error: "Bajarish muddatini kiriting." })
      .int("Bajarish muddati butun son bo'lishi kerak.")
      .min(LIMITS.ESTIMATED_DAYS_MIN, "Bajarish muddati musbat son bo'lishi kerak.")
      .max(LIMITS.ESTIMATED_DAYS_MAX, `Bajarish muddati ${LIMITS.ESTIMATED_DAYS_MAX} kundan oshmasligi kerak.`),
    priceNegotiable: z.coerce.boolean().default(false),
    proposedPrice: z.coerce
      .number({ invalid_type_error: "Taklif narxini to'g'ri kiriting.", required_error: "Taklif narxini kiriting." })
      .positive("Taklif narxi musbat son bo'lishi kerak.")
      .optional()
      .nullable(),
  })
  .refine((data) => (!data.priceNegotiable ? data.proposedPrice != null && data.proposedPrice > 0 : true), {
    message: "Taklif narxini kiriting.",
    path: ["proposedPrice"],
  })
  .refine((data) => (data.priceNegotiable ? data.proposedPrice == null : true), {
    message: "Narx kelishiladigan holatda narx kiritilmaydi.",
    path: ["proposedPrice"],
  });
export type CreateProposalInput = z.infer<typeof createProposalSchema>;

export const updateProposalSchema = createProposalSchema;

export const adminUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "BLOCKED"], { errorMap: () => ({ message: "Noto'g'ri holat." }) }),
});

export const paginationQuerySchema = z.object({
  search: z.string({ invalid_type_error: "Qidiruv matni noto'g'ri." }).trim().max(200, "Qidiruv matni 200 ta belgidan oshmasligi kerak.").optional(),
  page: z.coerce.number({ invalid_type_error: "Sahifa raqami noto'g'ri." }).int("Sahifa butun son bo'lishi kerak.").min(1, "Sahifa raqami kamida 1 bo'lishi kerak.").default(1),
  pageSize: z.coerce.number({ invalid_type_error: "Sahifa hajmi noto'g'ri." }).int("Sahifa hajmi butun son bo'lishi kerak.").min(1, "Sahifa hajmi kamida 1 bo'lishi kerak.").max(PAGINATION.MAX_PAGE_SIZE, `Sahifa hajmi ${PAGINATION.MAX_PAGE_SIZE} dan oshmasligi kerak.`).default(20),
});

export const mineSchema = z.object({
  name: z
    .string({ required_error: "Kon nomini kiriting." })
    .trim()
    .min(MINE_LIMITS.NAME_MIN, `Nom kamida ${MINE_LIMITS.NAME_MIN} ta belgidan iborat bo'lishi kerak.`)
    .max(MINE_LIMITS.NAME_MAX, `Nom ${MINE_LIMITS.NAME_MAX} ta belgidan oshmasligi kerak.`),
  description: z
    .string({ invalid_type_error: "Tavsif matn bo'lishi kerak." })
    .trim()
    .max(MINE_LIMITS.DESCRIPTION_MAX, `Tavsif ${MINE_LIMITS.DESCRIPTION_MAX} ta belgidan oshmasligi kerak.`)
    .optional()
    .or(z.literal("")),
  location: z
    .string({ required_error: "Joylashuvni kiriting." })
    .trim()
    .min(MINE_LIMITS.LOCATION_MIN, `Joylashuv kamida ${MINE_LIMITS.LOCATION_MIN} ta belgidan iborat bo'lishi kerak.`)
    .max(MINE_LIMITS.LOCATION_MAX, `Joylashuv ${MINE_LIMITS.LOCATION_MAX} ta belgidan oshmasligi kerak.`),
  rawMaterialType: z
    .string({ required_error: "Xomashyo turini kiriting." })
    .trim()
    .min(MINE_LIMITS.RAW_MATERIAL_MIN, `Xomashyo turi kamida ${MINE_LIMITS.RAW_MATERIAL_MIN} ta belgidan iborat bo'lishi kerak.`)
    .max(MINE_LIMITS.RAW_MATERIAL_MAX, `Xomashyo turi ${MINE_LIMITS.RAW_MATERIAL_MAX} ta belgidan oshmasligi kerak.`),
  volume: z
    .string({ required_error: "Hajmni kiriting." })
    .trim()
    .min(MINE_LIMITS.VOLUME_MIN, "Hajmni kiriting.")
    .max(MINE_LIMITS.VOLUME_MAX, `Hajm ${MINE_LIMITS.VOLUME_MAX} ta belgidan oshmasligi kerak.`),
});
export type MineInput = z.infer<typeof mineSchema>;

export const wasteSchema = z.object({
  factoryName: z
    .string({ required_error: "Zavod nomini kiriting." })
    .trim()
    .min(WASTE_LIMITS.FACTORY_NAME_MIN, `Zavod nomi kamida ${WASTE_LIMITS.FACTORY_NAME_MIN} ta belgidan iborat bo'lishi kerak.`)
    .max(WASTE_LIMITS.FACTORY_NAME_MAX, `Zavod nomi ${WASTE_LIMITS.FACTORY_NAME_MAX} ta belgidan oshmasligi kerak.`),
  composition: z
    .string({ required_error: "Tarkibini kiriting." })
    .trim()
    .min(WASTE_LIMITS.COMPOSITION_MIN, `Tarkib kamida ${WASTE_LIMITS.COMPOSITION_MIN} ta belgidan iborat bo'lishi kerak.`)
    .max(WASTE_LIMITS.COMPOSITION_MAX, `Tarkib ${WASTE_LIMITS.COMPOSITION_MAX} ta belgidan oshmasligi kerak.`),
  volume: z
    .string({ required_error: "Hajmni kiriting." })
    .trim()
    .min(WASTE_LIMITS.VOLUME_MIN, "Hajmni kiriting.")
    .max(WASTE_LIMITS.VOLUME_MAX, `Hajm ${WASTE_LIMITS.VOLUME_MAX} ta belgidan oshmasligi kerak.`),
  annualVolume: z
    .string({ required_error: "Yillik hajmni kiriting." })
    .trim()
    .min(WASTE_LIMITS.ANNUAL_VOLUME_MIN, "Yillik hajmni kiriting.")
    .max(WASTE_LIMITS.ANNUAL_VOLUME_MAX, `Yillik hajm ${WASTE_LIMITS.ANNUAL_VOLUME_MAX} ta belgidan oshmasligi kerak.`),
  description: z
    .string({ invalid_type_error: "Tavsif matn bo'lishi kerak." })
    .trim()
    .max(WASTE_LIMITS.DESCRIPTION_MAX, `Tavsif ${WASTE_LIMITS.DESCRIPTION_MAX} ta belgidan oshmasligi kerak.`)
    .optional()
    .or(z.literal("")),
});
export type WasteInput = z.infer<typeof wasteSchema>;
