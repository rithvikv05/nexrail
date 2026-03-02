CREATE OR REPLACE FUNCTION public.check_seat_availability(
    input_train_code integer, 
    input_journey_date date, 
    input_class_name text 
) 
RETURNS TABLE(no_of_seats integer) 
LANGUAGE plpgsql 
AS $$
BEGIN
    IF input_class_name ILIKE '%sleeper%' OR input_class_name ILIKE '%sl%' THEN
        RETURN QUERY 
        SELECT sleeper FROM seat_availability 
        WHERE train_code = input_train_code AND journey_date = input_journey_date;
        
    ELSIF input_class_name ILIKE '%1ac%' THEN
        RETURN QUERY 
        SELECT "1ac" FROM seat_availability 
        WHERE train_code = input_train_code AND journey_date = input_journey_date;
        
    ELSE
        RAISE EXCEPTION 'Check the spelling!';
    END IF;
END;
$$;
