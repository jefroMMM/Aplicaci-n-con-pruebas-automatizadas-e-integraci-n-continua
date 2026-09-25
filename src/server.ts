import "dotenv/config";
import { buildApp } from "./app.js";
import { createPool } from "./db/pool.js";
import { PostgresReservationRepository } from "./db/postgres-reservation-repository.js";
import { ReservationService } from "./domain/reservation.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL es obligatorio; configura .env desde .env.example");

const pool = createPool(databaseUrl);
const app = buildApp(new ReservationService(new PostgresReservationRepository(pool)));
const port = Number(process.env.PORT ?? 3000);

try {
  await app.listen({ host: "0.0.0.0", port });
} catch (error) {
  app.log.error(error);
  await pool.end();
  process.exit(1);
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await app.close();
    await pool.end();
    process.exit(0);
  });
}
