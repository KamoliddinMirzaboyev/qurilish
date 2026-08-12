# Rol qayta qurilishi + Konlar/Chiqindi — Implementatsiya rejasi

> Ijrochi: shu sessiyada bevosita (inline), bosqichma-bosqich, har bosqichdan
> keyin `npm run typecheck` tekshiruvi bilan. Spec:
> `docs/superpowers/specs/2026-08-12-role-redesign-mines-waste-design.md`.

**Maqsad:** Role → SUPERADMIN/ADMIN/USER, EXPERT bosqichini bekor qilish,
Mine/Waste modullarini qo'shish, `init-admin` xavfsizlik teshigini yopish.

---

## Bosqich 1 — Shared paket

**Fayl:** `packages/shared/src/enums.ts`
- `Role`: `COMPANY→ADMIN`, `SCIENTIST→USER`, `EXPERT` o'chiriladi, `ADMIN→SUPERADMIN` qo'shiladi.
- `ROLE_LABELS_UZ` yangilanadi: `{ SUPERADMIN: "Hokimiyat", ADMIN: "Firma", USER: "Foydalanuvchi" }`.
- `ProposalStatus`dan `EXPERT_APPROVED` olib tashlanadi (faqat kod darajasida — DB enum qiymati saqlanadi, bosqich 2ga qarang).

**Fayl:** `packages/shared/src/schemas.ts`
- `registerSchema`dan `role` maydoni butunlay olib tashlanadi (serverda hardcoded `USER`).
- `expertReviewSchema` o'chiriladi.
- Qo'shiladi: `mineSchema` (`name`, `description?`, `location`, `rawMaterialType`, `volume` — barchasi Uzbek xato xabarlari bilan, `LIMITS`ga mos), `wasteSchema` (`factoryName`, `composition`, `volume`, `annualVolume`, `description?`), `createAdminSchema` (`name`, `email`, `phone`, `password`, `organization?`).

**Fayl:** `packages/shared/src/types.ts`
- `PublicUser`/`AuthUser` — o'zgarmaydi (role tipi avtomatik yangilanadi).
- Qo'shiladi: `MineListItem`, `MineDetail`, `WasteListItem`, `WasteDetail` (rasm array: `{ id, url }[]`), `CreateAdminInput`.
- `PublicStats`: `totalCompanies→totalAdmins`, `totalScientists→totalUsers` (nomlar), `AdminStats` (yangi, admin.routes javobiga mos: `totalUsers, totalAdmins, openProblems, totalProposals, acceptedProposals, blockedUsers, totalMines, totalWaste`).

**Fayl:** `packages/shared/src/constants.ts`
- Qo'shiladi: `MINE_LIMITS`/`WASTE_LIMITS` (`NAME_MIN/MAX` va h.k., mavjud `LIMITS` patterni bo'yicha), `GALLERY_MAX_IMAGES = 6`.

Tekshiruv: `npm run build --workspace=packages/shared` xatosiz o'tishi kerak.

---

## Bosqich 2 — Prisma sxema va migratsiya

**Fayl:** `apps/api/prisma/schema.prisma`
- `Role` enumidan `COMPANY→ADMIN`, `SCIENTIST→USER`, eski `ADMIN→SUPERADMIN`, `EXPERT` qatori o'chiriladi (Prisma enum'da qiymat butunlay olib tashlanadi — DBda qoladigan eski qiymatlar migratsiya bilan boshqa qiymatga o'tkaziladi, shuning uchun xavfsiz).
- `ProposalStatus`dan `EXPERT_APPROVED` o'chiriladi, `Proposal.reviewedById`/`reviewedAt` maydonlari va `ReviewedProposals` relation o'chiriladi.
- Spec §2dagi `Mine`, `MineImage`, `Waste`, `WasteImage` modellari qo'shiladi, `User`ga `mines Mine[]`, `wastes Waste[]` relation qo'shiladi.

