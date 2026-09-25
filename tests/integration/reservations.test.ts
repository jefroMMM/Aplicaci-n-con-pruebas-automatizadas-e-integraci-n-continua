import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import pg from "pg";
import { PostgresReservationRepository } from "../../src/db/postgres-reservation-repository.js";
import { ReservationConflictError, ReservationService } from "../../src/domain/reservation.js";
import { runMigrations } from "../../src/db/migration-runner.js";

const { Pool } = pg;
let container: StartedPostgreSqlContainer;
let pool: InstanceType<typeof Pool>;
let service: ReservationService;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  pool = new Pool({ connectionString: container.getConnectionUri() });
  await runMigrations(pool);
  service = new ReservationService(new PostgresReservationRepository(pool), () => new Date("2030-01-01T00:00:00Z"));
}, 120_000);

beforeEach(async () => {
  await pool.query("TRUNCATE TABLE reservations");
});

afterAll(async () => {
  if (pool) await pool.end();
  if (container) await container.stop();
});

describe("PostgresReservationRepository con PostgreSQL temporal", () => {
  it("escribe una reserva y la recupera desde PostgreSQL", async () => {
    const created = await service.create({
      roomName: "Laboratorio",
      startsAt: new Date("2030-01-02T09:00:00Z"),
      endsAt: new Date("2030-01-02T10:30:00Z"),
    });

    const recovered = await service.findById(created.id);

    expect(recovered).toMatchObject({ id: created.id, roomName: "Laboratorio" });
    expect(recovered?.startsAt.toISOString()).toBe("2030-01-02T09:00:00.000Z");
    expect(recovered?.endsAt.toISOString()).toBe("2030-01-02T10:30:00.000Z");
  });

  it("rechaza reservas que se superponen en la misma sala y permite salas distintas", async () => {
    const first = {
      roomName: "Sala A",
      startsAt: new Date("2030-01-02T09:00:00Z"),
      endsAt: new Date("2030-01-02T10:00:00Z"),
    };
    await service.create(first);

    await expect(service.create({
      ...first,
      startsAt: new Date("2030-01-02T09:30:00Z"),
      endsAt: new Date("2030-01-02T10:30:00Z"),
    })).rejects.toBeInstanceOf(ReservationConflictError);

    const otherRoom = await service.create({ ...first, roomName: "Sala B" });
    expect(otherRoom.roomName).toBe("Sala B");
  });
});
