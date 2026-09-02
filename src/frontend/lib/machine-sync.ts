export function canShowMachineSync(role?: string): boolean {
  return role === "admin";
}
