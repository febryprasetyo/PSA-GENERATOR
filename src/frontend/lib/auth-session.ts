import type { UserRole } from "@/shared/types";

export function readStoredRole(defaultRole: UserRole = "viewer"): UserRole {
  if (typeof window === "undefined") {
    return defaultRole;
  }

  const auth = localStorage.getItem("psaAuth");
  if (auth === "true") {
    return "admin";
  }

  if (!auth) {
    return defaultRole;
  }

  try {
    const parsed = JSON.parse(auth) as { role?: UserRole };
    if (parsed.role === "admin" || parsed.role === "operator" || parsed.role === "viewer") {
      return parsed.role;
    }
  } catch {
    return defaultRole;
  }

  return defaultRole;
}
