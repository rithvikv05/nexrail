-- ============================================================
--  NexRail — Stored Procedures & Functions
--  PostgreSQL (hosted on Supabase)
--  All functions are exposed as PostgREST RPC endpoints
-- ============================================================


-- ════════════════════════════════════════════════════════════
--  AUTH
-- ════════════════════════════════════════════════════════════

-- Check if an email is already registered
CREATE OR REPLACE FUNCTION check_email_exists(p_email TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE email = p_email);
$$ LANGUAGE sql STABLE;

-- Register a new user (with duplicate-email guard)
CREATE OR REPLACE FUNCTION register_user(
  p_name     TEXT,
  p_email    TEXT,
  p_password TEXT,
  p_phone    TEXT,
  p_age      INTEGER,
  p_gender   TEXT
) RETURNS VOID AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Email already registered';
  END IF;
  INSERT INTO users (name, email, password, phone, age, gender)
  VALUES (p_name, p_email, p_password, p_phone, p_age, p_gender);
END;
$$ LANGUAGE plpgsql;

-- Validate credentials and return user info
CREATE OR REPLACE FUNCTION login_user(p_email TEXT, p_password TEXT)
RETURNS TABLE (user_id INTEGER, name TEXT, email TEXT) AS $$
  SELECT user_id, name, email
  FROM users
  WHERE email = p_email AND password = p_password;
$$ LANGUAGE sql STABLE;


-- ════════════════════════════════════════════════════════════
--  USER PROFILE
-- ════════════════════════════════════════════════════════════

-- Retrieve profile details for a user
CREATE OR REPLACE FUNCTION get_user_profile(p_user_id INTEGER)
RETURNS TABLE (user_id INTEGER, name TEXT, email TEXT, phone TEXT, age INTEGER, gender TEXT) AS $$
  SELECT user_id, name, email, phone, age, gender
  FROM users WHERE user_id = p_user_id;
$$ LANGUAGE sql STABLE;

-- Update profile (name, phone, age, gender)
CREATE OR REPLACE FUNCTION update_user_profile(
  p_user_id INTEGER,
  p_name    TEXT,
  p_phone   TEXT,
  p_age     INTEGER,
  p_gender  TEXT
) RETURNS VOID AS $$
  UPDATE users
  SET name = p_name, phone = p_phone, age = p_age, gender = p_gender
  WHERE user_id = p_user_id;
$$ LANGUAGE sql;

-- Change password
CREATE OR REPLACE FUNCTION change_password(p_user_id INTEGER, p_new_password TEXT)
RETURNS VOID AS $$
  UPDATE users SET password = p_new_password WHERE user_id = p_user_id;
$$ LANGUAGE sql;

-- Permanently delete user and all associated data
CREATE OR REPLACE FUNCTION delete_user(p_user_id INTEGER)
RETURNS VOID AS $$
BEGIN
  DELETE FROM payment_info      WHERE user_id = p_user_id;
  DELETE FROM passenger         WHERE pnr_no IN (SELECT pnr_no FROM ticket_reservation WHERE user_id = p_user_id);
  DELETE FROM ticket_reservation WHERE user_id = p_user_id;
  DELETE FROM search_history    WHERE userid  = p_user_id;
  DELETE FROM users             WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;


-- ════════════════════════════════════════════════════════════
--  TRAIN SEARCH
-- ════════════════════════════════════════════════════════════

-- Autocomplete — stations matching a name prefix
CREATE OR REPLACE FUNCTION fetch_from_stations(input_from TEXT)
RETURNS TABLE (city TEXT, station_name TEXT) AS $$
  SELECT city, station_name
  FROM station
  WHERE station_name ILIKE input_from || '%'
  ORDER BY station_name
  LIMIT 10;
$$ LANGUAGE sql STABLE;

