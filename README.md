# BuildScience

BuildScience — qurilish sohasidagi muammolar, xomashyo konlari va ishlab chiqarish chiqindilarini bir joyda
ko'rsatadigan raqamli platforma (MVP). Firmalar muammo joylashtiradi, foydalanuvchilar taklif yuboradi, firma bitta
taklifni qabul qiladi va tomonlarning kontakt ma'lumotlari faqat shundan keyin ochiladi. Shartnoma, to'lov va loyiha
ijrosi platformadan tashqarida amalga oshiriladi.

## Rollar

- **SUPERADMIN** (hokimiyat) — faqat seed orqali yaratiladi. ADMIN (firma) akkauntlarini yaratadi, barcha
  foydalanuvchi/muammo/taklif/kon/chiqindi ma'lumotlarini moderatsiya qiladi.
- **ADMIN** (firma) — faqat SUPERADMIN tomonidan yaratiladi, ochiq ro'yxatdan o'tish yo'q. O'z muammolarini, kon va
  chiqindi e'lonlarini joylashtiradi, kelgan takliflarni qabul/rad etadi.
- **USER** (oddiy foydalanuvchi — professor, talaba va h.k.) — ochiq ro'yxatdan o'tadigan yagona rol. Muammolarga
  taklif yuboradi.
- Ro'yxatdan o'tmagan mehmon ham Muammolar, Konlar va Chiqindi bo'limlarini to'liq ko'ra oladi.

## Xususiyatlar

- Muammolar bank: yaratish, tahrirlash, yopish, o'chirish (faqat takliflar bo'lmasa), qidiruv/filtr/saralash.
- Konlar katalogi: kon nomi, joylashuvi, xomashyo turi, hajmi, rasm galereyasi — hammaga ochiq.
- Chiqindi e'lonlari: zavod nomi, tarkibi, hajmi/yillik hajmi, rasm galereyasi — hammaga ochiq.
- Takliflar: yuborish, tahrirlash, bekor qilish, fayl biriktirish (PDF/JPG/PNG, 10 MB).
- Atomik taklif qabul qilish: bitta taklif ACCEPTED, qolganlari REJECTED, muammo MATCHED bo'ladi — race condition'siz.
- Kontakt maxfiyligi: email/telefon faqat taklif qabul qilingandan so'ng backend darajasida ochiladi.
- SUPERADMIN moderatsiya: foydalanuvchi/ADMIN boshqaruvi, muammo/taklif/kon/chiqindi spamini o'chirish.
- Cookie-based session autentifikatsiya (HttpOnly, PostgreSQL session store).

## Chetlab o'tilgan funksiyalar (MVP doirasidan tashqarida)

ScienceID/OneID, STIR tekshiruvi, SMS/email tasdiqlash, elektron raqamli imzo, ichki shartnomalar, onlayn to'lovlar,
grant boshqaruvi, chat, video qo'ng'iroqlar, push/SMS/email bildirishnomalar, AI tavsiyalar, ko'p tillilik, mobil
ilova, mikroservislar, Redis, navbat tizimlari, murakkab hisobotlar, dark mode va boshqalar.

## Texnologiyalar

**Frontend:** React, TypeScript (strict), Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form + Zod,
Motion for React, Lucide icons.

**Backend:** Node.js, Express, TypeScript (strict), PostgreSQL, Prisma ORM, Zod, express-session +
connect-pg-simple, bcrypt, Multer, Helmet, CORS, rate limiting.

## Loyiha tuzilishi

```
buildscience/
├── apps/
│   ├── web/     # React frontend
│   └── api/     # Express backend + Prisma
├── packages/
│   └── shared/  # umumiy enum/tip/validatsiya sxemalari
├── nginx/       # production reverse-proxy konfiguratsiyasi
└── docker-compose.yml
```

## Talablar

- Node.js 20+
- Docker va Docker Compose (PostgreSQL uchun tavsiya etiladi)

## O'rnatish (development)

```bash
cp .env.example .env
cp .env.example apps/api/.env      # Prisma CLI shu yerdan DATABASE_URL ni o'qiydi
docker compose up -d postgres      # faqat PostgreSQL konteynerini ishga tushiradi
npm install
npm run db:migrate                 # migratsiyalarni qo'llash
npm run db:seed                    # namunaviy ma'lumotlarni yuklash
npm run dev                        # backend (4000) + frontend (5174)
```

