CREATE OR REPLACE FUNCTION public.create_reservation(
    user_code integer, 
    input_train_code integer, 
    input_class_name text, 
    input_from_station_name text, 
    input_to_station_name text, 
    travel_from_date date, 
    travel_to_date date
) 
RETURNS TABLE(pnr_no bigint) 
LANGUAGE plpgsql 
AS $$
DECLARE
    from_station_code TEXT;
    to_station_code TEXT;
    resolved_class_id INTEGER;
    from_km INTEGER;
    to_km INTEGER;
    calculated_distance INTEGER;
    new_pnr BIGINT;
BEGIN
    new_pnr := floor(random() * 9000000000 + 1000000000)::bigint;

    SELECT class_id INTO resolved_class_id
    FROM class 
    WHERE class_name ILIKE input_class_name OR class_code ILIKE input_class_name
    LIMIT 1;

    IF resolved_class_id IS NULL THEN
        RAISE EXCEPTION 'Check the spelling!';
    END IF;

    SELECT station_code INTO from_station_code
    FROM station WHERE station_name = input_from_station_name;

    SELECT station_code INTO to_station_code
    FROM station WHERE station_name = input_to_station_name;

    SELECT km_from_origin INTO from_km
    FROM train_route 
    WHERE train_code = input_train_code AND via_station_code = from_station_code;

    SELECT km_from_origin INTO to_km
    FROM train_route 
    WHERE train_code = input_train_code AND via_station_code = to_station_code;

    calculated_distance := ABS(to_km - from_km);

    INSERT INTO ticket_reservation (pnr_no, user_id, train_id, class_id, from_station, to_station, from_date, to_date, distance)
    VALUES (new_pnr, user_code, input_train_code, resolved_class_id, from_station_code, to_station_code, travel_from_date, travel_to_date, calculated_distance);

    RETURN QUERY
    SELECT TR.pnr_no
    FROM ticket_reservation TR
    WHERE TR.pnr_no = new_pnr;
END;
$$;
