-- Secure, one-time password reset tokens.
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");
CREATE INDEX "password_reset_tokens_userId_expiresAt_idx" ON "password_reset_tokens"("userId", "expiresAt");
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

ALTER TABLE "password_reset_tokens"
  ADD CONSTRAINT "password_reset_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Application-level checks alone are race-prone. Deleted accounts may release their phone number.
CREATE UNIQUE INDEX "users_phone_active_key"
  ON "users"("phone")
  WHERE "deletedAt" IS NULL;

-- List and search paths used by the public/admin APIs.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "problems_status_deletedAt_createdAt_idx" ON "problems"("status", "deletedAt", "createdAt");
CREATE INDEX "problems_companyId_deletedAt_createdAt_idx" ON "problems"("companyId", "deletedAt", "createdAt");
CREATE INDEX "proposals_scientistId_deletedAt_createdAt_idx" ON "proposals"("scientistId", "deletedAt", "createdAt");
CREATE INDEX "proposals_problemId_deletedAt_status_idx" ON "proposals"("problemId", "deletedAt", "status");
CREATE INDEX "mines_deletedAt_createdAt_idx" ON "mines"("deletedAt", "createdAt");
CREATE INDEX "waste_deletedAt_createdAt_idx" ON "waste"("deletedAt", "createdAt");
CREATE INDEX "problems_title_trgm_idx" ON "problems" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "problems_description_trgm_idx" ON "problems" USING GIN ("description" gin_trgm_ops);
CREATE INDEX "mines_name_trgm_idx" ON "mines" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "waste_factoryName_trgm_idx" ON "waste" USING GIN ("factoryName" gin_trgm_ops);
