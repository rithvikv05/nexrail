CREATE OR REPLACE FUNCTION public.add_passenger(
    pnr_number bigint, 
    passenger_name text, 
    passenger_age integer, 
    passenger_sex text, 
    allocated_seat text, 
    ticket_fare numeric
) 
RETURNS TABLE(pnr_no bigint, pax_name text, pax_age integer, pax_sex text, seat_no text, fare numeric) 
LANGUAGE plpgsql 
AS $$
DECLARE
    reserved_train_code INTEGER;
    reserved_class_id INTEGER;
    v_journey_date DATE;
    v_class_name TEXT;
BEGIN
    SELECT train_id, class_id, from_date 
    INTO reserved_train_code, reserved_class_id, v_journey_date
    FROM ticket_reservation
    WHERE pnr_no = pnr_number;

    SELECT class_name INTO v_class_name
    FROM class
    WHERE class_id = reserved_class_id;

    INSERT INTO passenger (pnr_no, pax_name, pax_age, pax_sex, seat_no, fare)
    VALUES (pnr_number, passenger_name, passenger_age, passenger_sex, allocated_seat, ticket_fare);

    IF v_class_name ILIKE '%sleeper%' OR v_class_name ILIKE '%sl%' THEN
        UPDATE seat_availability
        SET sleeper = sleeper - 1
        WHERE train_code = reserved_train_code AND journey_date = v_journey_date;
        
    ELSIF v_class_name ILIKE '%1ac%' THEN
        UPDATE seat_availability
        SET "1ac" = "1ac" - 1
        WHERE train_code = reserved_train_code AND journey_date = v_journey_date;
    END IF;

    RETURN QUERY
    SELECT P.pnr_no, P.pax_name, P.pax_age, P.pax_sex, P.seat_no, P.fare
    FROM passenger P
    WHERE P.pnr_no = pnr_number;
END;
$$;
