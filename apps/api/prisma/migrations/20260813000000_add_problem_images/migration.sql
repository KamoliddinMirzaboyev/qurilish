-- CreateTable
CREATE TABLE "problem_images" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "problem_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "problem_images_problemId_idx" ON "problem_images"("problemId");

-- AddForeignKey
ALTER TABLE "problem_images" ADD CONSTRAINT "problem_images_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
