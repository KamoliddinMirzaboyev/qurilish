import type { ApiError, ApiSuccess } from "@buildscience/shared";
import { queryClient } from "./queryClient";

export class ApiRequestError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  isFormData?: boolean;
};

export const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

const CSRF_COOKIE = "bs_csrf";
const CSRF_STORAGE_KEY = "bs_csrf_token";

let inMemoryCsrfToken: string | null = null;

export function setCsrfToken(token: string | null) {
  inMemoryCsrfToken = token;
  try {
    if (token) sessionStorage.setItem(CSRF_STORAGE_KEY, token);
    else sessionStorage.removeItem(CSRF_STORAGE_KEY);
  } catch {
    // sessionStorage mavjud bo'lmasa xato tashlamaydi
  }
}

export function getCsrfToken(): string | undefined {
  if (inMemoryCsrfToken) return inMemoryCsrfToken;
  try {
    const saved = sessionStorage.getItem(CSRF_STORAGE_KEY);
    if (saved) {
      inMemoryCsrfToken = saved;
      return saved;
    }
  } catch {
    // ignore
  }
  return readCsrfToken();
}

function readCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.split("; ").find((part) => part.startsWith(`${CSRF_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(CSRF_COOKIE.length + 1)) : undefined;
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, isFormData } = options;
  const csrf = getCsrfToken();

  const headers: Record<string, string> = {};
  if (!isFormData && body) headers["Content-Type"] = "application/json";
  if (csrf && method !== "GET") headers["X-CSRF-Token"] = csrf;

  const res = await fetch(`${API_BASE}${url}`, {
    method,
    credentials: "include",
    headers,
    body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !url.startsWith("/auth/")) {
    queryClient.clear();
    unauthorizedHandler?.();
  }

  if (res.status === 204) return undefined as T;

  const json = (await res.json().catch(() => null)) as ApiSuccess<T> | ApiError | null;

  if (!res.ok || !json || json.success === false) {
    const message = json && "message" in json ? json.message : "Ma'lumotlarni yuklashda xatolik yuz berdi.";
    const errors = json && "errors" in json ? json.errors : undefined;
    throw new ApiRequestError(res.status, message, errors);
  }

  return (json as ApiSuccess<T>).data;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) => request<T>(url, { method: "POST", body }),
  patch: <T>(url: string, body?: unknown) => request<T>(url, { method: "PATCH", body }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
  postForm: <T>(url: string, formData: FormData) => request<T>(url, { method: "POST", body: formData, isFormData: true }),
  patchForm: <T>(url: string, formData: FormData) => request<T>(url, { method: "PATCH", body: formData, isFormData: true }),
};
