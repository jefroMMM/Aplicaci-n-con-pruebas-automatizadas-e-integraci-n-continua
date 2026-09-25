import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import {
  ReservationConflictError,
  ReservationService,
  ReservationValidationError,
} from "./domain/reservation.js";

export function buildApp(service: ReservationService) {
  const app = Fastify({ logger: true });
  app.register(fastifyStatic, {
    root: path.resolve(process.cwd(), "public"),
    prefix: "/",
  });

  app.get("/health", async () => ({ status: "ok" }));

  app.post<{ Body: { roomName?: unknown; startsAt?: unknown; endsAt?: unknown } }>(
    "/reservations",
    async (request, reply) => {
      const { roomName, startsAt, endsAt } = request.body ?? {};
      if (typeof roomName !== "string" || typeof startsAt !== "string" || typeof endsAt !== "string") {
        return reply.code(400).send({ error: "roomName, startsAt y endsAt son obligatorios" });
      }
      try {
        const reservation = await service.create({
          roomName,
          startsAt: new Date(startsAt),
          endsAt: new Date(endsAt),
        });
        return reply.code(201).send(reservation);
      } catch (error) {
        if (error instanceof ReservationValidationError) return reply.code(400).send({ error: error.message });
        if (error instanceof ReservationConflictError) return reply.code(409).send({ error: error.message });
        request.log.error(error);
        return reply.code(500).send({ error: "Error interno" });
      }
    },
  );

  app.get<{ Params: { id: string } }>("/reservations/:id", async (request, reply) => {
    try {
      const reservation = await service.findById(request.params.id);
      if (!reservation) return reply.code(404).send({ error: "Reserva no encontrada" });
      return reservation;
    } catch (error) {
      if (error instanceof ReservationValidationError) return reply.code(400).send({ error: error.message });
      request.log.error(error);
      return reply.code(500).send({ error: "Error interno" });
    }
  });

  return app;
}
