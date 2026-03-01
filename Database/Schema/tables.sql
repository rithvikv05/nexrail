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








SAMPLE DATA:


-- ZONE




INSERT INTO zone VALUES
('NR', 'Northern Railway'),
('WR', 'Western Railway');


-- STATION
INSERT INTO station VALUES
('NDLS', 'New Delhi', 'Delhi', 'Delhi', 'NR'),
('JP', 'Jaipur Junction', 'Jaipur', 'Rajasthan', 'NR'),
('BCT', 'Mumbai Central', 'Mumbai', 'Maharashtra', 'WR'),
('ADI', 'Ahmedabad Junction', 'Ahmedabad', 'Gujarat', 'WR');


-- TRAIN
INSERT INTO train VALUES
(12951, 'Mumbai Rajdhani', 'Superfast',
'Mon,Wed,Fri', 'NDLS', 'BCT', 1384),
(12015, 'Ajmer Shatabdi', 'Express',
'Tue,Thu,Sat', 'NDLS', 'JP', 303);


-- TRAIN_ROUTE
INSERT INTO train_route (train_code, via_station_code, via_station_name, km_from_origin, reach_time) VALUES
(12951, 'NDLS', 'New Delhi', 0, '16:55'),
(12951, 'JP', 'Jaipur Junction', 300, '20:30'),
(12951, 'ADI', 'Ahmedabad Junction', 950, '05:00'),
(12951, 'BCT', 'Mumbai Central', 1384, '08:35'),
(12015, 'NDLS', 'New Delhi', 0, '06:00'),
(12015, 'JP', 'Jaipur Junction', 303, '10:30');


-- CLASS
INSERT INTO class (class_code, class_name, seats_per_coach) VALUES
('SL', 'Sleeper', 72),
('3A', 'AC 3 Tier', 64);


-- SEAT_AVAILABILITY
INSERT INTO seat_availability (train_code, class_id, no_of_seats) VALUES
(12951, 1, 100),
(12951, 2, 60),
(12015, 2, 50);


-- USERS
INSERT INTO users (name, phone, age, gender, email, password) VALUES
('Rahul Sharma', '9876543210', 25, 'M', 'rahul@example.com', 'pass123'),
('Ananya Mehta', '9123456780', 22, 'F', 'ananya@example.com', 'pass456');


-- TICKET_RESERVATION
INSERT INTO ticket_reservation VALUES
(1000000001, 1, 12951,
'NDLS', 'BCT',
'2026-03-15', '2026-03-16', 1384);


-- PASSENGER
INSERT INTO passenger (pnr_no, pax_name, pax_age, pax_sex, seat_no, fare) VALUES
(1000000001, 'Rahul Sharma', 25, 'M', 'B1-21', 2500),
(1000000001, 'Priya Sharma', 23, 'F', 'B1-22', 2500);


-- PAYMENT_INFO
INSERT INTO payment_info VALUES
('TXN123456', 1000000001, 1,
'2026-03-10', 5000, 'UPI', 'SUCCESS');


-- REFUND_RULE
INSERT INTO refund_rule VALUES
('TXN123456', 'NOT_INITIATED');









More Data:
-- ===============================
-- ADDITIONAL STATIONS
-- ===============================


INSERT INTO station VALUES
('KOTA', 'Kota Junction', 'Kota', 'Rajasthan', 'NR'),
('SUR', 'Surat', 'Surat', 'Gujarat', 'WR');






-- ===============================
-- NEW TRAIN
-- ===============================


INSERT INTO train VALUES
(19020, 'Dehradun Express', 'Mail',
'Daily', 'NDLS', 'BCT', 1500);






-- ===============================
-- ROUTE FOR NEW TRAIN
-- ===============================


INSERT INTO train_route
(train_code, via_station_code, km_from_origin, reach_time)


VALUES
(19020, 'NDLS', 0, '22:00'),
(19020, 'KOTA', 450, '05:00'),
(19020, 'ADI', 1000, '12:00'),
(19020, 'SUR', 1250, '15:00'),
(19020, 'BCT', 1500, '18:30');






-- ===============================
-- SEAT AVAILABILITY FOR NEW TRAIN
-- ===============================


INSERT INTO seat_availability
(train_code, class_id, no_of_seats)
VALUES
(19020, 1, 120),
(19020, 2, 80);






-- ===============================
-- ADDITIONAL USERS
-- ===============================


INSERT INTO users
(name, phone, age, gender, email, password)
VALUES
('Arjun Verma', '9012345678', 30, 'M', 'arjun@example.com', 'pass789'),
('Sneha Kapoor', '9988776655', 28, 'F', 'sneha@example.com', 'pass999');






