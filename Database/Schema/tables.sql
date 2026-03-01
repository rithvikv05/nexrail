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


Keys:
ALTER TABLE users
ADD PRIMARY KEY (user_id);





ALTER TABLE zone
ADD PRIMARY KEY (zone_id);



ALTER TABLE station
ADD PRIMARY KEY (station_code);



ALTER TABLE train
ADD PRIMARY KEY (train_no);



ALTER TABLE class
ADD PRIMARY KEY (class_id);



ALTER TABLE ticket_reservation
ADD PRIMARY KEY (pnr_no);



ALTER TABLE passenger
ADD PRIMARY KEY (passenger_id);





ALTER TABLE refund_rule
ADD PRIMARY KEY (transaction_number);



ALTER TABLE train_route
ADD PRIMARY KEY (details_id);




ALTER TABLE seat_availability
ADD PRIMARY KEY (details_id);

ALTER TABLE train_fare
ADD PRIMARY KEY (fare_id);




FOREIGN KEYS:

ALTER TABLE station
ADD CONSTRAINT fk_station_zone
FOREIGN KEY (zone_id)
REFERENCES zone(zone_id);



ALTER TABLE train
ADD CONSTRAINT fk_train_source
FOREIGN KEY (source_station_id)
REFERENCES station(station_code);


ALTER TABLE train
ADD CONSTRAINT fk_train_destination
FOREIGN KEY (destination_station_id)
REFERENCES station(station_code);



ALTER TABLE train_route
ADD CONSTRAINT fk_route_train
FOREIGN KEY (train_code)
REFERENCES train(train_no);


ALTER TABLE train_route
ADD CONSTRAINT fk_route_station


FOREIGN KEY (via_station_code)
REFERENCES station(station_code);
ALTER TABLE seat_availability
ADD CONSTRAINT fk_seat_train
FOREIGN KEY (train_code)
REFERENCES train(train_no);


ALTER TABLE seat_availability
ADD CONSTRAINT fk_seat_class
FOREIGN KEY (class_id)
REFERENCES class(class_id)

ALTER TABLE train_fare
ADD CONSTRAINT fk_fare_class
FOREIGN KEY (class_id)
REFERENCES class(class_id);


ALTER TABLE train_fare
ADD CONSTRAINT fk_fare_from
FOREIGN KEY (from_station)
REFERENCES station(station_code);


ALTER TABLE train_fare
ADD CONSTRAINT fk_fare_to
FOREIGN KEY (to_station)
REFERENCES station(station_code);



ALTER TABLE ticket_reservation
ADD CONSTRAINT fk_ticket_user
FOREIGN KEY (user_id)
REFERENCES users(user_id);


ALTER TABLE ticket_reservation
ADD CONSTRAINT fk_ticket_train
FOREIGN KEY (train_id)
REFERENCES train(train_no);


ALTER TABLE ticket_reservation
ADD CONSTRAINT fk_ticket_from
FOREIGN KEY (from_station)
REFERENCES station(station_code);


ALTER TABLE ticket_reservation
ADD CONSTRAINT fk_ticket_to
FOREIGN KEY (to_station)
REFERENCES station(station_code);

ALTER TABLE passenger
ADD CONSTRAINT fk_passenger_ticket
FOREIGN KEY (pnr_no)
REFERENCES ticket_reservation(pnr_no);

ALTER TABLE payment_info
ADD CONSTRAINT fk_payment_ticket
FOREIGN KEY (pnr_no)
REFERENCES ticket_reservation(pnr_no);

ALTER TABLE payment_info
ADD CONSTRAINT fk_payment_user
FOREIGN KEY (user_id)
REFERENCES users(user_id);

ALTER TABLE refund_rule
ADD CONSTRAINT fk_refund_payment
FOREIGN KEY (transaction_number)
REFERENCES payment_info(transaction_number);

ALTER TABLE ticket_reservation
ADD COLUMN class_id INT;

UPDATE ticket_reservation
SET class_id = 2;

ALTER TABLE ticket_reservation
ADD CONSTRAINT fk_class
FOREIGN KEY (class_id)
REFERENCES class(class_id);

ALTER TABLE ticket_reservation
ALTER COLUMN class_id SET NOT NULL;

ALTER TABLE seat_availability
ADD COLUMN journey_date DATE NOT NULL;
