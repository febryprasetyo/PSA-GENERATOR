import { readFileSync } from "node:fs";
import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required; run through db:instance");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
try {
  await client.connect();
  await client.query("BEGIN");
  await client.query("SET LOCAL lock_timeout = '10s'");
  await client.query(readFileSync(new URL("./deployment-migration.sql", import.meta.url), "utf8"));
  await client.query("COMMIT");
  console.log("Deployment schema migration complete.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Deployment schema migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
