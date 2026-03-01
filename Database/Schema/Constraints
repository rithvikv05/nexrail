ALTER TABLE public.class
ADD CONSTRAINT seats_positive
CHECK (seats_per_coach > 0);


—Passenger table:

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

—PAYMENT INFO
ALTER TABLE payment_info

-- Fare must be positive
ALTER COLUMN fare SET NOT NULL,
ADD CONSTRAINT chk_fare_positive
CHECK (fare > 0),

-- Mode must be from allowed set
ALTER COLUMN mode SET NOT NULL,
ADD CONSTRAINT chk_payment_mode
CHECK (mode IN ('UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Cash')),

-- Confirmation status must be controlled
ALTER COLUMN confirmation_status SET NOT NULL,
ADD CONSTRAINT chk_confirmation_status
CHECK (confirmation_status IN ('Pending', 'SUCCESS', 'FAILED','Confirmed','Cancelled'));

—search_history
—seat_availability
ALTER TABLE seat_availability
ADD CONSTRAINT chk_all_seats_non_negative
CHECK (
    sleeper >= 0 AND
    "1ac" >= 0 AND
    "2ac" >= 0 AND
    "3ac" >= 0
);

—ticket reservation
ALTER TABLE ticket_reservation
ADD CONSTRAINT chk_date_and_distance_valid
CHECK (
    from_date <= to_date AND
    distance >= 0
);

—train_route
ALTER TABLE train_route
ADD CONSTRAINT chk_km_from_origin_non_negative
CHECK (km_from_origin >= 0);

—users
ALTER TABLE users

-- Name must not be empty
ADD CONSTRAINT chk_name_not_empty
CHECK (length(trim(name)) > 0),

-- Phone: exactly 10 digits (India assumption)
ADD CONSTRAINT chk_phone_format
CHECK (phone ~ '^[0-9]{10}$'),

-- Age must be realistic
ADD CONSTRAINT chk_age_valid
CHECK (age BETWEEN 0 AND 120),

-- Gender restricted values
ADD CONSTRAINT chk_gender_valid
CHECK (gender IN ('M', 'F', 'O')),


-- Email basic format validation
ADD CONSTRAINT chk_email_format
CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),

-- Password must not be empty
ADD CONSTRAINT chk_password_not_empty
CHECK (length(trim(password)) > 0);
