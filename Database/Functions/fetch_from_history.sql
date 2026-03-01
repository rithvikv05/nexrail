CREATE OR REPLACE FUNCTION fetch_from_history(
    user_code INT
)
RETURNS TABLE(
    station_name TEXT,
    city TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    return query
    SELECT S.station_name, S.city
    FROM station S
    WHERE S.station_code in (SELECT H.from_stationid FROM search_history H WHERE H.user_id = user_code);
END;
$$;