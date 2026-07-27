import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Setting up TimescaleDB...");
  try {
    // Enable the extension if not exists
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS timescaledb;`);
    console.log("TimescaleDB extension ensured.");
    
    // TimescaleDB hypertable requires partition column (terminal_time) to be part of the primary key constraint
    await db.execute(sql`ALTER TABLE machine_readings DROP CONSTRAINT IF EXISTS machine_readings_pkey;`);
    await db.execute(sql`ALTER TABLE machine_readings ADD CONSTRAINT machine_readings_pkey PRIMARY KEY (id, terminal_time);`);

    // Create hypertable
    await db.execute(sql`SELECT create_hypertable('machine_readings', 'terminal_time', if_not_exists => TRUE);`);
    console.log("machine_readings successfully converted to hypertable.");
  } catch (error) {
    console.error("Error setting up TimescaleDB:", error);
  }
  process.exit(0);
}

main();
