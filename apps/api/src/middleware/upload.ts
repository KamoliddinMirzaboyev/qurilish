import multer from "multer";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { env } from "../config/env.js";
import { UPLOAD, GALLERY_UPLOAD } from "@buildscience/shared";
import { AppError } from "../utils/AppError.js";
import { assertMagicBytes, unlinkQuietly } from "../utils/files.js";

export const uploadRoot = path.resolve(process.cwd(), env.uploadDir);
if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });

export const uploadPublicRoot = path.resolve(uploadRoot, "public");
if (!fs.existsSync(uploadPublicRoot)) fs.mkdirSync(uploadPublicRoot, { recursive: true });

const MULTIPART_KEYS = new Set([
  "title",
  "description",
  "category",
  "budgetType",
  "budgetAmount",
  "name",
  "location",
  "rawMaterialType",
  "volume",
  "lat",
  "lng",
  "factoryName",
  "composition",
  "annualVolume",
  "solutionText",
  "estimatedDays",
  "priceNegotiable",
  "proposedPrice",
]);

function randomFilename(originalname: string) {
  const ext = path.extname(originalname).toLowerCase();
  return `${crypto.randomBytes(24).toString("hex")}${ext}`;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => cb(null, randomFilename(file.originalname)),
});

function fileFilter(_req: unknown, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = (UPLOAD.ALLOWED_MIME_TYPES as readonly string[]).includes(file.mimetype);
  const extOk = (UPLOAD.ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
  if (!mimeOk || !extOk) {
    cb(new Error("INVALID_FILE_TYPE"));
    return;
  }
  cb(null, true);
}

const uploadProposalAttachment = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
}).single("attachment");

async function verifyFiles(files: Express.Multer.File[]): Promise<void> {
  for (const file of files) {
    const ok = await assertMagicBytes(file.path, file.mimetype);
    if (!ok) {
      await unlinkQuietly(file.path);
      throw AppError.badRequest("Fayl turi noto'g'ri. Faqat haqiqiy PDF, JPG yoki PNG yuklash mumkin.");
    }
  }
}

export function handleProposalUpload(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) {
  uploadProposalAttachment(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return next(AppError.badRequest(`Fayl hajmi ${env.maxUploadMb} MB dan oshmasligi kerak.`));
      }
      if (err instanceof Error && err.message === "INVALID_FILE_TYPE") {
        return next(AppError.badRequest("Faqat PDF, JPG va PNG fayllarini yuklash mumkin."));
      }
      return next(err);
    }
    const file = req.file;
    if (!file) return next();
    void verifyFiles([file]).then(() => next()).catch(next);
  });
}

const galleryStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadPublicRoot),
  filename: (_req, file, cb) => cb(null, randomFilename(file.originalname)),
});

function galleryFileFilter(_req: unknown, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = (GALLERY_UPLOAD.ALLOWED_MIME_TYPES as readonly string[]).includes(file.mimetype);
  const extOk = (GALLERY_UPLOAD.ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
  if (!mimeOk || !extOk) {
    cb(new Error("INVALID_FILE_TYPE"));
    return;
  }
  cb(null, true);
}

const uploadGalleryImages = multer({
  storage: galleryStorage,
  fileFilter: galleryFileFilter,
  limits: { fileSize: GALLERY_UPLOAD.MAX_SIZE_MB * 1024 * 1024 },
}).array("images", GALLERY_UPLOAD.MAX_IMAGES);

function flattenMultipartBody(req: import("express").Request) {
  const body = req.body as Record<string, unknown> | undefined;
  if (!body || typeof body !== "object") return;

  const payload = body.payload;
  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      const safe: Record<string, unknown> = Object.create(null);
      for (const [key, value] of Object.entries(parsed)) {
        if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
        if (MULTIPART_KEYS.has(key)) safe[key] = value;
      }
      Object.assign(body, safe);
    } catch {
      // ignore malformed payload — zod will reject
    }
    delete body.payload;
  }

  for (const [key, value] of Object.entries(body)) {
    if (Array.isArray(value) && value.length === 1) body[key] = value[0];
  }
}

export function handleGalleryUpload(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) {
  const contentType = req.headers["content-type"] ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return next();
  }

  uploadGalleryImages(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return next(AppError.badRequest(`Har bir rasm hajmi ${GALLERY_UPLOAD.MAX_SIZE_MB} MB dan oshmasligi kerak.`));
      }
      if (err instanceof multer.MulterError && err.code === "LIMIT_UNEXPECTED_FILE") {
        return next(AppError.badRequest(`Bittada ${GALLERY_UPLOAD.MAX_IMAGES} tadan ortiq rasm yuklab bo'lmaydi.`));
      }
      if (err instanceof Error && err.message === "INVALID_FILE_TYPE") {
        return next(AppError.badRequest("Faqat JPG va PNG rasmlarini yuklash mumkin."));
      }
      return next(err);
    }
    flattenMultipartBody(req);
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) return next();
    void verifyFiles(files).then(() => next()).catch(next);
  });
}
