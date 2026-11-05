import "dotenv/config";
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "@/backend/db/schema";

const connectionString =
  process.env.DATABASE_URL ||
  (process.env.HOST_DB
    ? `postgresql://${encodeURIComponent(process.env.USERNAME_DB || 'postgres')}:${encodeURIComponent(process.env.PASSWORD_DB || '')}@${process.env.HOST_DB}:${process.env.PORT_DB || 5432}/${process.env.POSTGRES_DB || 'psa_db'}`
    : undefined);

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error on idle client:', err);
});

export { pool };
export const db = drizzle(pool, { schema });
