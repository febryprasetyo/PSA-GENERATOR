// @ts-nocheck
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
if (!global.crypto) {
  global.crypto = require("crypto");
}
import { sql } from "drizzle-orm";

async function alter() {
  const { db } = await import("./index");
  
  console.log("Renaming clients table to master_hospitals...");
  
  await db.execute(sql`ALTER TABLE clients RENAME TO master_hospitals;`);
  await db.execute(sql`TRUNCATE TABLE master_hospitals CASCADE;`);
  
  console.log("Table renamed and truncated. Now you can run drizzle-kit push");
  process.exit(0);
}

alter().catch(console.error);