-- Search trains between two stations on a given weekday
CREATE OR REPLACE FUNCTION search_trains(
  from_station_name TEXT,
  to_station_name   TEXT,
  train_day         TEXT
) RETURNS TABLE (
  train_no       INTEGER,
  train_name     TEXT,
  train_type     TEXT,
  departure_time TIME,
  arrival_time   TIME
) AS $$
  SELECT DISTINCT
    t.train_no,
    t.train_name,
    t.train_type,
    r1.reach_time AS departure_time,
    r2.reach_time AS arrival_time
  FROM train t
  JOIN train_route r1 ON r1.train_code = t.train_no
  JOIN train_route r2 ON r2.train_code = t.train_no
  JOIN station    s1 ON s1.station_code = r1.via_station_code
  JOIN station    s2 ON s2.station_code = r2.via_station_code
  WHERE s1.station_name ILIKE from_station_name
    AND s2.station_name ILIKE to_station_name
    AND r1.km_from_origin < r2.km_from_origin
    AND (t.train_running_days ILIKE '%' || train_day || '%' OR t.train_running_days IS NULL);
$$ LANGUAGE sql STABLE;

-- Full route schedule (all stops) for a train
CREATE OR REPLACE FUNCTION get_train_schedule(input_train_code INTEGER)
RETURNS TABLE (
  stop_no          BIGINT,
  train_name       TEXT,
  via_station_code TEXT,
  station_name     TEXT,
  city             TEXT,
  km_from_origin   INTEGER,
  reach_time       TIME
) AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY r.km_from_origin) AS stop_no,
    t.train_name,
    r.via_station_code,
    s.station_name,
    s.city,
    r.km_from_origin,
    r.reach_time
  FROM train_route r
  JOIN train   t ON t.train_no    = r.train_code
  JOIN station s ON s.station_code = r.via_station_code
  WHERE r.train_code = input_train_code
  ORDER BY r.km_from_origin;
$$ LANGUAGE sql STABLE;

-- Check available seats for a class on a journey date
CREATE OR REPLACE FUNCTION check_seat_availability(
  input_train_code  INTEGER,
  input_class_name  TEXT,
  input_journey_date DATE
) RETURNS TABLE (no_of_seats INTEGER) AS $$
  SELECT
    CASE LOWER(input_class_name)
      WHEN 'sleeper' THEN sleeper
      WHEN '3ac'     THEN "3ac"
      WHEN '2ac'     THEN "2ac"
      WHEN '1ac'     THEN "1ac"
      ELSE NULL
    END
  FROM seat_availability
  WHERE train_code   = input_train_code
    AND journey_date = input_journey_date;
$$ LANGUAGE sql STABLE;

-- Fixed fare for a class by class code
CREATE OR REPLACE FUNCTION get_fare(input_class_code TEXT)
RETURNS NUMERIC AS $$
  SELECT f.fare
  FROM train_fare f
  JOIN class c ON c.class_id = f.class_id
  WHERE c.class_code = input_class_code
  LIMIT 1;
$$ LANGUAGE sql STABLE;


-- ════════════════════════════════════════════════════════════
--  SEARCH HISTORY
-- ════════════════════════════════════════════════════════════

-- Log a train search for a user
CREATE OR REPLACE FUNCTION add_to_search_table(
  user_code         INTEGER,
  from_station_name TEXT,
  to_station_name   TEXT
) RETURNS VOID AS $$
DECLARE
  v_from TEXT;
  v_to   TEXT;
BEGIN
  SELECT station_code INTO v_from FROM station WHERE station_name ILIKE from_station_name LIMIT 1;
  SELECT station_code INTO v_to   FROM station WHERE station_name ILIKE to_station_name   LIMIT 1;
  IF v_from IS NOT NULL AND v_to IS NOT NULL THEN
    INSERT INTO search_history (userid, from_stationid, to_stationid)
    VALUES (user_code, v_from, v_to);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Origin stations from a user's search history