**Migratsiya** — `npx prisma migrate dev --name role_redesign_mines_waste --create-only` bilan bo'sh migratsiya yaratiladi, so'ng generatsiya qilingan SQL boshiga quyidagi qo'lda yozilgan bloklar qo'shiladi (enum qiymatlarini yo'qotishdan oldin ma'lumotni ko'chirish shart, aks holda Postgres "enum qiymati ishlatilmoqda" xatosini beradi):

```sql
-- 1) Enum qiymatlarini almashtirish (avval string sifatida saqlab, keyin qayta yozamiz)
ALTER TABLE "proposals" ADD COLUMN "status_tmp" TEXT;
UPDATE "proposals" SET "status_tmp" = CASE WHEN "status" = 'EXPERT_APPROVED' THEN 'PENDING' ELSE "status"::text END;

ALTER TABLE "users" ADD COLUMN "role_tmp" TEXT;
UPDATE "users" SET "role_tmp" = CASE
  WHEN "role" = 'ADMIN' THEN 'SUPERADMIN'
  WHEN "role" = 'COMPANY' THEN 'ADMIN'
  WHEN "role" = 'SCIENTIST' THEN 'USER'
  WHEN "role" = 'EXPERT' THEN 'USER'
  ELSE "role"::text
END;

ALTER TABLE "proposals" DROP COLUMN "reviewedById";
ALTER TABLE "proposals" DROP COLUMN "reviewedAt";
ALTER TABLE "proposals" DROP COLUMN "status";
ALTER TABLE "users" DROP COLUMN "role";

DROP TYPE "ProposalStatus";
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');
DROP TYPE "Role";
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'ADMIN', 'USER');

ALTER TABLE "proposals" ADD COLUMN "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING';
UPDATE "proposals" SET "status" = "status_tmp"::"ProposalStatus";
ALTER TABLE "proposals" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "proposals" DROP COLUMN "status_tmp";

ALTER TABLE "users" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER';
UPDATE "users" SET "role" = "role_tmp"::"Role";
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" DROP COLUMN "role_tmp";

-- 2) Mine/Waste jadvallari (schema.prisma'dagi model ta'rifidan Prisma generatsiya qiladigan CREATE TABLE bloklari shu yerda davom etadi)
```

`prisma migrate dev` avtomatik generatsiya qiladigan `CREATE TABLE "mines"...`, `CREATE TABLE "waste"...` va indekslar bloklarini shu faylning davomiga qoldirish kifoya (bo'sh migratsiyani `--create-only` bilan ochgandan keyin Prisma o'zi diff asosida bu qismlarni yozadi, yuqoridagi qo'lda yozilgan qism birinchi bo'lib qo'yiladi).

Tekshiruv: `npm run db:migrate:dev --workspace=apps/api` (yoki `prisma migrate dev`) lokal bazada xatosiz o'tishi, `npx prisma studio`da eski COMPANY/SCIENTIST foydalanuvchilar endi ADMIN/USER ko'rinishi kerak.

---

## Bosqich 3 — Seed

**Fayl:** `apps/api/prisma/seed.ts`
- `Role.ADMIN` (superadmin upsert) → `Role.SUPERADMIN`.
- `companyA/companyB` → `Role.ADMIN` bilan yaratiladi (o'zgarmaydi, faqat enum qiymati).
- `scientist1..3` → `Role.USER`.
- Yangi: 2–3 ta namunaviy `Mine` (masalan "Toshkoni — Qibray tumani", "Ohaykoni — Zomin tumani", `adminId: companyA.id`), 2 ta namunaviy `Waste` (`factoryName`, `adminId: companyB.id`), rasmsiz (`images: []`) — MVP uchun yetarli.
- Konsol chiqishiga yangi login ma'lumotlari yoziladi (`Superadmin:`, `Admin A/B:`, `User 1-3:`).

Tekshiruv: `npm run db:seed --workspace=apps/api` xatosiz ishlaydi.

---

## Bosqich 4 — Backend: auth va rol nomlari

**Fayl:** `apps/api/src/modules/auth/auth.routes.ts`
- `GET /init-admin` handler **butunlay o'chiriladi** (import qatoridagi endi kerak bo'lmagan `hashPassword` chaqiruvi ham).

**Fayl:** `apps/api/src/modules/auth/auth.service.ts`
- `registerUser`: `data.role: input.role` → `data.role: "USER"` (hardcoded, `RegisterInput`dan `role` olib tashlangani uchun avtomatik mos keladi).

**Fayl:** `apps/api/src/modules/problems/problems.routes.ts`
- Barcha `requireRole("COMPANY")` → `requireRole("ADMIN")`.

**Fayl:** `apps/api/src/modules/proposals/proposals.routes.ts`
- `requireRole("COMPANY")` → `requireRole("ADMIN")`, `requireRole("SCIENTIST")` → `requireRole("USER")`.
- `/proposals/expert` va `/proposals/:proposalId/expert-review` route'lari **o'chiriladi**.
- `accept` handleridagi `if (proposal.status !== "EXPERT_APPROVED")` → `if (proposal.status !== "PENDING")` ("Faqat kutilayotgan takliflarni qabul qilish mumkin." xabari bilan).
- `withdraw` handleridagi `proposal.status !== "PENDING" && proposal.status !== "EXPERT_APPROVED"` → faqat `proposal.status !== "PENDING"`.
- `expertReviewSchema` importi olib tashlanadi.

**Fayl:** `apps/api/src/modules/admin/admin.routes.ts`
- `adminRouter.use(requireAuth, requireRole("ADMIN"))` → `requireRole("SUPERADMIN")`.
- `/stats`: `totalCompanies/totalScientists` → `totalAdmins` (`role: "ADMIN"`), `totalUsers` (`role: "USER"`) hisoblovchi so'rovlar; qo'shiladi `totalMines: prisma.mine.count({ where: { deletedAt: null } })`, `totalWaste: prisma.waste.count({ where: { deletedAt: null } })`.
- **Yangi endpoint** `POST /admin/admins`:
```ts
adminRouter.post(
  "/admins",
  validateBody(createAdminSchema),
  asyncHandler(async (req, res) => {
    const email = req.body.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw AppError.unprocessable("Bu email allaqachon mavjud.", { email: ["Bu email allaqachon mavjud."] });
    const created = await prisma.user.create({
      data: {
        role: "ADMIN",
        name: req.body.name,
        email,
        phone: normalizePhone(req.body.phone),
        passwordHash: await hashPassword(req.body.password),
        organization: req.body.organization || null,
        status: "ACTIVE",
      },
    });
    ok(res, toAuthUser(created), 201);
  })
);
```
(kerakli importlar: `hashPassword` — `../../utils/password.js`, `normalizePhone` — `../../utils/phone.js`, `createAdminSchema` — `@buildscience/shared`)
- **Yangi:** `GET /admin/mines`, `DELETE /admin/mines/:mineId`, `GET /admin/waste`, `DELETE /admin/waste/:wasteId` — mavjud `/admin/problems`/`/admin/problems/:id` patterni bo'yicha (pagination, soft-delete).

**Fayl:** `apps/api/src/modules/public/public.routes.ts`
- `totalCompanies/totalScientists` → `totalAdmins`/`totalUsers` (rol qiymatlari `"ADMIN"`/`"USER"`).

Tekshiruv: `npm run typecheck --workspace=apps/api` — barcha `requireRole("COMPANY"|"SCIENTIST"|"EXPERT")` qoldiqlarini TypeScript enum xatosi sifatida ko'rsatadi (`Role` tipi endi bu qiymatlarni qabul qilmaydi) — shu signal orqali qolganlarini topish mumkin: `grep -rn 'COMPANY\|SCIENTIST\|"EXPERT"' apps/api/src`.

---

## Bosqich 5 — Backend: Mine/Waste modullari

**Fayl:** `apps/api/src/middleware/upload.ts`
- Qo'shiladi `uploadPublicRoot = path.resolve(uploadRoot, "public")` (mkdir agar yo'q bo'lsa).
- Qo'shiladi `handleGalleryUpload` — `multer({ storage: publicStorage, fileFilter, limits }).array("images", GALLERY_MAX_IMAGES)`, xatolarni xuddi `handleProposalUpload` kabi qayta ishlaydi (`INVALID_FILE_TYPE`, `LIMIT_FILE_SIZE`, qo'shimcha `LIMIT_UNEXPECTED_FILE` → "Bittada 6 tadan ortiq rasm yuklab bo'lmaydi.").

**Fayl:** `apps/api/src/app.ts`
- Qo'shiladi: `app.use("/uploads/public", express.static(uploadPublicRoot))` (auth'siz, `uploadPublicRoot`ni `upload.ts`dan eksport qilish orqali).

