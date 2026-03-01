-- ============================================================
--  NexRail — Database Schema
--  PostgreSQL (hosted on Supabase)
-- ============================================================

-- ── Sequences ────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS users_user_id_seq;
CREATE SEQUENCE IF NOT EXISTS class_class_id_seq;
CREATE SEQUENCE IF NOT EXISTS train_route_details_id_seq;
CREATE SEQUENCE IF NOT EXISTS seat_availability_details_id_seq;
CREATE SEQUENCE IF NOT EXISTS train_fare_fare_id_seq;
CREATE SEQUENCE IF NOT EXISTS passenger_passenger_id_seq;

-- ── 1. zone ──────────────────────────────────────────────────
CREATE TABLE zone (
  zone_id   TEXT PRIMARY KEY,
  zone_name TEXT
);

-- ── 2. station ───────────────────────────────────────────────
CREATE TABLE station (
  station_code TEXT PRIMARY KEY,
  station_name TEXT UNIQUE,
  city         TEXT,
  state        TEXT,
  zone_id      TEXT REFERENCES zone(zone_id)
);

-- ── 3. users ─────────────────────────────────────────────────
CREATE TABLE users (
  user_id  INTEGER PRIMARY KEY DEFAULT nextval('users_user_id_seq'),
  name     TEXT,
  phone    TEXT,
  age      INTEGER,
  gender   TEXT,   -- 'M' | 'F' | 'O'
  email    TEXT,
  password TEXT    -- hashed
);

-- ── 4. class ────────────────────────────────────────────────
CREATE TABLE class (
  class_id        INTEGER PRIMARY KEY DEFAULT nextval('class_class_id_seq'),
  class_code      TEXT,   -- e.g. SL, 3A, 2A, 1A, CC, EC
  class_name      TEXT,
  seats_per_coach INTEGER
);

-- ── 5. train ────────────────────────────────────────────────
CREATE TABLE train (
  train_no               INTEGER PRIMARY KEY,
  train_name             TEXT,
  train_type             TEXT,   -- Express | Superfast | Rajdhani | ...
  train_running_days     TEXT,   -- comma-separated: Mon,Tue,Wed,...
  source_station_id      TEXT REFERENCES station(station_code),
  destination_station_id TEXT REFERENCES station(station_code),
  distance               INTEGER -- km
);

-- ── 6. train_route ──────────────────────────────────────────
CREATE TABLE train_route (
  details_id       INTEGER PRIMARY KEY DEFAULT nextval('train_route_details_id_seq'),
  train_code       INTEGER REFERENCES train(train_no),
  via_station_code TEXT    REFERENCES station(station_code),
  km_from_origin   INTEGER,
  reach_time       TIME
);

-- ── 7. train_fare ────────────────────────────────────────────
CREATE TABLE train_fare (
  fare_id  INTEGER PRIMARY KEY DEFAULT nextval('train_fare_fare_id_seq'),
  class_id INTEGER REFERENCES class(class_id),
  fare     NUMERIC
  -- Fixed fares: SL=500, 3A=1200, 2A=1800, 1A=3000
);

-- ── 8. seat_availability ─────────────────────────────────────
CREATE TABLE seat_availability (
  details_id   INTEGER PRIMARY KEY DEFAULT nextval('seat_availability_details_id_seq'),
  train_code   INTEGER REFERENCES train(train_no),
  journey_date DATE    NOT NULL,
  sleeper      INTEGER NOT NULL DEFAULT 0,
  "3ac"        INTEGER NOT NULL DEFAULT 0,
  "2ac"        INTEGER NOT NULL DEFAULT 0,
  "1ac"        INTEGER NOT NULL DEFAULT 0
);

-- ── 9. ticket_reservation ────────────────────────────────────
CREATE TABLE ticket_reservation (
  pnr_no       BIGINT  PRIMARY KEY,
  class_id     INTEGER NOT NULL REFERENCES class(class_id),
  user_id      INTEGER REFERENCES users(user_id),
  train_id     INTEGER REFERENCES train(train_no),
  from_station TEXT    REFERENCES station(station_code),
  to_station   TEXT    REFERENCES station(station_code),
  from_date    DATE,
  to_date      DATE,
  distance     INTEGER -- km
);

-- ── 10. passenger ────────────────────────────────────────────
CREATE TABLE passenger (
  passenger_id INTEGER PRIMARY KEY DEFAULT nextval('passenger_passenger_id_seq'),
  pnr_no       BIGINT  REFERENCES ticket_reservation(pnr_no),
  pax_name     TEXT,
  pax_age      INTEGER,
  pax_sex      TEXT,   -- 'M' | 'F' | 'O'
  seat_no      TEXT,
  fare         NUMERIC
);

-- ── 11. payment_info ─────────────────────────────────────────
CREATE TABLE payment_info (
  transaction_number  TEXT    PRIMARY KEY,
  pnr_no              BIGINT  REFERENCES ticket_reservation(pnr_no),
  user_id             INTEGER REFERENCES users(user_id),
  payment_date        DATE,
  fare                NUMERIC,
  mode                TEXT,   -- UPI | Credit Card | Debit Card | Net Banking | Cash
  confirmation_status TEXT    -- Confirmed | Cancelled | Waiting
);

-- ── 12. search_history ───────────────────────────────────────
CREATE TABLE search_history (
  userid         INTEGER NOT NULL REFERENCES users(user_id),
  from_stationid TEXT    NOT NULL REFERENCES station(station_code),
  to_stationid   TEXT    NOT NULL REFERENCES station(station_code)
);
