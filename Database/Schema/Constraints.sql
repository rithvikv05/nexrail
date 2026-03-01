--Primary keys
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

--Foreign keys
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
REFERENCES class(class_id);

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

ALTER TABLE ticket_reservation
ADD CONSTRAINT fk_class
FOREIGN KEY (class_id)
REFERENCES class(class_id);

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

--Not NULL constraints
ALTER TABLE ticket_reservation
ALTER COLUMN class_id SET NOT NULL;

ALTER TABLE seat_availability
ADD COLUMN journey_date DATE NOT NULL;

ALTER TABLE payment_info
ALTER COLUMN fare SET NOT NULL;

ALTER TABLE payment_info
ALTER COLUMN mode SET NOT NULL;

ALTER TABLE payment_info
ALTER COLUMN confirmation_status SET NOT NULL;

--Check/domain constraints
ALTER TABLE public.class
ADD CONSTRAINT seats_positive
CHECK (seats_per_coach > 0);

ALTER TABLE passenger
ADD CONSTRAINT pax_name_domain
CHECK (
  length(trim(pax_name)) > 0
  AND pax_name ~ '^[A-Za-z ]+$'
);

ALTER TABLE passenger
ADD CONSTRAINT pax_sex_domain
CHECK (pax_sex IN ('M', 'F', 'O'));

ALTER TABLE passenger
ADD CONSTRAINT fare_domain
CHECK (fare > 0);

ALTER TABLE payment_info
ADD CONSTRAINT chk_fare_positive
CHECK (fare > 0);

ALTER TABLE payment_info
ADD CONSTRAINT chk_payment_mode
CHECK (mode IN ('UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Cash'));

ALTER TABLE payment_info
ADD CONSTRAINT chk_confirmation_status
CHECK (confirmation_status IN ('Pending', 'SUCCESS', 'FAILED','Confirmed','Cancelled'));

ALTER TABLE seat_availability
ADD CONSTRAINT chk_all_seats_non_negative
CHECK (
    sleeper >= 0 AND
    "1ac" >= 0 AND
    "2ac" >= 0 AND
    "3ac" >= 0
);

ALTER TABLE ticket_reservation
ADD CONSTRAINT chk_date_and_distance_valid
CHECK (
    from_date <= to_date AND
    distance >= 0
);

ALTER TABLE train_route
ADD CONSTRAINT chk_km_from_origin_non_negative
CHECK (km_from_origin >= 0);

ALTER TABLE users
ADD CONSTRAINT chk_name_not_empty
CHECK (length(trim(name)) > 0);

ALTER TABLE users
ADD CONSTRAINT chk_phone_format
CHECK (phone ~ '^[0-9]{10}$');

ALTER TABLE users
ADD CONSTRAINT chk_age_valid
CHECK (age BETWEEN 0 AND 120);

ALTER TABLE users
ADD CONSTRAINT chk_gender_valid
CHECK (gender IN ('M', 'F', 'O'));

ALTER TABLE users
ADD CONSTRAINT chk_email_format
CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE users
ADD CONSTRAINT chk_password_not_empty
CHECK (length(trim(password)) > 0);
