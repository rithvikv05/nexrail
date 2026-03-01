CREATE OR REPLACE FUNCTION add_to_search_table(
    user_code INT,
    from_station_name TEXT,
    to_station_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    from_station_code TEXT;
    to_station_code TEXT;
BEGIN
    SELECT station_code
    INTO from_station_code
    FROM station
    WHERE station_name = from_station_name;

    SELECT station_code
    INTO to_station_code
    FROM station
    WHERE station_name = to_station_name;
    INSERT INTO search_history VALUES(user_code, from_station_code, to_station_code);
END;
$$;