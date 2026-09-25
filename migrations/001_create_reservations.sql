CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name VARCHAR(100) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reservations_valid_period CHECK (ends_at > starts_at),
  CONSTRAINT reservations_no_room_overlap
    EXCLUDE USING gist (
      room_name WITH =,
      tstzrange(starts_at, ends_at, '[)') WITH &&
    )
);

CREATE INDEX reservations_starts_at_idx ON reservations (starts_at);
