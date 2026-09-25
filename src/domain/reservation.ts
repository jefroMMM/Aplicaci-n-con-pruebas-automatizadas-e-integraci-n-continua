export interface CreateReservationInput {
  roomName: string;
  startsAt: Date;
  endsAt: Date;
}

export interface Reservation {
  id: string;
  roomName: string;
  startsAt: Date;
  endsAt: Date;
  createdAt: Date;
}

export interface ReservationRepository {
  create(input: CreateReservationInput): Promise<Reservation>;
  findById(id: string): Promise<Reservation | null>;
}

export class ReservationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReservationValidationError";
  }
}

export class ReservationConflictError extends Error {
  constructor(message = "La sala ya está reservada en ese horario") {
    super(message);
    this.name = "ReservationConflictError";
  }
}

export class ReservationService {
  static readonly maxDurationMs = 4 * 60 * 60 * 1000;

  constructor(
    private readonly repository: ReservationRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async create(input: CreateReservationInput): Promise<Reservation> {
    const roomName = input.roomName.trim();
    if (!roomName) {
      throw new ReservationValidationError("El nombre de la sala es obligatorio");
    }
    if (roomName.length > 100) {
      throw new ReservationValidationError("El nombre de la sala no puede superar 100 caracteres");
    }
    if (!Number.isFinite(input.startsAt.getTime()) || !Number.isFinite(input.endsAt.getTime())) {
      throw new ReservationValidationError("Las fechas deben ser válidas");
    }
    if (input.startsAt.getTime() <= this.now().getTime()) {
      throw new ReservationValidationError("La reserva debe comenzar en el futuro");
    }

    const durationMs = input.endsAt.getTime() - input.startsAt.getTime();
    if (durationMs <= 0) {
      throw new ReservationValidationError("La fecha de fin debe ser posterior a la de inicio");
    }
    if (durationMs > ReservationService.maxDurationMs) {
      throw new ReservationValidationError("La reserva no puede superar 4 horas");
    }

    return this.repository.create({ ...input, roomName });
  }

  async findById(id: string): Promise<Reservation | null> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      throw new ReservationValidationError("El identificador debe ser un UUID válido");
    }
    return this.repository.findById(id);
  }
}
