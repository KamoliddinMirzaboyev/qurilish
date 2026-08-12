import { describe, it, expect } from "vitest";
import { agent, registerCompany } from "./helpers.js";

async function createMine(adminAgent: ReturnType<typeof agent>) {
  return adminAgent
    .post("/api/company/mines")
    .field("name", "Qibray Toshkoni")
    .field("location", "Toshkent viloyati, Qibray tumani")
    .field("rawMaterialType", "Qurilish toshi")
    .field("volume", "500 000 m³");
}

describe("mines", () => {
  it("lets an ADMIN create a mine and shows it in the public list", async () => {
    const { agent: adminA } = await registerCompany();
    const createRes = await createMine(adminA);
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.name).toBe("Qibray Toshkoni");

    const publicRes = await agent().get("/api/mines");
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.data.items.some((m: { id: string }) => m.id === createRes.body.data.id)).toBe(true);
  });

  it("is readable by a guest without authentication", async () => {
    const { agent: adminA } = await registerCompany();
    const createRes = await createMine(adminA);

    const res = await agent().get(`/api/mines/${createRes.body.data.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.rawMaterialType).toBe("Qurilish toshi");
  });

  it("rejects a non-ADMIN from creating a mine", async () => {
    const res = await createMine(agent());
    expect(res.status).toBe(401);
  });

  it("prevents one ADMIN from deleting another ADMIN's mine", async () => {
    const { agent: adminA } = await registerCompany("mine-owner@test.local");
    const { agent: adminB } = await registerCompany("mine-intruder@test.local");
    const createRes = await createMine(adminA);

    const deleteRes = await adminB.delete(`/api/company/mines/${createRes.body.data.id}`);
    expect(deleteRes.status).toBe(403);
  });

  it("lets the owning ADMIN delete their own mine", async () => {
    const { agent: adminA } = await registerCompany();
    const createRes = await createMine(adminA);

    const deleteRes = await adminA.delete(`/api/company/mines/${createRes.body.data.id}`);
    expect(deleteRes.status).toBe(204);

    const publicRes = await agent().get(`/api/mines/${createRes.body.data.id}`);
    expect(publicRes.status).toBe(404);
  });
});
