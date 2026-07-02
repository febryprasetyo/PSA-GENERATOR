export interface UserContext {
  role: "admin" | "operator" | "client";
  clientId: string | null;
}

export interface MachineContext {
  id: string;
  clientId: string;
}

export function scopeMachinesByUserRole<T extends MachineContext>(
  user: UserContext,
  machines: T[]
): T[] {
  if (user.role === "admin" || user.role === "operator") {
    return machines;
  }
  
  if (user.role === "client") {
    if (!user.clientId) return [];
    return machines.filter((m) => m.clientId === user.clientId);
  }

  return [];
}
