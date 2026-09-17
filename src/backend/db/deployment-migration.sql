-- Additive upgrade for existing MGM/CMC databases. Safe to run again.
CREATE TABLE IF NOT EXISTS areas (
  id text PRIMARY KEY,
  name varchar(150) NOT NULL,
  description text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS areas_name_lower_unique ON areas (lower(name));

CREATE TABLE IF NOT EXISTS area_hospitals (
  area_id text NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  hospital_id text NOT NULL REFERENCES master_hospitals(id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT area_hospitals_pk PRIMARY KEY (area_id, hospital_id),
  CONSTRAINT area_hospitals_hospital_id_unique UNIQUE (hospital_id)
);

ALTER TABLE machine_readings
  ADD COLUMN IF NOT EXISTS vessel_1 numeric(10,2),
  ADD COLUMN IF NOT EXISTS vessel_2 numeric(10,2);
ALTER TABLE machine_latest_readings
  ADD COLUMN IF NOT EXISTS vessel_1 numeric(10,2),
  ADD COLUMN IF NOT EXISTS vessel_2 numeric(10,2);

-- Required by the MQTT aggregator's ON CONFLICT target, including hypertables.
CREATE UNIQUE INDEX IF NOT EXISTS machine_readings_machine_terminal_unique
  ON machine_readings (machine_id, terminal_time);
