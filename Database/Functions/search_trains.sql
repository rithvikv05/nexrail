CREATE OR REPLACE FUNCTION search_trains(
    from_station_name TEXT,
    to_station_name TEXT,
    train_day TEXT
)
RETURNS TABLE(
    train_no INTEGER,
    train_name TEXT,
    train_type TEXT,
    departure_time TIME,
    arrival_time TIME
)
LANGUAGE plpgsql
AS $$
BEGIN
    return query
    SELECT T.train_no, T.train_name, T.train_type, TR1.reach_time AS departure_time, TR2.reach_time AS arrival_time
    FROM train T
    JOIN train_route TR1 ON T.train_no = TR1.train_code
    JOIN train_route TR2 ON T.train_no = TR2.train_code
    JOIN station S1 ON TR1.via_station_code = S1.station_code
    JOIN station S2 ON TR2.via_station_code = S2.station_code
    LEFT JOIN train_route R ON T.train_no = R.train_code
    WHERE S1.station_name = from_station_name
        AND S2.station_name = to_station_name
        AND (train_day = ANY(string_to_array(T.train_running_days, ',')) OR T.train_running_days = 'Daily');
END;
$$;