import { queryClient } from "./queryClient";
import { api, setCsrfToken } from "./api";

export async function logoutClient(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    // server logout xatosida ham lokal sessiya tozalanadi
  }
  setCsrfToken(null);
  queryClient.clear();
}

export function pageFromSearch(value: string | null): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}