**Fayl (yangi):** `apps/api/src/modules/mines/mines.serializers.ts`
```ts
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
```
(`env.publicUploadBaseUrl` — bosqich 6da qo'shiladi, oddiy `"/uploads/public"`.)

**Fayl (yangi):** `apps/api/src/modules/mines/mines.routes.ts`
```ts
import { Router } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { mineSchema, paginationQuerySchema } from "@buildscience/shared";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import { handleGalleryUpload, uploadPublicRoot } from "../../middleware/upload.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, paginate } from "../../utils/response.js";
import { AppError } from "../../utils/AppError.js";
import { prisma } from "../../services/prisma.js";
import { toMineDetail, toMineListItem } from "./mines.serializers.js";

export const minesRouter = Router();
const include = { admin: true, images: { orderBy: { sortOrder: "asc" as const } } };

minesRouter.get(
  "/mines",
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req, res) => {
    const { search, page, pageSize } = paginationQuerySchema.parse(req.query);
    const where = { deletedAt: null, ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}) };
    const [mines, total] = await Promise.all([
      prisma.mine.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include }),
      prisma.mine.count({ where }),
    ]);
    ok(res, paginate(mines.map(toMineListItem), page, pageSize, total));
  })
);

minesRouter.get(
  "/mines/:mineId",
  asyncHandler(async (req, res) => {
    const mine = await prisma.mine.findFirst({ where: { id: req.params.mineId, deletedAt: null }, include });
    if (!mine) throw AppError.notFound("Kon topilmadi.");
    ok(res, toMineDetail(mine));
  })
);

minesRouter.get(
  "/admin/mines",
  requireAuth,
  requireRole("ADMIN"),
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = paginationQuerySchema.parse(req.query);
    const where = { deletedAt: null, adminId: req.user!.id };
    const [mines, total] = await Promise.all([
      prisma.mine.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include }),
      prisma.mine.count({ where }),
    ]);
    ok(res, paginate(mines.map(toMineListItem), page, pageSize, total));
  })
);

minesRouter.post(
  "/admin/mines",
  requireAuth,
  requireRole("ADMIN"),
  handleGalleryUpload,
  asyncHandler(async (req, res) => {
    const parsed = mineSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) errors[issue.path.join(".") || "form"] = [issue.message];
      throw AppError.unprocessable("Kiritilgan ma'lumotlarda xatolik bor.", errors);
    }
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const mine = await prisma.mine.create({
      data: {
        adminId: req.user!.id,
        ...parsed.data,
        images: { create: files.map((f, i) => ({ storedName: f.filename, originalName: f.originalname, mimeType: f.mimetype, size: f.size, sortOrder: i })) },
      },
      include,
    });
    ok(res, toMineDetail(mine), 201);
  })
);

minesRouter.delete(
  "/admin/mines/:mineId",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const mine = await prisma.mine.findFirst({ where: { id: req.params.mineId, deletedAt: null }, include: { images: true } });
    if (!mine) throw AppError.notFound("Kon topilmadi.");
    if (mine.adminId !== req.user!.id) throw AppError.forbidden();
    await prisma.mine.update({ where: { id: mine.id }, data: { deletedAt: new Date() } });
    await Promise.all(mine.images.map((img) => fs.unlink(path.join(uploadPublicRoot, img.storedName)).catch(() => undefined)));
    res.status(204).send();
  })
);
```

**Fayl (yangi):** `apps/api/src/modules/waste/waste.serializers.ts`, `waste.routes.ts` — yuqoridagi ikkita fayl bilan **bir xil struktura**, quyidagi almashtirishlar bilan: `Mine→Waste`, `mine→waste`, `mineSchema→wasteSchema`, maydonlar `name/location/rawMaterialType/volume` → `factoryName/composition/volume/annualVolume`, route prefiksi `/waste`, `/admin/waste`.

**Fayl:** `apps/api/src/config/env.ts`
- Qo'shiladi: `publicUploadBaseUrl: process.env.PUBLIC_UPLOAD_BASE_URL ?? "/uploads/public"`.

**Fayl:** `apps/api/src/app.ts`
- `minesRouter`, `wasteRouter` import qilinadi, `app.use("/api", minesRouter)`, `app.use("/api", wasteRouter)` qo'shiladi (`problemsRouter`dan keyin).

**Fayl:** `apps/api/src/middleware/admin.routes.ts` ichidagi mines/waste moderatsiya endpointlari (bosqich 4da qayd etilgan) shu modullardagi serializer'larni import qiladi.

Tekshiruv: `npm run typecheck --workspace=apps/api`, keyin `curl localhost:4000/api/mines` bo'sh ro'yxat qaytarishi kerak (auth'siz).

---

## Bosqich 6 — Xavfsizlik/kichik tuzatishlar

**Fayl:** `apps/api/src/middleware/error.ts`
- `if (!env.isProduction) console.error(err);` → shartsiz `console.error(err);`.

---

## Bosqich 7 — Frontend: rol o'zgarishi va marshrutlar

**Fayl:** `apps/web/src/routes/paths.ts`
```ts
export function dashboardPathForRole(role: Role): string {
  switch (role) {
    case "ADMIN": return "/app/admin";
    case "USER": return "/app/user";
    case "SUPERADMIN": return "/superadmin";
  }
}
```

**Fayl:** `apps/web/src/routes/guards.tsx` — o'zgarmaydi (rol nomlarini `App.tsx`da beriladi).

**Papka qayta nomlash** (git tarixi saqlanishi uchun `git mv`):
```bash
git mv apps/web/src/pages/company apps/web/src/pages/admin_firm_tmp
git mv apps/web/src/pages/admin apps/web/src/pages/superadmin
git mv apps/web/src/pages/admin_firm_tmp apps/web/src/pages/admin
git mv apps/web/src/pages/scientist apps/web/src/pages/user
git rm -r apps/web/src/pages/expert
```
(oraliq `admin_firm_tmp` nomi ikki papka bir-birini ustiga yozib yubormasligi uchun kerak.)

Fayl ichidagi nomlar: `CompanyDashboardPage→AdminDashboardPage`, `CompanyProblemsPage→AdminProblemsPage` (⚠️ eski `pages/admin/AdminProblemsPage.tsx` ham bor edi — u endi `pages/superadmin/AdminProblemsPage.tsx`, nom to'qnashmaydi chunki boshqa papkada; ammo ikkalasi bir xil komponent nomida bo'lmasligi uchun `pages/superadmin/*` fayllar `SuperAdmin` prefiksi bilan qayta nomlanadi: `AdminDashboardPage→SuperAdminDashboardPage`, `AdminUsersPage→SuperAdminUsersPage`, `AdminProblemsPage→SuperAdminProblemsPage`, `AdminProposalsPage→SuperAdminProposalsPage`), `ScientistDashboardPage→UserDashboardPage`, `ScientistProposalsPage→UserProposalsPage`.

Har bir ko'chirilgan faylda: komponent export nomi, ichidagi matn ("Korxona"→"Firma" kerak bo'lsa), va `requireRole` massivlaridagi qiymatlar (`App.tsx`da markazlashgan, quyida) yangilanadi.

**Fayl:** `apps/web/src/App.tsx` — route daraxti:
```tsx
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const AdminProblemsPage = lazy(() => import("@/pages/admin/AdminProblemsPage"));
const AdminProblemFormPage = lazy(() => import("@/pages/admin/AdminProblemFormPage"));
const AdminProblemProposalsPage = lazy(() => import("@/pages/admin/AdminProblemProposalsPage"));
const AdminProposalsPage = lazy(() => import("@/pages/admin/AdminProposalsPage"));
const AdminMinesPage = lazy(() => import("@/pages/admin/AdminMinesPage"));
const AdminMineFormPage = lazy(() => import("@/pages/admin/AdminMineFormPage"));
const AdminWastePage = lazy(() => import("@/pages/admin/AdminWastePage"));
const AdminWasteFormPage = lazy(() => import("@/pages/admin/AdminWasteFormPage"));

const UserDashboardPage = lazy(() => import("@/pages/user/UserDashboardPage"));
const UserProposalsPage = lazy(() => import("@/pages/user/UserProposalsPage"));

const MinesListPage = lazy(() => import("@/pages/MinesListPage"));
const MineDetailPage = lazy(() => import("@/pages/MineDetailPage"));
const WasteListPage = lazy(() => import("@/pages/WasteListPage"));
const WasteDetailPage = lazy(() => import("@/pages/WasteDetailPage"));

const SuperAdminDashboardPage = lazy(() => import("@/pages/superadmin/SuperAdminDashboardPage"));
const SuperAdminUsersPage = lazy(() => import("@/pages/superadmin/SuperAdminUsersPage"));
const SuperAdminAdminsPage = lazy(() => import("@/pages/superadmin/SuperAdminAdminsPage"));
const SuperAdminProblemsPage = lazy(() => import("@/pages/superadmin/SuperAdminProblemsPage"));
const SuperAdminProposalsPage = lazy(() => import("@/pages/superadmin/SuperAdminProposalsPage"));
const SuperAdminMinesPage = lazy(() => import("@/pages/superadmin/SuperAdminMinesPage"));
const SuperAdminWastePage = lazy(() => import("@/pages/superadmin/SuperAdminWastePage"));
```
Public route'larga qo'shiladi: `<Route path="/mines" element={<MinesListPage />} />`, `<Route path="/mines/:mineId" element={<MineDetailPage />} />`, `<Route path="/waste" element={<WasteListPage />} />`, `<Route path="/waste/:wasteId" element={<WasteDetailPage />} />`.
`RequireRole roles={["COMPANY"]}` → `["ADMIN"]` (+ mines/waste/problems path'lari `/app/admin/...` prefiksi bilan), `roles={["SCIENTIST"]}` → `["USER"]` (`/app/user/...`), `roles={["EXPERT"]}` bloki **o'chiriladi**, `roles={["ADMIN"]}` (eski platforma admin) → `roles={["SUPERADMIN"]}`, path'lar `/admin/*` → `/superadmin/*`, + `/superadmin/admins`, `/superadmin/mines`, `/superadmin/waste`.

**Fayl:** `apps/web/src/pages/RegisterPage.tsx`
- Rol tanlash `<div role="radiogroup">` bloki (Korxona/Olim/Ekspert tugmalari) va `selectRole`/`role` state **o'chiriladi**.
- `defaultValues: { role: initialRole }` → olib tashlanadi (`registerSchema`da `role` yo'q endi).
- Mutaxassislik/OTM maydonlari shart holatsiz (`role === "SCIENTIST"` sharti) — endi har doim ko'rsatiladi (USER uchun ixtiyoriy maydon sifatida).

Tekshiruv: `npm run typecheck --workspace=apps/web` — qolgan `"COMPANY"|"SCIENTIST"|"EXPERT"` satrlarini `grep -rn '"COMPANY"\|"SCIENTIST"\|"EXPERT"' apps/web/src` bilan topib tozalash.

---

## Bosqich 8 — Frontend: Mine/Waste sahifalari

**Fayl (yangi):** `apps/web/src/components/ui/GalleryUploader.tsx` — `FileUploader.tsx` patterni bo'yicha, `files: File[]`, `onChange: (files: File[]) => void`, max 6 ta, önizleme thumbnail grid (`URL.createObjectURL`).

**Fayl (yangi):** `apps/web/src/features/mines/hooks.ts` — `useMines(filters)`, `useMine(id)`, `useAdminMines(page)`, `useCreateMine()` (FormData: `postForm`), `useDeleteMine()` — `useProblems`/`useCompanyProblems` hooks patterni bo'yicha to'liq kod.

**Fayl (yangi):** `apps/web/src/features/waste/hooks.ts` — xuddi shu struktura, `waste` endpointlari bilan.

**Fayl (yangi):** `apps/web/src/pages/MinesListPage.tsx` — `ProblemsListPage.tsx` bilan bir xil struktura (search + pagination, `ProblemCard` o'rniga yangi `MineCard`), auth talab qilinmaydi.
**Fayl (yangi):** `apps/web/src/pages/MineDetailPage.tsx` — `ProblemDetailPage.tsx`ning ochiq (auth'siz) qismi patterni bo'yicha: rasm galereyasi, joylashuv, xomashyo turi, hajm, "E'lon beruvchi: {adminName}".
**Fayl (yangi):** `apps/web/src/components/mines/MineCard.tsx` — `ProblemCard.tsx` patterni bo'yicha.

**Fayl (yangi):** `apps/web/src/pages/WasteListPage.tsx`, `WasteDetailPage.tsx`, `apps/web/src/components/waste/WasteCard.tsx` — Mine bilan bir xil struktura, Waste maydonlari bilan.

**Fayl (yangi):** `apps/web/src/pages/admin/AdminMinesPage.tsx` (ro'yxat + o'chirish, `AdminUsersPage.tsx` jadval patterni), `AdminMineFormPage.tsx` (`CompanyProblemFormPage.tsx` forma patterni, `GalleryUploader` bilan) — Waste uchun ham bir xil ikkita fayl.

**Fayl (yangi):** `apps/web/src/pages/superadmin/SuperAdminAdminsPage.tsx` — forma (`createAdminSchema` + `zodResolver`, `name/email/phone/organization/password` maydonlari) + yaratilgan ADMIN'lar ro'yxati (`useAdminUsers({ role: "ADMIN" })` mavjud hookdan foydalanish mumkin).

**Fayl:** `apps/web/src/components/layout/Header.tsx`, `apps/web/src/pages/LandingPage.tsx` — navigatsiyaga "Konlar" (`/mines`) va "Chiqindi" (`/waste`) linklari qo'shiladi.

Tekshiruv: `npm run build --workspace=apps/web` xatosiz o'tishi kerak.

---

## Bosqich 9 — Testlar

**Fayl:** `apps/api/tests/helpers.ts` — `registerCompany→registerAdmin` (rol server tomonidan yaratilgani uchun endi `POST /admin/admins` orqali, superadmin agent talab qiladi — yoki oddiylik uchun to'g'ridan-to'g'ri `prisma.user.create` bilan test yordamchisi), `registerScientist→registerUser` (`role` maydonisiz `POST /auth/register`).
**Fayllar:** `accept.test.ts`, `admin.test.ts`, `attachment.test.ts`, `auth.test.ts`, `problems.test.ts`, `proposals.test.ts` — `role: "COMPANY"/"SCIENTIST"` satrlari yangi helper funksiyalarga moslashtiriladi, `EXPERT_APPROVED` bilan bog'liq testlar o'chiriladi.
**Yangi:** `apps/api/tests/mines.test.ts` — CRUD + ownership (boshqa ADMIN kon o'chira olmasligi) + public GET auth'siz ishlashi.
**Yangi:** `apps/api/tests/superadmin.test.ts` — `POST /admin/admins` faqat SUPERADMIN uchun, yaratilgan ADMIN login qila olishi.

**Fayl:** `apps/web/src/pages/RegisterPage.test.tsx` — rol tanlash testlari o'chiriladi/yangilanadi (endi rol tanlanmaydi).
**Fayl:** `apps/web/src/routes/guards.test.tsx` — yangi rol nomlari bilan yangilanadi.

Tekshiruv: `npm run test` (root) — barcha workspace testlari o'tishi kerak.

---

## Yakuniy tekshiruv

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```