Frontend `http://localhost:5174` manzilida ishga tushadi va `/api` so'rovlarini Vite proxy orqali backendga
(`http://localhost:4000`) yo'naltiradi — cookie'lar shu sababli same-origin sifatida ishlaydi.

## Docker orqali to'liq ishga tushirish

```bash
cp .env.example .env
docker compose up -d --build
```

- Frontend (Nginx, same-origin `/api` proxy): `http://localhost:8080`
- Backend API to'g'ridan-to'g'ri: `http://localhost:4000`
- Konteyner ishga tushganda `prisma migrate deploy` avtomatik bajariladi. Seed'ni qo'lda ishga tushiring:

```bash
docker compose exec api npm run db:seed
```

## Muhit o'zgaruvchilari

| O'zgaruvchi | Tavsif |
|---|---|
| `NODE_ENV` | `development` yoki `production` |
| `PORT` | Backend porti (standart 4000) |
| `DATABASE_URL` | PostgreSQL ulanish satri |
| `SESSION_SECRET` | Session cookie imzolash uchun maxfiy kalit |
| `SESSION_COOKIE_NAME` | Session cookie nomi |
| `WEB_ORIGIN` | Frontend manzili (CORS uchun) |
| `UPLOAD_DIR` | Fayllar saqlanadigan papka |
| `MAX_UPLOAD_MB` | Maksimal fayl hajmi (MB) |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PHONE`, `ADMIN_PASSWORD` | Seed orqali yaratiladigan SUPERADMIN ma'lumotlari |
| `SEED_FORCE` | `production`da namunaviy muammo/taklif ma'lumotlarini majburan qayta yaratish uchun `1` qiymatini bering (standart holatda production'da bu qadam o'tkazib yuboriladi) |

## Buyruqlar

```bash
npm run dev              # frontend + backend (development)
npm run build             # shared → api → web build
npm run typecheck         # barcha workspace'larda TypeScript tekshiruvi
npm run lint               # ESLint
npm run test                # backend (Vitest + Supertest) va frontend (Vitest + Testing Library) testlari
npm run db:migrate          # Prisma migratsiyalarni qo'llash
npm run db:seed              # namunaviy ma'lumotlarni yuklash
```

## Testlar uchun alohida baza

Testlar development ma'lumotlar bazasiga tegmaydi — alohida `buildscience_test` bazasidan foydalanadi.
Birinchi marta sozlash:

```bash
docker exec -it <postgres-konteyner> psql -U buildscience -d postgres -c "CREATE DATABASE buildscience_test OWNER buildscience;"
cp apps/api/.env.test.example apps/api/.env.test
npm run test --workspace=apps/api   # pretest avtomatik migratsiya qiladi
```

`tests/setup.ts` `DATABASE_URL` tarkibida `_test` bo'lmasa ishga tushishni rad etadi — bu development bazani
tasodifan tozalashning oldini oladi.

## Demo akkauntlar (faqat development seed)

| Rol | Email | Parol |
|---|---|---|
| SUPERADMIN | `admin@buildscience.local` (yoki `.env` dagi `ADMIN_EMAIL`) | `.env` dagi `ADMIN_PASSWORD` |
| ADMIN (firma) | `qurilish-invest@buildscience.local` | `Company12345!` |
| ADMIN (firma) | `betonstroy@buildscience.local` | `Company12345!` |
| USER | `aziz.karimov@buildscience.local` | `Scientist12345!` |
| USER | `nodira.yusupova@buildscience.local` | `Scientist12345!` |
| USER | `bekzod.rahimov@buildscience.local` | `Scientist12345!` |

Production seed faqat SUPERADMIN yaratadi (ADMIN_EMAIL + ADMIN_PASSWORD majburiy). Demo akkauntlar prodga tushmaydi.

## Rol ruxsatlari (qisqacha)

- **ADMIN (firma)**: muammo/kon/chiqindi yaratish/tahrirlash/o'chirish (o'ziniki), o'z muammosiga kelgan takliflarni
  ko'rish va bittasini qabul qilish. Faqat SUPERADMIN tomonidan yaratiladi — ochiq ro'yxatdan o'tish yo'q.
- **USER**: ochiq muammolarni ko'rish, bitta muammoga bitta taklif yuborish, o'z PENDING taklifini tahrirlash/bekor
  qilish. Ochiq ro'yxatdan o'tadigan yagona rol.
- **SUPERADMIN**: ADMIN (firma) akkaunt yaratish, foydalanuvchi/muammo/taklif/kon/chiqindini ko'rish, bloklash,
  soft-delete qilish. Faqat seed orqali yaratiladi.

## API xaritasi

Barcha endpointlar `/api` prefiksi bilan boshlanadi.

- `GET /health` — API va DB holati
- `GET /auth/csrf` — CSRF token cookie
- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `PATCH /auth/profile`,
  `PATCH /auth/password`
- `GET /public/stats`
- `GET /problems`, `GET /problems/:id`, `POST /problems`, `PATCH /problems/:id`, `DELETE /problems/:id`,
  `POST /problems/:id/close`, `GET /company/problems`, `GET /company/stats`
- `POST /problems/:id/proposals`, `GET /problems/:id/proposals`, `GET /proposals/mine`, `GET /proposals/:id`,
  `PATCH /proposals/:id`, `POST /proposals/:id/withdraw`, `POST /proposals/:id/accept`,
  `GET /proposals/:id/attachment`, `GET /company/proposals/recent`, `GET /company/proposals`
- `GET /mines`, `GET /mines/:id`, `GET /company/mines`, `POST /company/mines`, `DELETE /company/mines/:id`
- `GET /waste`, `GET /waste/:id`, `GET /company/waste`, `POST /company/waste`, `DELETE /company/waste/:id`
- `GET /connections`, `GET /connections/:proposalId`
- `GET /admin/stats`, `POST /admin/admins`, `GET /admin/users`, `PATCH /admin/users/:id/status`,
  `DELETE /admin/users/:id`, `GET /admin/problems`, `DELETE /admin/problems/:id`, `GET /admin/proposals`,
  `DELETE /admin/proposals/:id`, `GET /admin/mines`, `DELETE /admin/mines/:id`, `GET /admin/waste`,
  `DELETE /admin/waste/:id`

## Fayl yuklash qoidalari

Taklif ilovasi: PDF, JPG, JPEG, PNG; maksimal 10 MB. Kon/chiqindi rasm galereyasi: JPG/PNG, bittada 6 tagacha, har
biri 10 MB gacha, ochiq (`/uploads/public`) orqali beriladi. Barcha yuklashlarda MIME va kengaytma tekshiriladi,
fayl nomi tasodifiy generatsiya qilinadi. Taklif ilovasini yuklab olish faqat taklif egasi (foydalanuvchi), muammo
egasi (firma) yoki SUPERADMIN uchun ruxsat etiladi.

## Xavfsizlik

bcrypt parol xeshlash, HttpOnly + `secure` (production) session cookie, PostgreSQL session store, Helmet, qat'iy
CORS, umumiy va login/register uchun alohida rate limiting, Zod validatsiya (backend — asosiy manba), soft-delete
filtrlari, bloklangan/o'chirilgan foydalanuvchilar har bir so'rovda qayta tekshiriladi.

## Kontakt maxfiyligi

Taklif ACCEPTED bo'lmaguncha, backend javoblarida hech qanday email/telefon qaytarilmaydi (frontend orqali emas,
backend darajasida). Kontaktlar faqat `/api/connections` endpointi orqali, va faqat muammo egasi korxona yoki
tanlangan olim uchun ochiladi. Bu qoida `apps/api/tests/accept.test.ts` va `apps/api/tests/proposals.test.ts` da
avtomatik test qilingan.

## Muammolarni bartaraf etish

- **`Missing required environment variable`** — `.env` (root va `apps/api/.env`) to'liq to'ldirilganini tekshiring.
- **Prisma migratsiya xatosi** — PostgreSQL konteyneri ishlab turganini (`docker compose ps`) va `DATABASE_URL`
  to'g'riligini tekshiring.
- **Session/cookie ishlamayapti** — development'da frontend va backend turli portlarda ishlaganda Vite proxy orqali
  `/api` chaqirilishi kerak (to'g'ridan-to'g'ri `localhost:4000` ga emas).
- **Fayl yuklashda xatolik** — hajm 10 MB dan oshmasligi va format PDF/JPG/PNG bo'lishi shart.
