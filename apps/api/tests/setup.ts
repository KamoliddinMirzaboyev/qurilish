import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../.env.test"), override: true });

if (!process.env.DATABASE_URL?.includes("_test")) {
  throw new Error(
    "Refusing to run tests: DATABASE_URL does not look like a test database. Check apps/api/.env.test."
  );
}

const { prisma } = await import("../src/services/prisma.js");

beforeEach(async () => {
  await prisma.proposal.deleteMany({});
  await prisma.problem.deleteMany({});
  await prisma.mineImage.deleteMany({});
  await prisma.mine.deleteMany({});
  await prisma.wasteImage.deleteMany({});
  await prisma.waste.deleteMany({});
  await prisma.user.deleteMany({});
});