CREATE OR REPLACE FUNCTION fetch_from_history(user_code INTEGER)
RETURNS TABLE (city TEXT, station_name TEXT) AS $$
  SELECT DISTINCT s.city, s.station_name
  FROM search_history h
  JOIN station s ON s.station_code = h.from_stationid
  WHERE h.userid = user_code
  LIMIT 10;
$$ LANGUAGE sql STABLE;

-- Destination stations from a user's search history
CREATE OR REPLACE FUNCTION fetch_to_history(user_code INTEGER)
RETURNS TABLE (city TEXT, station_name TEXT) AS $$
  SELECT DISTINCT s.city, s.station_name
  FROM search_history h
  JOIN station s ON s.station_code = h.to_stationid
  WHERE h.userid = user_code
  LIMIT 10;
$$ LANGUAGE sql STABLE;


-- ════════════════════════════════════════════════════════════
--  BOOKING FLOW
-- ════════════════════════════════════════════════════════════

-- Create a new ticket reservation and return the generated PNR
CREATE OR REPLACE FUNCTION create_reservation(
  user_code              INTEGER,
  input_train_code       INTEGER,
  input_class_name       TEXT,
  input_from_station_name TEXT,
  input_to_station_name  TEXT,
  travel_from_date       DATE,
  travel_to_date         DATE
) RETURNS TABLE (pnr_no BIGINT) AS $$
DECLARE
  v_class_id   INTEGER;
  v_from_code  TEXT;
  v_to_code    TEXT;
  v_pnr        BIGINT;
  v_dist       INTEGER;
BEGIN
  SELECT class_id INTO v_class_id FROM class WHERE class_name ILIKE input_class_name LIMIT 1;
  SELECT station_code INTO v_from_code FROM station WHERE station_name ILIKE input_from_station_name LIMIT 1;
  SELECT station_code INTO v_to_code   FROM station WHERE station_name ILIKE input_to_station_name   LIMIT 1;

  SELECT COALESCE(
    (SELECT r2.km_from_origin - r1.km_from_origin
     FROM train_route r1 JOIN train_route r2
       ON r2.train_code = r1.train_code
     WHERE r1.train_code = input_train_code
       AND r1.via_station_code = v_from_code
       AND r2.via_station_code = v_to_code
     LIMIT 1), 0
  ) INTO v_dist;

  v_pnr := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;

  INSERT INTO ticket_reservation
    (pnr_no, class_id, user_id, train_id, from_station, to_station, from_date, to_date, distance)
  VALUES
    (v_pnr, v_class_id, user_code, input_train_code, v_from_code, v_to_code, travel_from_date, travel_to_date, v_dist);

  RETURN QUERY SELECT v_pnr;
END;
$$ LANGUAGE plpgsql;

-- Add a passenger row to an existing PNR
CREATE OR REPLACE FUNCTION add_passenger(
  pnr_number     INTEGER,
  passenger_name TEXT,
  passenger_age  INTEGER,
  passenger_sex  TEXT,
  allocated_seat TEXT,
  ticket_fare    NUMERIC
) RETURNS TABLE (pnr_no BIGINT, pax_name TEXT, pax_age INTEGER, pax_sex TEXT, seat_no TEXT, fare NUMERIC) AS $$
BEGIN
  INSERT INTO passenger (pnr_no, pax_name, pax_age, pax_sex, seat_no, fare)
  VALUES (pnr_number, passenger_name, passenger_age, passenger_sex, allocated_seat, ticket_fare);

  RETURN QUERY
    SELECT p.pnr_no, p.pax_name, p.pax_age, p.pax_sex, p.seat_no, p.fare
    FROM passenger p
    WHERE p.pnr_no = pnr_number AND p.pax_name = passenger_name;
END;
$$ LANGUAGE plpgsql;

