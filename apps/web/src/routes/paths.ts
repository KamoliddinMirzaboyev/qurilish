import type { Role } from "@buildscience/shared";

export function dashboardPathForRole(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/app/admin";
    case "USER":
      return "/app/user";
    case "SUPERADMIN":
      return "/superadmin";
  }
}