-- ===============================
-- BOOKING 2 (CONFIRMED)
-- ===============================


INSERT INTO ticket_reservation VALUES
(1000000002, 2, 12015,
'NDLS', 'JP',
'2026-03-18', '2026-03-18', 303);


INSERT INTO passenger
(pnr_no, pax_name, pax_age, pax_sex, seat_no, fare)
VALUES
(1000000002, 'Ananya Mehta', 22, 'F', 'C1-10', 800);


INSERT INTO payment_info VALUES
('TXN123457', 1000000002, 2,
'2026-03-12', 800, 'Credit Card', 'SUCCESS');


INSERT INTO refund_rule VALUES
('TXN123457', 'NOT_INITIATED');






-- ===============================
-- BOOKING 3 (MULTIPLE PASSENGERS)
-- ===============================


INSERT INTO ticket_reservation VALUES
(1000000003, 3, 19020,
'KOTA', 'BCT',
'2026-03-20', '2026-03-21', 1050);


INSERT INTO passenger
(pnr_no, pax_name, pax_age, pax_sex, seat_no, fare)
VALUES
(1000000003, 'Arjun Verma', 30, 'M', 'S2-15', 1800),
(1000000003, 'Riya Verma', 27, 'F', 'S2-16', 1800),
(1000000003, 'Kabir Verma', 5, 'M', 'S2-17', 900);


INSERT INTO payment_info VALUES
('TXN123458', 1000000003, 3,
'2026-03-15', 4500, 'Net Banking', 'SUCCESS');


INSERT INTO refund_rule VALUES
('TXN123458', 'NOT_INITIATED');






-- ===============================
-- BOOKING 4 (FAILED PAYMENT)
-- ===============================


INSERT INTO ticket_reservation VALUES
(1000000004, 4, 12951,
'JP', 'BCT',
'2026-03-25', '2026-03-26', 1084);


INSERT INTO passenger
(pnr_no, pax_name, pax_age, pax_sex, seat_no, fare)
VALUES
(1000000004, 'Sneha Kapoor', 28, 'F', 'B2-05', 2300);


INSERT INTO payment_info VALUES
('TXN123459', 1000000004, 4,
'2026-03-18', 2300, 'UPI', 'FAILED');


INSERT INTO refund_rule VALUES
('TXN123459', 'INITIATED');



INSERT INTO station VALUES
('PURI', 'Puri', 'Puri', 'Odisha', 'NR'),
('JAT', 'Jammu Tawi', 'Jammu', 'Jammu & Kashmir', 'NR');



-- ===============================
-- ADD MISSING STATIONS (to exceed 30)
-- ===============================


INSERT INTO station VALUES
('CNB', 'Kanpur Central', 'Kanpur', 'Uttar Pradesh', 'NR'),
('ALD', 'Prayagraj Junction', 'Prayagraj', 'Uttar Pradesh', 'NR'),
('GWL', 'Gwalior Junction', 'Gwalior', 'Madhya Pradesh', 'NR'),
('JHS', 'Jhansi Junction', 'Jhansi', 'Uttar Pradesh', 'NR'),
('AGC', 'Agra Cantt', 'Agra', 'Uttar Pradesh', 'NR'),
('PTA', 'Patna Junction', 'Patna', 'Bihar', 'NR'),
('MGS', 'Mughalsarai Junction', 'Chandauli', 'Uttar Pradesh', 'NR'),
('BSB', 'Varanasi Junction', 'Varanasi', 'Uttar Pradesh', 'NR'),
('RNC', 'Ranchi Junction', 'Ranchi', 'Jharkhand', 'NR'),
('TATA', 'Tatanagar Junction', 'Jamshedpur', 'Jharkhand', 'NR'),
('NGP', 'Nagpur Junction', 'Nagpur', 'Maharashtra', 'WR'),
('PUNE', 'Pune Junction', 'Pune', 'Maharashtra', 'WR'),
('MAS', 'Chennai Central', 'Chennai', 'Tamil Nadu', 'WR'),
('SBC', 'Bangalore City', 'Bangalore', 'Karnataka', 'WR'),
('HYB', 'Hyderabad Deccan', 'Hyderabad', 'Telangana', 'WR'),
('BZA', 'Vijayawada Junction', 'Vijayawada', 'Andhra Pradesh', 'WR'),
('ERS', 'Ernakulam Junction', 'Kochi', 'Kerala', 'WR'),
('TVM', 'Thiruvananthapuram Central', 'Thiruvananthapuram', 'Kerala', 'WR'),
('HWH', 'Howrah Junction', 'Howrah', 'West Bengal', 'NR'),
('BBS', 'Bhubaneswar', 'Bhubaneswar', 'Odisha', 'NR'),
('ASN', 'Asansol Junction', 'Asansol', 'West Bengal', 'NR'),
('DURG', 'Durg Junction', 'Durg', 'Chhattisgarh', 'WR'),
('PURI', 'Puri', 'Puri', 'Odisha', 'NR'),
('JAT', 'Jammu Tawi', 'Jammu', 'Jammu & Kashmir', 'NR')
ON CONFLICT (station_code) DO NOTHING;






