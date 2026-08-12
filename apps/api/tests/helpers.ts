import request from "supertest";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { app } from "../src/app.js";

const prisma = new PrismaClient();

export function agent() {
  return request.agent(app);
}

/** ADMIN (firma) akkauntlari endi faqat SUPERADMIN tomonidan yaratiladi — testda to'g'ridan-to'g'ri DB orqali yaratib, login qilamiz. */
export async function registerCompany(email = "company@test.local") {
  const passwordHash = await bcrypt.hash("Password123", 4);
  await prisma.user.create({
    data: {
      role: "ADMIN",
      name: "Test Qurilish MChJ",
      email,
      phone: "+998901234567",
      passwordHash,
      status: "ACTIVE",
    },
  });
  const a = agent();
  const res = await a.post("/api/auth/login").send({ email, password: "Password123" });
  return { agent: a, res };
}

export async function registerScientist(email = "scientist@test.local") {
  const a = agent();
  const res = await a.post("/api/auth/register").send({
    name: "Test Olim",
    email,
    phone: "+998907654321",
    password: "Password123",
    passwordConfirm: "Password123",
    specialization: "Beton",
    organization: "Test Universitet",
  });
  return { agent: a, res };
}

export async function registerSuperadmin(email = "superadmin@test.local") {
  const passwordHash = await bcrypt.hash("Password123", 4);
  await prisma.user.create({
    data: {
      role: "SUPERADMIN",
      name: "Test Hokimiyat",
      email,
      phone: "+998900000001",
      passwordHash,
      status: "ACTIVE",
    },
  });
  const a = agent();
  const res = await a.post("/api/auth/login").send({ email, password: "Password123" });
  return { agent: a, res };
}

export async function createOpenProblem(companyAgent: ReturnType<typeof agent>) {
  const res = await companyAgent.post("/api/problems").send({
    title: "Beton mustahkamligini oshirish bo'yicha ilmiy yechim kerak",
    description: "Beton mustahkamligini oshirish uchun ilmiy asoslangan yechim izlaymiz. ".repeat(3),
    category: "CONCRETE_CEMENT",
    budgetType: "FIXED",
    budgetAmount: 1000000,
  });
  return res.body.data;
}
