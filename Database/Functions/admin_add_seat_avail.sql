CREATE OR REPLACE FUNCTION admin_add_seat_avail(
    input_train_code    INTEGER,
    input_journey_date  DATE,
    input_sleeper       INTEGER,
    input_3ac           INTEGER,
    input_2ac           INTEGER,
    input_1ac           INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO seat_availability (train_code, journey_date, sleeper, "3ac", "2ac", "1ac")
    VALUES (input_train_code, input_journey_date, input_sleeper, input_3ac, input_2ac, input_1ac);
END;
$$;
