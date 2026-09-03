import { Client } from "pg";
import { planTelemetryTimestamp } from "../src/backend/telemetry/timezone-migration";

type DatabaseRow = {
  id: string;
  machine_id: string;
  terminal_time: Date;
  received_at: Date;
  raw_payload: unknown;
  province: string | null;
};

type PlannedRow = DatabaseRow & { desired: Date };

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const parsedUrl = new URL(databaseUrl);
const databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\//, ""));
if (databaseName !== "psa_generator_dev") {
  throw new Error(`Refusing database '${databaseName || "(empty)"}'; expected exactly 'psa_generator_dev'`);
}

const apply = process.argv.includes("--apply");
const client = new Client({ connectionString: databaseUrl });

async function fetchRows(table: "machine_readings" | "machine_latest_readings"): Promise<DatabaseRow[]> {
  const idColumn = table === "machine_readings" ? "r.id" : "r.machine_id";
  const result = await client.query<DatabaseRow>(`
    select ${idColumn} as id, r.machine_id, r.terminal_time, r.received_at,
           r.raw_payload, h.province
      from ${table} r
      left join machines m on m.id = r.machine_id
      left join master_hospitals h on h.id = m.client_id
     order by r.machine_id, r.terminal_time
  `);
  return result.rows;
}

function buildPlans(rows: DatabaseRow[], kind: "latest" | "history"): PlannedRow[] {
  return rows.flatMap((row) => {
    const plan = planTelemetryTimestamp({
      currentTerminalTime: row.terminal_time,
      rawPayload: row.raw_payload,
      province: row.province,
      receivedAt: row.received_at,
    }, kind);
    return plan?.changed ? [{ ...row, desired: plan.desiredTerminalTime }] : [];
  });
}

function assertNoFinalCollisions(rows: DatabaseRow[], plans: PlannedRow[], label: string) {
  const desiredById = new Map(plans.map((row) => [row.id, row.desired]));
  const keys = new Set<string>();
  for (const row of rows) {
    const terminalTime = desiredById.get(row.id) ?? row.terminal_time;
    const key = `${row.machine_id}\u0000${terminalTime.toISOString()}`;
    if (keys.has(key)) throw new Error(`${label} collision for machine ${row.machine_id} at ${terminalTime.toISOString()}`);
    keys.add(key);
  }
}

function timestampKey(machineId: string, terminalTime: Date) {
  return `${machineId}\u0000${terminalTime.toISOString()}`;
}

async function updatePlans(
  table: "machine_readings" | "machine_latest_readings",
  rows: DatabaseRow[],
  plans: PlannedRow[],
) {
  if (!plans.length) return;
  const idColumn = table === "machine_readings" ? "id" : "machine_id";
  if (table === "machine_readings") {
    await client.query("create temporary table telemetry_timezone_migration_rows on commit drop as select * from machine_readings where false");
    await client.query("insert into telemetry_timezone_migration_rows select * from machine_readings where id = any($1::text[])", [plans.map((row) => row.id)]);
    for (const row of plans) {
      await client.query("update telemetry_timezone_migration_rows set terminal_time = $1 where id = $2", [row.desired, row.id]);
    }
    await client.query("delete from machine_readings where id = any($1::text[])", [plans.map((row) => row.id)]);
    await client.query("insert into machine_readings select * from telemetry_timezone_migration_rows");
    return;
  }

  const occupied = new Map(rows.map((row) => [timestampKey(row.machine_id, row.terminal_time), row.id]));
  const pending = new Map(plans.map((row) => [row.id, row]));

  while (pending.size) {
    const movable = [...pending.values()].find((row) => {
      const occupant = occupied.get(timestampKey(row.machine_id, row.desired));
      return !occupant || occupant === row.id;
    });
    if (!movable) {
      throw new Error(`Cannot safely order ${table} updates without a temporary cross-chunk timestamp`);
    }
    await client.query(`update ${table} set terminal_time = $1 where ${idColumn} = $2`, [movable.desired, movable.id]);
    occupied.delete(timestampKey(movable.machine_id, movable.terminal_time));
    occupied.set(timestampKey(movable.machine_id, movable.desired), movable.id);
    pending.delete(movable.id);
  }
}

async function main() {
  await client.connect();
  try {
    const historyRows = await fetchRows("machine_readings");
    const latestRows = await fetchRows("machine_latest_readings");
    const historyPlans = buildPlans(historyRows, "history");
    const latestPlans = buildPlans(latestRows, "latest");
    assertNoFinalCollisions(historyRows, historyPlans, "history");
    assertNoFinalCollisions(latestRows, latestPlans, "latest");

    console.log(JSON.stringify({
      mode: apply ? "apply" : "dry-run",
      database: databaseName,
      historyRows: historyRows.length,
      latestRows: latestRows.length,
      plannedHistoryChanges: historyPlans.length,
      plannedLatestChanges: latestPlans.length,
      collisions: 0,
    }, null, 2));

    if (!apply) return;
    await client.query("begin");
    try {
      await updatePlans("machine_readings", historyRows, historyPlans);
      await updatePlans("machine_latest_readings", latestRows, latestPlans);
      const historyCount = Number((await client.query("select count(*)::int as count from machine_readings")).rows[0].count);
      const latestCount = Number((await client.query("select count(*)::int as count from machine_latest_readings")).rows[0].count);
      if (historyCount !== historyRows.length || latestCount !== latestRows.length) {
        throw new Error(`Row count changed: history ${historyRows.length}->${historyCount}, latest ${latestRows.length}->${latestCount}`);
      }
      await client.query("commit");
      console.log(`Applied ${historyPlans.length} history and ${latestPlans.length} latest timestamp corrections.`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
