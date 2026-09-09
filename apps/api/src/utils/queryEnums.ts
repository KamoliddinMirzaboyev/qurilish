const PROBLEM = new Set(["OPEN", "MATCHED", "CLOSED"]);
const PROPOSAL = new Set(["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"]);
const USER_STATUS = new Set(["ACTIVE", "BLOCKED"]);
const ROLE = new Set(["SUPERADMIN", "ADMIN", "USER"]);
const CATEGORY = new Set([
  "CONSTRUCTION",
  "CONCRETE_CEMENT",
  "BUILDING_MATERIALS",
  "CHEMISTRY",
  "LOGISTICS",
  "ENERGY_EFFICIENCY",
  "SEISMIC_SAFETY",
  "ECOLOGY",
  "OTHER",
]);

function pick<T extends string>(value: string | undefined, allowed: Set<string>): T | undefined {
  if (!value || value === "ALL") return undefined;
  return allowed.has(value) ? (value as T) : undefined;
}

export function problemStatus(value?: string) {
  return pick<"OPEN" | "MATCHED" | "CLOSED">(value, PROBLEM);
}

export function proposalStatus(value?: string) {
  return pick<"PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN">(value, PROPOSAL);
}

export function userStatus(value?: string) {
  return pick<"ACTIVE" | "BLOCKED">(value, USER_STATUS);
}

export function userRole(value?: string) {
  return pick<"SUPERADMIN" | "ADMIN" | "USER">(value, ROLE);
}

export function categoryValue(value?: string) {
  return pick<
    | "CONSTRUCTION"
    | "CONCRETE_CEMENT"
    | "BUILDING_MATERIALS"
    | "CHEMISTRY"
    | "LOGISTICS"
    | "ENERGY_EFFICIENCY"
    | "SEISMIC_SAFETY"
    | "ECOLOGY"
    | "OTHER"
  >(value, CATEGORY);
}