-- Record a payment for a PNR
CREATE OR REPLACE FUNCTION make_payment(
  trans_no   TEXT,
  pnr_number INTEGER,
  user_code  INTEGER,
  pay_date   DATE,
  amount     NUMERIC,
  pay_mode   TEXT
) RETURNS TABLE (pnr_no BIGINT, transaction_number TEXT, confirmation_status TEXT) AS $$
BEGIN
  INSERT INTO payment_info
    (transaction_number, pnr_no, user_id, payment_date, fare, mode, confirmation_status)
  VALUES
    (trans_no, pnr_number, user_code, pay_date, amount, pay_mode, 'Waiting');

  RETURN QUERY
    SELECT pi.pnr_no, pi.transaction_number, pi.confirmation_status
    FROM payment_info pi WHERE pi.transaction_number = trans_no;
END;
$$ LANGUAGE plpgsql;

-- Confirm a booking after successful payment
CREATE OR REPLACE FUNCTION confirm_booking(pnr_number INTEGER)
RETURNS VOID AS $$
  UPDATE payment_info SET confirmation_status = 'Confirmed' WHERE pnr_no = pnr_number;
$$ LANGUAGE sql;

-- Decrement/increment available seat count after booking
CREATE OR REPLACE FUNCTION update_seat_availability(
  input_train_code   INTEGER,
  input_class_code   TEXT,
  input_journey_date DATE,
  delta              INTEGER DEFAULT -1
) RETURNS VOID AS $$
BEGIN
  UPDATE seat_availability
  SET
    sleeper = CASE WHEN input_class_code = 'SL' THEN sleeper + delta ELSE sleeper END,
    "3ac"   = CASE WHEN input_class_code = '3A' THEN "3ac"   + delta ELSE "3ac"   END,
    "2ac"   = CASE WHEN input_class_code = '2A' THEN "2ac"   + delta ELSE "2ac"   END,
    "1ac"   = CASE WHEN input_class_code = '1A' THEN "1ac"   + delta ELSE "1ac"   END
  WHERE train_code   = input_train_code
    AND journey_date = input_journey_date;
END;
$$ LANGUAGE plpgsql;

-- Full ticket + passenger + payment details for a PNR
CREATE OR REPLACE FUNCTION get_pnr_details(pnr_number INTEGER)
RETURNS TABLE (
  pnr_no              BIGINT,
  train_id            INTEGER,
  train_name          TEXT,
  from_station        TEXT,
  to_station          TEXT,
  from_date           DATE,
  to_date             DATE,
  distance            INTEGER,
  pax_name            TEXT,
  pax_age             INTEGER,
  pax_sex             TEXT,
  seat_no             TEXT,
  passenger_fare      NUMERIC,
  total_fare          NUMERIC,
  transaction_number  TEXT,
  payment_date        DATE,
  mode                TEXT,
  confirmation_status TEXT
) AS $$
  SELECT
    tr.pnr_no,
    tr.train_id,
    t.train_name,
    tr.from_station,
    tr.to_station,
    tr.from_date,
    tr.to_date,
    tr.distance,
    p.pax_name,
    p.pax_age,
    p.pax_sex,
    p.seat_no,
    p.fare                    AS passenger_fare,
    pi.fare                   AS total_fare,
    pi.transaction_number,
    pi.payment_date,
    pi.mode,
    pi.confirmation_status
  FROM ticket_reservation tr
  JOIN train         t  ON t.train_no  = tr.train_id
  JOIN passenger     p  ON p.pnr_no    = tr.pnr_no
  JOIN payment_info  pi ON pi.pnr_no   = tr.pnr_no
  WHERE tr.pnr_no = pnr_number;
$$ LANGUAGE sql STABLE;

