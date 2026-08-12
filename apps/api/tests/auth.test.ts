import { describe, it, expect } from "vitest";
import { agent, registerCompany, registerScientist } from "./helpers.js";
import { prisma } from "../src/services/prisma.js";
import { hashPassword } from "../src/utils/password.js";

describe("auth", () => {
  it("logs an ADMIN (firma) in", async () => {
    const { res } = await registerCompany();
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("ADMIN");
  });

  it("registers a USER", async () => {
    const { res } = await registerScientist();
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("USER");
  });

  it("ignores a client-supplied role and always creates USER", async () => {
    const res = await agent()
      .post("/api/auth/register")
      .send({
        role: "SUPERADMIN",
        name: "Hacker",
        email: "hacker@test.local",
        phone: "+998901112233",
        password: "Password123",
        passwordConfirm: "Password123",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("USER");
  });

  it("logs in with valid credentials", async () => {
    await registerCompany("login-ok@test.local");
    const res = await agent().post("/api/auth/login").send({ email: "login-ok@test.local", password: "Password123" });
    expect(res.status).toBe(200);
  });

  it("fails login with invalid password", async () => {
    await registerCompany("login-bad@test.local");
    const res = await agent().post("/api/auth/login").send({ email: "login-bad@test.local", password: "WrongPass1" });
    expect(res.status).toBe(400);
  });

  it("blocks a session-holding user immediately after being blocked", async () => {
    const { agent: scientistAgent } = await registerScientist("to-block@test.local");
    await prisma.user.update({ where: { email: "to-block@test.local" }, data: { status: "BLOCKED" } });

    const res = await scientistAgent.get("/api/auth/me");
    expect(res.status).toBe(403);
  });

  it("rejects login for an already-blocked user", async () => {
    await prisma.user.create({
      data: {
        role: "ADMIN",
        name: "Blocked Co",
        email: "blocked-co@test.local",
        phone: "+998909998877",
        passwordHash: await hashPassword("Password123"),
        status: "BLOCKED",
      },
    });
    const res = await agent().post("/api/auth/login").send({ email: "blocked-co@test.local", password: "Password123" });
    expect(res.status).toBe(403);
  });

  it("init-admin route no longer exists", async () => {
    const res = await agent().get("/api/auth/init-admin");
    expect(res.status).toBe(404);
  });
});
