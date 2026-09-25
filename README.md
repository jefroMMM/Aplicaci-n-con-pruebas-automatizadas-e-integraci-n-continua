# Reservas de salas

Aplicación en TypeScript para registrar y consultar reservas de salas de una universidad. Incluye una interfaz web, una API REST y persistencia PostgreSQL. Las reglas se aplican en la capa de negocio y mediante una restricción de integridad de la base.

## Reglas de negocio

- El nombre de la sala es obligatorio, se recortan sus espacios laterales y acepta hasta 100 caracteres.
- La reserva debe comenzar en el futuro y su fecha de fin debe ser posterior a la de inicio.
- Una reserva puede durar hasta 4 horas, inclusive.
- La misma sala no puede tener reservas con horarios superpuestos. El intervalo de fin es abierto: una reserva puede comenzar justo cuando termina otra.
- Una sala distinta puede reservarse en el mismo horario.
- Las fechas de la API se envían en formato ISO 8601 con zona horaria.

## Requisitos

- Node.js 22 o superior y pnpm.
- Docker Desktop (o un daemon Docker compatible). Docker Compose se usa para ejecutar la aplicación; Testcontainers necesita Docker para las pruebas de integración.

## Ejecutar con Docker Compose

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Compose inicia PostgreSQL y la aplicación. Al iniciar, la API aplica las migraciones pendientes y compila la interfaz. Abre `http://localhost:3000` en el navegador; PostgreSQL queda en `localhost:5432`. Para detenerla: `docker compose down`; para borrar también los datos locales: `docker compose down -v`.

Los valores de `.env.example` son únicamente credenciales locales de demostración. `.env` está excluido por Git. Cámbialos antes de exponer el servicio fuera de tu equipo.

### Ejecutar la API directamente con pnpm

Primero inicia PostgreSQL y prepara el archivo de entorno:

```powershell
Copy-Item .env.example .env
docker compose up -d db
pnpm install --frozen-lockfile
pnpm migrate
pnpm dev
```

El servidor compila la interfaz automáticamente al iniciar. Abre `http://localhost:3000`. La API requiere `DATABASE_URL`; `PORT` es opcional y por defecto usa `3000`.

## Interfaz y API

La página principal permite registrar una reserva y consultar una reserva por UUID. También se puede usar la API directamente:

Crear una reserva:

```powershell
curl.exe -X POST http://localhost:3000/reservations `
  -H "Content-Type: application/json" `
  -d '{"roomName":"Laboratorio","startsAt":"2030-01-02T09:00:00Z","endsAt":"2030-01-02T10:00:00Z"}'
```

La respuesta exitosa tiene estado `201` e incluye el UUID de la reserva. Consultarla:

```powershell
curl.exe http://localhost:3000/reservations/UUID_DEVUELTO
```

`GET /health` verifica que el proceso de la API responde. La API devuelve `400` ante datos inválidos, `404` si el UUID no existe y `409` si la sala ya está ocupada en ese horario.

## Pruebas

Instala dependencias con el lockfile:

```powershell
pnpm install --frozen-lockfile
```

Ejecuta las suites separadamente y sin modo watch:

```powershell
pnpm test:unit
pnpm test:integration
```

O ambas en secuencia:

```powershell
pnpm test
```

Las pruebas unitarias usan un repositorio de prueba para mantener la lógica aislada de PostgreSQL y verifican éxito, límites, entradas inválidas y conflictos. Las pruebas de integración arrancan un PostgreSQL temporal con `@testcontainers/postgresql`, obtienen de ese contenedor la URL de conexión, aplican las migraciones y ejercitan `PostgresReservationRepository` real. Cada prueba limpia sus filas y al final se cierran el pool y el contenedor.

La base que Testcontainers crea es independiente de la base local del Compose: el conjunto de pruebas de integración no lee `DATABASE_URL` ni utiliza el contenedor persistente `db`. Requiere que Docker esté iniciado.

## Diseño

- `src/domain/reservation.ts`: reglas y servicio de negocio, sin dependencia de PostgreSQL.
- `src/db/postgres-reservation-repository.ts`: persistencia PostgreSQL mediante consultas parametrizadas.
- `migrations/`: esquema versionado, incluyendo una restricción de exclusión GiST que evita solapamientos concurrentes por sala.
- `tests/unit/` y `tests/integration/`: suites separadas de Vitest.
- `.github/workflows/ci.yml`: en `push` y `pull_request`, instala desde `pnpm-lock.yaml`, comprueba tipos y ejecuta las dos suites en un runner Linux con Docker.

## Evidencia de entrega

Antes de entregar en Canvas, añade al PDF capturas de la API funcionando, de cada suite y del workflow exitoso en GitHub Actions. El PDF debe incluir el enlace al repositorio, el enlace a la ejecución de Actions y el enlace público del video explicativo (máximo 3 minutos). En el video muestra la API conectada a PostgreSQL, una regla unitaria, la prueba de integración con el contenedor temporal y las dos suites en Actions. La evidencia debe corresponder al commit entregado; no incluyas el archivo `.env` ni credenciales.
