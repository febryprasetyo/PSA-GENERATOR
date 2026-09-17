import { Pool } from "pg";
import { getBrandName } from "@/shared/config";

let cmcPool: Pool | undefined;

// CMC owns its active registrations. Query the source database rather than
// telemetry keys, which can be stale or absent for offline machines.
export async function getCmcRegisteredSerials(serialNumbers: string[]): Promise<Set<string>> {
  const connectionString = process.env.CMC_DATABASE_URL;
  if (getBrandName().toUpperCase() !== "MGM" || !connectionString || serialNumbers.length === 0) {
    return new Set();
  }

  if (!cmcPool) {
    cmcPool = new Pool({
      connectionString,
      max: 2,
      connectionTimeoutMillis: 5000,
      query_timeout: 5000,
    });
    cmcPool.on("error", () => console.error("[CMC registration] Database connection error"));
  }

  const result = await cmcPool.query<{ serialNumber: string }>(
    'SELECT serial_number AS "serialNumber" FROM machines WHERE deleted_at IS NULL AND serial_number = ANY($1::text[])',
    [serialNumbers],
  );
  return new Set(result.rows.map((row) => row.serialNumber));
}

export function isUnassignedAutomaticMachine(machine: {
  serialNumber: string;
  machineName: string;
  clientId: string | null;
}): boolean {
  return machine.clientId === null && (
    machine.machineName === `Auto-Registered (${machine.serialNumber})` ||
    machine.machineName === `Auto-Synced (${machine.serialNumber})`
  );
}
