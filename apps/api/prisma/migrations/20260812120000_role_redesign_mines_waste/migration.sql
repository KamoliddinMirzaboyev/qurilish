-- Role rename: ADMIN(platform)->SUPERADMIN, COMPANY->ADMIN, SCIENTIST/EXPERT->USER
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('SUPERADMIN', 'ADMIN', 'USER');
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING (
  CASE "role"::text
    WHEN 'ADMIN' THEN 'SUPERADMIN'
    WHEN 'COMPANY' THEN 'ADMIN'
    WHEN 'SCIENTIST' THEN 'USER'
    WHEN 'EXPERT' THEN 'USER'
    ELSE "role"::text
  END::"Role_new"
);
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
COMMIT;

-- ProposalStatus: drop EXPERT_APPROVED, fold into PENDING
BEGIN;
CREATE TYPE "ProposalStatus_new" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');
ALTER TABLE "proposals" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "proposals" ALTER COLUMN "status" TYPE "ProposalStatus_new" USING (
  CASE "status"::text
    WHEN 'EXPERT_APPROVED' THEN 'PENDING'
    ELSE "status"::text
  END::"ProposalStatus_new"
);
ALTER TYPE "ProposalStatus" RENAME TO "ProposalStatus_old";
ALTER TYPE "ProposalStatus_new" RENAME TO "ProposalStatus";
DROP TYPE "ProposalStatus_old";
ALTER TABLE "proposals" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- Drop expert-review fields (feature reverted)
ALTER TABLE "proposals" DROP CONSTRAINT "proposals_reviewedById_fkey";
ALTER TABLE "proposals" DROP COLUMN "reviewedAt",
DROP COLUMN "reviewedById";

-- CreateTable
CREATE TABLE "mines" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT NOT NULL,
    "rawMaterialType" TEXT NOT NULL,
    "volume" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "mines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mine_images" (
    "id" TEXT NOT NULL,
    "mineId" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mine_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waste" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "factoryName" TEXT NOT NULL,
    "composition" TEXT NOT NULL,
    "volume" TEXT NOT NULL,
    "annualVolume" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "waste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waste_images" (
    "id" TEXT NOT NULL,
    "wasteId" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waste_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mines_adminId_idx" ON "mines"("adminId");

-- CreateIndex
CREATE INDEX "mines_createdAt_idx" ON "mines"("createdAt");

-- CreateIndex
CREATE INDEX "mine_images_mineId_idx" ON "mine_images"("mineId");

-- CreateIndex
CREATE INDEX "waste_adminId_idx" ON "waste"("adminId");

-- CreateIndex
CREATE INDEX "waste_createdAt_idx" ON "waste"("createdAt");

-- CreateIndex
CREATE INDEX "waste_images_wasteId_idx" ON "waste_images"("wasteId");

-- AddForeignKey
ALTER TABLE "mines" ADD CONSTRAINT "mines_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mine_images" ADD CONSTRAINT "mine_images_mineId_fkey" FOREIGN KEY ("mineId") REFERENCES "mines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste" ADD CONSTRAINT "waste_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_images" ADD CONSTRAINT "waste_images_wasteId_fkey" FOREIGN KEY ("wasteId") REFERENCES "waste"("id") ON DELETE CASCADE ON UPDATE CASCADE;
