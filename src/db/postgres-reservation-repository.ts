import type { Pool } from "pg";
import {
  ReservationConflictError,
  type CreateReservationInput,
  type Reservation,
  type ReservationRepository,
} from "../domain/reservation.js";

interface ReservationRow {
  id: string;
  room_name: string;
  starts_at: Date;
  ends_at: Date;
  created_at: Date;
}

function toReservation(row: ReservationRow): Reservation {
  return {
    id: row.id,
    roomName: row.room_name,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
  };
}

export class PostgresReservationRepository implements ReservationRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateReservationInput): Promise<Reservation> {
    try {
      const result = await this.pool.query<ReservationRow>(
        `INSERT INTO reservations (room_name, starts_at, ends_at)
         VALUES ($1, $2, $3)
         RETURNING id, room_name, starts_at, ends_at, created_at`,
        [input.roomName, input.startsAt, input.endsAt],
      );
      return toReservation(result.rows[0]!);
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23P01") {
        throw new ReservationConflictError();
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Reservation | null> {
    const result = await this.pool.query<ReservationRow>(
      `SELECT id, room_name, starts_at, ends_at, created_at
       FROM reservations WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? toReservation(result.rows[0]) : null;
  }
}
