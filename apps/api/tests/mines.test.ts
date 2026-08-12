import { describe, it, expect } from "vitest";
import { agent, registerCompany, registerSuperadmin } from "./helpers.js";

async function createMine(a: ReturnType<typeof agent>) {
  return a
    .post("/api/admin/mines")
    .field("name", "Qibray Toshkoni")
    .field("location", "Toshkent viloyati, Qibray tumani")
    .field("rawMaterialType", "Qurilish toshi")
    .field("volume", "500 000 m³");
}

describe("mines", () => {
  it("lets a SUPERADMIN create a mine and shows it in the public list", async () => {
    const { agent: superadmin } = await registerSuperadmin();
    const createRes = await createMine(superadmin);
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.name).toBe("Qibray Toshkoni");

    const publicRes = await agent().get("/api/mines");
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.data.items.some((m: { id: string }) => m.id === createRes.body.data.id)).toBe(true);
  });

  it("is readable by a guest without authentication", async () => {
    const { agent: superadmin } = await registerSuperadmin();
    const createRes = await createMine(superadmin);

    const res = await agent().get(`/api/mines/${createRes.body.data.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.rawMaterialType).toBe("Qurilish toshi");
  });

  it("rejects a guest from creating a mine", async () => {
    const res = await createMine(agent());
    expect(res.status).toBe(401);
  });

  it("rejects an ADMIN (firma) from creating a mine — SUPERADMIN only", async () => {
    const { agent: admin } = await registerCompany();
    const res = await createMine(admin);
    expect(res.status).toBe(403);
  });

  it("lets a SUPERADMIN delete a mine", async () => {
    const { agent: superadmin } = await registerSuperadmin();
    const createRes = await createMine(superadmin);

    const deleteRes = await superadmin.delete(`/api/admin/mines/${createRes.body.data.id}`);
    expect(deleteRes.status).toBe(204);

    const publicRes = await agent().get(`/api/mines/${createRes.body.data.id}`);
    expect(publicRes.status).toBe(404);
  });

  it("rejects an ADMIN (firma) from deleting a mine", async () => {
    const { agent: superadmin } = await registerSuperadmin();
    const { agent: admin } = await registerCompany();
    const createRes = await createMine(superadmin);

    const deleteRes = await admin.delete(`/api/admin/mines/${createRes.body.data.id}`);
    expect(deleteRes.status).toBe(403);
  });
});
