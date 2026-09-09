import { describe, it, expect } from "vitest";
import { agent, registerCompany, registerSuperadmin } from "./helpers.js";

// 1x1 shaffof PNG — galereya yuklash testlari uchun eng kichik amal qiluvchi fayl.
const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

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

  it("rejects an ADMIN (firma) from creating a mine on /admin/mines", async () => {
    const { agent: admin } = await registerCompany();
    const res = await createMine(admin);
    expect(res.status).toBe(403);
  });

  it("lets an ADMIN create and manage own mine via /company/mines", async () => {
    const { agent: admin } = await registerCompany();
    const createRes = await admin
      .post("/api/company/mines")
      .field("name", "Firma Toshkoni")
      .field("location", "Toshkent viloyati")
      .field("rawMaterialType", "Tosh")
      .field("volume", "10 000 m³");
    expect(createRes.status).toBe(201);

    const listRes = await admin.get("/api/company/mines");
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.items.some((m: { id: string }) => m.id === createRes.body.data.id)).toBe(true);

    const deleteRes = await admin.delete(`/api/company/mines/${createRes.body.data.id}`);
    expect(deleteRes.status).toBe(204);
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

  it("lets a SUPERADMIN edit a mine's fields", async () => {
    const { agent: superadmin } = await registerSuperadmin();
    const createRes = await createMine(superadmin);

    const updateRes = await superadmin
      .patch(`/api/admin/mines/${createRes.body.data.id}`)
      .field("name", "Qibray Toshkoni (yangilangan)")
      .field("location", "Toshkent viloyati, Qibray tumani")
      .field("rawMaterialType", "Qurilish toshi")
      .field("volume", "600 000 m³");
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.name).toBe("Qibray Toshkoni (yangilangan)");
    expect(updateRes.body.data.volume).toBe("600 000 m³");
  });

  it("rejects adding images past the 6-image gallery cap on edit", async () => {
    const { agent: superadmin } = await registerSuperadmin();
    const createRes = await createMine(superadmin);

    // 5 tadan boshlaymiz, keyin yana 2 ta qo'shishga urinamiz (5+2=7 > 6).
    let req = superadmin
      .patch(`/api/admin/mines/${createRes.body.data.id}`)
      .field("name", "Qibray Toshkoni")
      .field("location", "Toshkent viloyati, Qibray tumani")
      .field("rawMaterialType", "Qurilish toshi")
      .field("volume", "500 000 m³");
    for (let i = 0; i < 5; i++) req = req.attach("images", onePixelPng, `img${i}.png`);
    const firstEdit = await req;
    expect(firstEdit.status).toBe(200);
    expect(firstEdit.body.data.images).toHaveLength(5);

    let secondReq = superadmin
      .patch(`/api/admin/mines/${createRes.body.data.id}`)
      .field("name", "Qibray Toshkoni")
      .field("location", "Toshkent viloyati, Qibray tumani")
      .field("rawMaterialType", "Qurilish toshi")
      .field("volume", "500 000 m³");
    for (let i = 0; i < 2; i++) secondReq = secondReq.attach("images", onePixelPng, `extra${i}.png`);
    const secondEdit = await secondReq;
    expect(secondEdit.status).toBe(400);
  });
});
