import { describe, expect, it, vi } from "vitest";
import {
  ReservationConflictError,
  ReservationService,
  ReservationValidationError,
  type CreateReservationInput,
  type Reservation,
  type ReservationRepository,
} from "../../src/domain/reservation.js";

const fixedNow = new Date("2030-01-01T08:00:00.000Z");

function createReservationFixture(overrides: Partial<CreateReservationInput> = {}): CreateReservationInput {
  return {
    roomName: "Sala Norte",
    startsAt: new Date("2030-01-02T09:00:00.000Z"),
    endsAt: new Date("2030-01-02T10:00:00.000Z"),
    ...overrides,
  };
}

function createRepository(): ReservationRepository {
  const stored = new Map<string, Reservation>();
  return {
    async create(input) {
      const reservation: Reservation = {
        id: "98ef912e-6543-4eaa-941a-dc3842a705c8",
        ...input,
        createdAt: fixedNow,
      };
      stored.set(reservation.id, reservation);
      return reservation;
    },
    async findById(id) {
      return stored.get(id) ?? null;
    },
  };
}

describe("ReservationService", () => {
  it("crea una reserva válida y normaliza espacios en el nombre", async () => {
    const repository = createRepository();
    const service = new ReservationService(repository, () => fixedNow);

    const reservation = await service.create(createReservationFixture({ roomName: "  Sala Norte  " }));

    expect(reservation.roomName).toBe("Sala Norte");
    expect(reservation.startsAt).toEqual(new Date("2030-01-02T09:00:00.000Z"));
  });

  it("acepta una reserva en el límite máximo de cuatro horas", async () => {
    const service = new ReservationService(createRepository(), () => fixedNow);
    const startsAt = new Date("2030-01-02T09:00:00.000Z");

    const reservation = await service.create(createReservationFixture({
      startsAt,
      endsAt: new Date(startsAt.getTime() + ReservationService.maxDurationMs),
    }));

    expect(reservation.endsAt.getTime() - reservation.startsAt.getTime()).toBe(14_400_000);
  });

  it.each([
    ["nombre vacío", { roomName: "   " }],
    ["nombre sobre 100 caracteres", { roomName: "R".repeat(101) }],
    ["inicio pasado", { startsAt: new Date("2030-01-01T08:00:00.000Z") }],
    ["fin igual al inicio", { endsAt: new Date("2030-01-02T09:00:00.000Z") }],
    ["duración superior a cuatro horas", { endsAt: new Date("2030-01-02T13:00:00.001Z") }],
    ["fecha inválida", { startsAt: new Date(Number.NaN) }],
  ] as const)("rechaza %s", async (_caseName, overrides) => {
    const create = vi.fn(createRepository().create);
    const repository: ReservationRepository = { create, findById: vi.fn() };
    const service = new ReservationService(repository, () => fixedNow);

    await expect(service.create(createReservationFixture(overrides))).rejects.toBeInstanceOf(ReservationValidationError);
    expect(create).not.toHaveBeenCalled();
  });

  it("rechaza un UUID inválido antes de consultar el repositorio", async () => {
    const findById = vi.fn();
    const service = new ReservationService({ create: vi.fn(), findById }, () => fixedNow);

    await expect(service.findById("not-a-uuid")).rejects.toBeInstanceOf(ReservationValidationError);
    expect(findById).not.toHaveBeenCalled();
  });

  it("propaga el conflicto de horario informado por el repositorio", async () => {
    const service = new ReservationService({
      create: vi.fn().mockRejectedValue(new ReservationConflictError()),
      findById: vi.fn(),
    }, () => fixedNow);

    await expect(service.create(createReservationFixture())).rejects.toBeInstanceOf(ReservationConflictError);
  });
});
