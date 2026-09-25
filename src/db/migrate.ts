import "dotenv/config";
import { createPool } from "./pool.js";
import { runMigrations } from "./migration-runner.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL es obligatorio");

const pool = createPool(databaseUrl);
try {
  await runMigrations(pool);
} finally {
  await pool.end();
}