-- ===============================
-- ADD NEW TRAINS (to exceed 15)
-- ===============================


INSERT INTO train VALUES
(12301, 'Howrah Rajdhani', 'Superfast', 'Daily', 'NDLS', 'HWH', 1450),
(12621, 'Tamil Nadu Express', 'Superfast', 'Daily', 'NDLS', 'MAS', 2180),
(12723, 'Telangana Express', 'Superfast', 'Daily', 'NDLS', 'HYB', 1670),
(12137, 'Punjab Mail', 'Mail', 'Daily', 'NDLS', 'PUNE', 1540),
(12801, 'Purushottam Express', 'Express', 'Daily', 'NDLS', 'PURI', 1800),
(12259, 'Sealdah Duronto', 'Superfast', 'Mon,Wed,Fri', 'NDLS', 'HWH', 1447),
(12627, 'Karnataka Express', 'Superfast', 'Daily', 'NDLS', 'SBC', 2400),
(11077, 'Jhelum Express', 'Mail', 'Daily', 'PUNE', 'JAT', 2100),
(12839, 'Chennai Mail', 'Express', 'Daily', 'HWH', 'MAS', 1650),
(12163, 'Chambal Express', 'Express', 'Tue,Thu,Sat', 'HWH', 'BZA', 1400);






-- ===============================
-- BASIC ROUTES FOR SOME NEW TRAINS
-- ===============================


INSERT INTO train_route (train_code, via_station_code, km_from_origin, reach_time) VALUES
(12301, 'NDLS', 0, '16:55'),
(12301, 'ASN', 1200, '06:00'),
(12301, 'HWH', 1450, '10:00'),


(12621, 'NDLS', 0, '22:30'),
(12621, 'NGP', 1100, '14:00'),
(12621, 'MAS', 2180, '07:00'),


(12723, 'NDLS', 0, '15:00'),
(12723, 'BZA', 1400, '05:00'),
(12723, 'HYB', 1670, '08:00'),


(12137, 'NDLS', 0, '05:30'),
(12137, 'BPL', 700, '13:00'),
(12137, 'PUNE', 1540, '04:30'),


(12627, 'NDLS', 0, '20:00'),
(12627, 'NGP', 1100, '12:00'),
(12627, 'SBC', 2400, '10:00');






-- ===============================
-- SEAT AVAILABILITY FOR ALL NEW TRAINS
-- ===============================


INSERT INTO seat_availability (train_code, class_id, no_of_seats) VALUES
(12301, 1, 200), (12301, 2, 100),
(12621, 1, 250), (12621, 2, 120),
(12723, 1, 220), (12723, 2, 110),
(12137, 1, 180), (12137, 2, 90),
(12801, 1, 210), (12801, 2, 105),
(12259, 1, 200), (12259, 2, 100),
(12627, 1, 240), (12627, 2, 130),
(11077, 1, 170), (11077, 2, 85),
(12839, 1, 190), (12839, 2, 95),
(12163, 1, 160), (12163, 2, 80);




Adding:class_id in ticket_reservation;


INSERT INTO class (class_code, class_name, seats_per_coach)
VALUES 
('2A', 'AC 2 Tier', 70),
('1A', 'First AC', 70);

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

Make seats availability:

TRUNCATE TABLE seat_availability RESTART IDENTITY;



ALTER TABLE seat_availability
ADD COLUMN journey_date DATE NOT NULL;

INSERT INTO seat_availability (train_code, class_id, no_of_seats, journey_date)
SELECT
   t.train_no,
   c.class_id,
   CASE
       WHEN c.class_id = 4 THEN 140
       WHEN c.class_id = 3 THEN 210
       WHEN c.class_id = 2 THEN 210
       WHEN c.class_id = 1 THEN 280
   END AS no_of_seats,
   d::DATE AS journey_date
FROM train t
CROSS JOIN class c
CROSS JOIN generate_series(
   '2026-03-01'::DATE,
   '2027-03-01'::DATE,
   INTERVAL '1 day'
) AS d;