-- All bookings for a user
CREATE OR REPLACE FUNCTION fetch_user_reservations(user_code INTEGER)
RETURNS TABLE (
  pnr_no            BIGINT,
  train_name        TEXT,
  from_station_name TEXT,
  to_station_name   TEXT,
  booking_status    TEXT
) AS $$
  SELECT
    tr.pnr_no,
    t.train_name,
    tr.from_station AS from_station_name,
    tr.to_station   AS to_station_name,
    COALESCE(pi.confirmation_status, 'Pending') AS booking_status
  FROM ticket_reservation tr
  JOIN train t ON t.train_no = tr.train_id
  LEFT JOIN payment_info pi ON pi.pnr_no = tr.pnr_no
  WHERE tr.user_id = user_code
  ORDER BY tr.pnr_no DESC;
$$ LANGUAGE sql STABLE;

-- Refund status for a transaction
CREATE OR REPLACE FUNCTION get_refund_status(p_transaction_number TEXT)
RETURNS TABLE (transaction_number TEXT, refund_status TEXT) AS $$
  SELECT transaction_number, confirmation_status AS refund_status
  FROM payment_info
  WHERE transaction_number = p_transaction_number;
$$ LANGUAGE sql STABLE;


-- ════════════════════════════════════════════════════════════
--  ADMIN
-- ════════════════════════════════════════════════════════════

-- Create a new train record (full details)
CREATE OR REPLACE FUNCTION admin_create_train(
  input_train_no               INTEGER,
  input_train_name             TEXT,
  input_train_type             TEXT,
  input_train_running_days     TEXT    DEFAULT NULL,
  input_source_station_id      TEXT    DEFAULT NULL,
  input_destination_station_id TEXT    DEFAULT NULL,
  input_distance               INTEGER DEFAULT NULL
) RETURNS VOID AS $$
  INSERT INTO train (train_no, train_name, train_type, train_running_days, source_station_id, destination_station_id, distance)
  VALUES (input_train_no, input_train_name, input_train_type, input_train_running_days, input_source_station_id, input_destination_station_id, input_distance);
$$ LANGUAGE sql;

-- Add a via-station stop to a train route
CREATE OR REPLACE FUNCTION admin_add_stop(
  input_train_code       INTEGER,
  input_via_station_code TEXT,
  input_km_from_origin   INTEGER DEFAULT NULL,
  input_reach_time       TEXT    DEFAULT NULL
) RETURNS VOID AS $$
  INSERT INTO train_route (train_code, via_station_code, km_from_origin, reach_time)
  VALUES (input_train_code, input_via_station_code, input_km_from_origin, input_reach_time::TIME);
$$ LANGUAGE sql;

-- Set seat availability for a train on a specific date
CREATE OR REPLACE FUNCTION admin_add_seat_avail(
  input_train_code   INTEGER,
  input_journey_date DATE,
  input_sleeper      INTEGER DEFAULT 0,
  input_3ac          INTEGER DEFAULT 0,
  input_2ac          INTEGER DEFAULT 0,
  input_1ac          INTEGER DEFAULT 0
) RETURNS VOID AS $$
  INSERT INTO seat_availability (train_code, journey_date, sleeper, "3ac", "2ac", "1ac")
  VALUES (input_train_code, input_journey_date, input_sleeper, input_3ac, input_2ac, input_1ac)
  ON CONFLICT DO NOTHING;
$$ LANGUAGE sql;

-- Delete a train and all associated data
CREATE OR REPLACE FUNCTION admin_delete_train(input_train_no INTEGER)
RETURNS VOID AS $$
BEGIN
  DELETE FROM payment_info
    WHERE pnr_no IN (SELECT pnr_no FROM ticket_reservation WHERE train_id = input_train_no);
  DELETE FROM passenger
    WHERE pnr_no IN (SELECT pnr_no FROM ticket_reservation WHERE train_id = input_train_no);
  DELETE FROM ticket_reservation WHERE train_id    = input_train_no;
  DELETE FROM seat_availability  WHERE train_code  = input_train_no;
  DELETE FROM train_route        WHERE train_code  = input_train_no;
  DELETE FROM train              WHERE train_no    = input_train_no;
END;
$$ LANGUAGE plpgsql;
