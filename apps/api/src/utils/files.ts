import fs from "node:fs/promises";
import path from "node:path";
import type { Request } from "express";

const MAGIC: { mime: string; bytes: number[] }[] = [
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/jpg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
];

export function isPathInside(root: string, target: string): boolean {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  return resolvedTarget === resolvedRoot || resolvedTarget.startsWith(resolvedRoot + path.sep);
}

export async function unlinkQuietly(filePath: string): Promise<void> {
  await fs.unlink(filePath).catch(() => undefined);
}

export async function removeUploadedFiles(req: Request): Promise<void> {
  const single = req.file;
  const many = req.files;
  const files: Express.Multer.File[] = [];
  if (single) files.push(single);
  if (Array.isArray(many)) files.push(...many);
  await Promise.all(files.map((f) => unlinkQuietly(f.path)));
}

export async function assertMagicBytes(filePath: string, mime: string): Promise<boolean> {
  if (mime === "image/webp") {
    const handle = await fs.open(filePath, "r");
    try {
      const buf = Buffer.alloc(12);
      const { bytesRead } = await handle.read(buf, 0, 12, 0);
      if (bytesRead < 12) return false;
      const isRiff = buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46; // "RIFF"
      const isWebp = buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50; // "WEBP"
      return isRiff && isWebp;
    } finally {
      await handle.close();
    }
  }

  const expected = MAGIC.find((m) => m.mime === mime);
  if (!expected) return false;
  const handle = await fs.open(filePath, "r");
  try {
    const buf = Buffer.alloc(expected.bytes.length);
    const { bytesRead } = await handle.read(buf, 0, expected.bytes.length, 0);
    if (bytesRead < expected.bytes.length) return false;
    return expected.bytes.every((b, i) => buf[i] === b);
  } finally {
    await handle.close();
  }
}
