import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthUser } from "@buildscience/shared";
import { api, ApiRequestError, setCsrfToken, setUnauthorizedHandler } from "@/lib/api";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    try {
      const csrfRes = await api.get<{ csrfToken: string }>("/auth/csrf").catch(() => null);
      if (csrfRes?.csrfToken) {
        setCsrfToken(csrfRes.csrfToken);
      }
      const me = await api.get<AuthUser>("/auth/me");
      setUser(me);
    } catch (err) {
      if (err instanceof ApiRequestError && (err.status === 401 || err.status === 403)) {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  return <AuthContext.Provider value={{ user, isLoading, setUser, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
