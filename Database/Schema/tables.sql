CREATE TABLE users (
    user_id SERIAL,
    name TEXT,
    phone TEXT,
    age INT,
    gender TEXT,
    email TEXT,
    password TEXT
);


CREATE TABLE zone (
    zone_id TEXT,
    zone_name TEXT
);

CREATE TABLE station (
    station_code TEXT,
    station_name TEXT,
    city TEXT,
    state TEXT,
    zone_id TEXT
);

CREATE TABLE train (
    train_no INT,
    train_name TEXT,
    train_type TEXT,
    train_running_days TEXT,
    source_station_id TEXT,
    destination_station_id TEXT,
    distance INT
);

CREATE TABLE class (
    class_id SERIAL,
    class_code TEXT,
    class_name TEXT,
    seats_per_coach INT
);


CREATE TABLE train_fare (
   fare_id SERIAL,
   class_id INT,
   fare NUMERIC
);



CREATE TABLE ticket_reservation (
   pnr_no BIGINT,
   user_id INT,
   train_id INT,
   from_station TEXT,
   to_station TEXT,
   from_date DATE,
   to_date DATE,
   distance INT
);



CREATE TABLE passenger (
   passenger_id SERIAL,
   pnr_no BIGINT,
   pax_name TEXT,
   pax_age INT,
   pax_sex TEXT,
   seat_no TEXT,
   fare NUMERIC
);



CREATE TABLE payment_info (
   transaction_number TEXT,
   pnr_no BIGINT,
   user_id INT,
   payment_date DATE,
   fare NUMERIC,
   mode TEXT,
   confirmation_status TEXT
);



CREATE TABLE seat_availability (
   details_id SERIAL,
   train_code INT,
   class_id INT,
   no_of_seats INT
);



CREATE TABLE train_route (
   details_id SERIAL,
   train_code INT,
   via_station_code TEXT,
   via_station_name TEXT,
   km_from_origin INT,
   reach_time TIME
);


CREATE TABLE payment_info (
    transaction_number TEXT PRIMARY KEY,
    pnr_no BIGINT,
    user_id INT,
    payment_date DATE,
    fare NUMERIC,
    mode TEXT,
    confirmation_status TEXT,
    FOREIGN KEY (pnr_no) REFERENCES ticket_reservation(pnr_no),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

ALTER TABLE ticket_reservation
ADD COLUMN class_id INT;

UPDATE ticket_reservation
SET class_id = 2;
