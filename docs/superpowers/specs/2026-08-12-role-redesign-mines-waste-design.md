# Rol qayta qurilishi + Konlar/Chiqindi — dizayn

Sana: 2026-08-12

## Maqsad

Platformani uch rolga soddalashtirish (SUPERADMIN / ADMIN / USER), firma
akkauntlarini faqat SUPERADMIN yarata oladigan qilish, EXPERT bosqichini
bekor qilish, va ikkita yangi ochiq katalog — Konlar (Mines) va Chiqindi
(Waste) — qo'shish. Shu bilan bir qatorda oldingi auditda topilgan
xavfsizlik/mantiq kamchiliklari tuzatiladi.

## 1. Rollar (1:1 rename, migratsiya bilan)

| Eski qiymat | Yangi qiymat | Ma'no |
|---|---|---|
| `ADMIN` | `SUPERADMIN` | Hokimiyat: ADMIN yaratadi, hamma narsani moderatsiya qiladi |
| `COMPANY` | `ADMIN` | Firma akkaunti — faqat SUPERADMIN yaratadi, ochiq ro'yxatdan o'tish yo'q |
| `SCIENTIST` | `USER` | Yagona ochiq ro'yxatdan o'tuvchi rol (professor/talaba/h.k.) |
| `EXPERT` | *(olib tashlanadi, enum qiymati o'chirilmaydi, ishlatilmaydi)* | — |

`Problem.companyId`/`company` maydon nomlari **o'zgarmaydi** — semantik jihatdan
hali ham "firma"ga tegishli, faqat Role qiymati endi `ADMIN`. Bu nom
o'zgarishini minimal diff bilan amalga oshiradi.

`ProposalStatus.EXPERT_APPROVED`, `Proposal.reviewedById`, `Proposal.reviewedAt`
— ishlatilmay qoladi (enum qiymati/ustun o'chirilmaydi, kod ular bilan
ishlamaydi). Taklif qabul qilish yana to'g'ridan-to'g'ri `PENDING → ACCEPTED`
bo'ladi (ekspert bosqichisiz) — bu avvalgi "sibling proposal reject
bo'lmaydi" bugini avtomatik yo'q qiladi, chunki oraliq status ishlatilmaydi.

## 2. Yangi modellar

```prisma
model Mine {
  id             String    @id @default(uuid())
  adminId        String
  admin          User      @relation(fields: [adminId], references: [id])
  name           String
  description    String?
  location       String
  rawMaterialType String
  volume         String
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?
  images         MineImage[]

  @@index([adminId])
  @@index([createdAt])
  @@map("mines")
}

model MineImage {
  id            String   @id @default(uuid())
  mineId        String
  mine          Mine     @relation(fields: [mineId], references: [id], onDelete: Cascade)
  storedName    String
  originalName  String
  mimeType      String
  size          Int
  sortOrder     Int      @default(0)
  createdAt     DateTime @default(now())

  @@index([mineId])
  @@map("mine_images")
}

model Waste {
  id            String    @id @default(uuid())
  adminId       String
  admin         User      @relation(fields: [adminId], references: [id])
  factoryName   String
  composition   String
  volume        String
  annualVolume  String
  description   String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?
  images        WasteImage[]

  @@index([adminId])
  @@index([createdAt])
  @@map("waste")
}

model WasteImage {
  id            String   @id @default(uuid())
  wasteId       String
  waste         Waste    @relation(fields: [wasteId], references: [id], onDelete: Cascade)
  storedName    String
  originalName  String
  mimeType      String
  size          Int
  sortOrder     Int      @default(0)
  createdAt     DateTime @default(now())

  @@index([wasteId])
  @@map("waste_images")
}
```

Hajm/miqdor maydonlari erkin matn (`String`) — o'lchov birligi turlicha
bo'lgani uchun struktura kiritilmaydi (YAGNI). Rasm — galereya, max 6
ta/e'lon, mavjud `UPLOAD.ALLOWED_MIME_TYPES`/hajm cheklovi bilan.

## 3. Backend API

### Auth
- `POST /auth/register` — `role` client'dan e'tiborga olinmaydi, server
  har doim `role: "USER"` bilan yaratadi. `registerSchema`dan `role` maydoni
  olib tashlanadi.
- `GET /auth/init-admin` — **o'chiriladi**. Birinchi SUPERADMIN faqat
  `prisma/seed.ts` orqali (mavjud `ADMIN_*` env) yaratiladi.

### SUPERADMIN (`/api/admin`, `requireRole("SUPERADMIN")`)
- Mavjud: users/problems/proposals ro'yxat, block/delete, statistika —
  saqlanadi (rol nomi yangilanadi).
- **Yangi:** `POST /admin/admins` — `{ name, email, phone, password,
  organization? }`, `role: "ADMIN"` bilan foydalanuvchi yaratadi (parolni
  SUPERADMIN o'zi kiritadi, min 8 belgi).
- **Yangi:** `GET/DELETE /admin/mines`, `GET/DELETE /admin/waste` —
  moderatsiya (soft-delete), mavjud problems/proposals patterni bo'yicha.
- `GET /admin/stats` — `totalAdmins`, `totalMines`, `totalWaste` qo'shiladi.

### ADMIN (firma) — mavjud `problemsRouter`/`proposalsRouter`
- `requireRole("COMPANY")` → `requireRole("ADMIN")` (string almashtirish,
  logika bir xil).
- `POST /proposals/:id/accept` — endi `proposal.status !== "PENDING"`
  tekshiradi (EXPERT_APPROVED emas).
- `POST /problems/:id/close` va accept'dagi sibling-reject so'rovlari
  o'zgarishsiz qoladi (`status: "PENDING"` yetarli, chunki oraliq status yo'q).
- **Yangi:** `mines.routes.ts` — `GET/POST /mines` (o'zi ro'yxatdan
  o'tgan/yaratilgan holda), `GET/PATCH/DELETE /mines/:id` (faqat
  `adminId === req.user.id`), rasm upload/delete sub-route'lari.
- **Yangi:** `waste.routes.ts` — xuddi shunday Waste uchun.

### Ochiq (mehmon, auth shart emas)
- `GET /problems`, `GET /problems/:id` — mavjud.
- **Yangi:** `GET /mines`, `GET /mines/:id`, `GET /waste`, `GET /waste/:id`
  — pagination/search, `problems.routes.ts` patterni bo'yicha.
- Rasm fayllari `express.static` orqali `/uploads/public/...`dan auth'siz
  beriladi (proposal-attachment'dan farqli — bu ochiq katalog rasmlari).

### USER
- `/problems/:id/proposals` POST/PATCH/withdraw — `requireRole("SCIENTIST")`
  → `requireRole("USER")`, logika o'zgarmaydi.
- `/proposals/expert`, `/proposals/:id/expert-review` — **o'chiriladi**.

## 4. Frontend

- `RegisterPage` — rol tanlash tugmalari (Korxona/Olim/Ekspert) o'chiriladi.
  Forma: ism, email, telefon, ixtiyoriy mutaxassislik/OTM, parol — har doim
  `USER` yaratadi.
- `dashboardPathForRole`: `SUPERADMIN→/superadmin`, `ADMIN→/app/admin`,
  `USER→/app/user`.
- Papka/sahifa qayta nomlanishi:
  - `pages/company/*` → `pages/admin/*` (Muammolarim, Konlarim,
    Chiqindilarim, Kelgan takliflar).
  - `pages/admin/*` (eski platforma admin) → `pages/superadmin/*` + yangi
    "Admin (firma) qo'shish" formasi + Mines/Waste moderatsiya jadvali.
  - `pages/scientist/*` → `pages/user/*`.
  - `pages/expert/*` — o'chiriladi.
- Yangi ochiq sahifalar: `MinesListPage`/`MineDetailPage`,
  `WasteListPage`/`WasteDetailPage` — `ProblemsListPage`/`ProblemDetailPage`
  patterni bo'yicha, rasm galereyasi bilan.
- `LandingPage`/navigatsiyaga "Konlar"/"Chiqindi" bo'limlari qo'shiladi.
- `guards.tsx`, `App.tsx` route daraxti yangi rol nomlariga yangilanadi.

## 5. Migratsiya (bitta Prisma migration, raw SQL)

```sql
ALTER TYPE "Role" RENAME VALUE 'ADMIN' TO 'SUPERADMIN';
ALTER TYPE "Role" RENAME VALUE 'COMPANY' TO 'ADMIN';
ALTER TYPE "Role" RENAME VALUE 'SCIENTIST' TO 'USER';
UPDATE "users" SET role = 'USER' WHERE role = 'EXPERT';
UPDATE "proposals" SET status = 'PENDING' WHERE status = 'EXPERT_APPROVED';
```

`EXPERT`/`EXPERT_APPROVED` enum qiymatlari Postgres'da qoladi, lekin
ishlatilmaydi (qiymatni butunlay o'chirish enum recreate talab qiladi —
keyinroq alohida migratsiyada qilinishi mumkin).

`seed.ts` yangilanadi: admin upsert endi `role: SUPERADMIN`, namunaviy
COMPANY/SCIENTIST foydalanuvchilar `ADMIN`/`USER` sifatida yaratiladi,
namunaviy Mine/Waste yozuvlari qo'shiladi.

## 6. Shu bilan bir qatorda tuzatiladigan xavfsizlik/bug topilmalari

- `init-admin` o'chirilishi (P0).
- EXPERT o'chirilishi bilan sibling-reject bugi va EXPERT
  self-registration muammosi avtomatik hal bo'ladi.
- `errorHandler` — production'da ham `console.error` chaqiriladi.
- Yangi Mine/Waste rasm upload'lari mavjud MIME/hajm tekshiruvidan
  o'tkaziladi.

## Testlar

Mavjud `apps/api/tests` (vitest) va `apps/web` component testlari
patterniga qo'shiladi: rol tekshiruvlari (SUPERADMIN/ADMIN/USER route
guard), `accept` endpointning PENDING talab qilishi, admin-yaratish
endpointi, mine/waste CRUD + ownership tekshiruvi. Frontend'da mavjud
`RegisterPage.test.tsx`/`guards.test.tsx` yangilanadi.
