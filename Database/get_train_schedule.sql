CREATE OR REPLACE FUNCTION get_train_schedule(
    input_train_code INTEGER
)
RETURNS TABLE(
    stop_no         INTEGER,
    via_station_code TEXT,
    station_name    TEXT,
    city            TEXT,
    km_from_origin  INTEGER,
    reach_time      TIME,
    train_name      TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ROW_NUMBER() OVER (ORDER BY TR.km_from_origin)::INTEGER,
        TR.via_station_code,
        S.station_name,
        S.city,
        TR.km_from_origin,
        TR.reach_time,
        T.train_name
    FROM train_route TR
    JOIN station S ON TR.via_station_code = S.station_code
    JOIN train T   ON T.train_no = input_train_code
    WHERE TR.train_code = input_train_code
    ORDER BY TR.km_from_origin;
END;
$$;
