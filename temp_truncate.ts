import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
import { db } from './src/backend/db/index';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    await db.execute(sql`TRUNCATE TABLE master_hospitals CASCADE`);
    console.log('Tables truncated successfully');
  } catch (error) {
    console.error('Error truncating tables:', error);
  } finally {
    process.exit(0);
  }
}
run();
