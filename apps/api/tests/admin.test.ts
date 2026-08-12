import { describe, it, expect } from "vitest";
import { registerCompany, registerSuperadmin } from "./helpers.js";

describe("admin moderation", () => {
  it("can block a user", async () => {
    const { agent: admin } = await registerSuperadmin();
    const { res } = await registerCompany();
    const userId = res.body.data.id;

    const blockRes = await admin.patch(`/api/admin/users/${userId}/status`).send({ status: "BLOCKED" });
    expect(blockRes.status).toBe(200);
    expect(blockRes.body.data.status).toBe("BLOCKED");
  });

  it("can soft-delete a spam problem, hiding it from public listing", async () => {
    const { agent: admin } = await registerSuperadmin();
    const { agent: companyAgent } = await registerCompany();
    const problemRes = await companyAgent.post("/api/problems").send({
      title: "Spam e'lon sarlavhasi shu yerda",
      description: "Spam tavsif matni ".repeat(10),
      category: "OTHER",
      budgetType: "NEGOTIABLE",
    });
    const problemId = problemRes.body.data.id;

    const deleteRes = await admin.delete(`/api/admin/problems/${problemId}`);
    expect(deleteRes.status).toBe(204);

    const listRes = await companyAgent.get("/api/problems");
    expect(listRes.body.data.items.find((p: { id: string }) => p.id === problemId)).toBeUndefined();
  });

  it("cannot block itself", async () => {
    const { agent: admin, res: meRes } = await registerSuperadmin();
    const res = await admin.patch(`/api/admin/users/${meRes.body.data.id}/status`).send({ status: "BLOCKED" });
    expect(res.status).toBe(400);
  });

  it("a COMPANY-role agent cannot access superadmin routes", async () => {
    const { agent: companyAgent } = await registerCompany();
    const res = await companyAgent.get("/api/admin/stats");
    expect(res.status).toBe(403);
  });

  it("only SUPERADMIN can create a new ADMIN (firma) account", async () => {
    const { agent: admin } = await registerSuperadmin();
    const res = await admin.post("/api/admin/admins").send({
      name: "Yangi Firma MChJ",
      email: "yangi-firma@test.local",
      phone: "+998901234599",
      password: "FirmaPass123",
    });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("ADMIN");

    const loginRes = await admin.post("/api/auth/login").send({ email: "yangi-firma@test.local", password: "FirmaPass123" });
    expect(loginRes.status).toBe(200);
  });
});
