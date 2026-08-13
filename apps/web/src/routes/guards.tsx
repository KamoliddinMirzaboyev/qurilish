import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { Role } from "@buildscience/shared";
import { useAuth } from "@/features/auth/AuthContext";
import { dashboardPathForRole } from "./paths";
import { AppShellSkeleton, PageSkeleton, PublicChromeSkeleton } from "@/components/ui/Skeleton";

export function FullScreenLoader() {
  return <AppShellSkeleton />;
}

export function PageLoader() {
  return <PageSkeleton />;
}

export function RequireAuth() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function RequireGuest() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PublicChromeSkeleton />;
  if (user) return <Navigate to={dashboardPathForRole(user.role)} replace />;
  return <Outlet />;
}

export function RequireRole({ roles }: { roles: Role[] }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/forbidden" replace />;
  return <Outlet />;
}
