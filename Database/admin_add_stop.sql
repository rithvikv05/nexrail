CREATE OR REPLACE FUNCTION admin_add_stop(
    input_train_code        INTEGER,
    input_via_station_code  TEXT,
    input_km_from_origin    INTEGER,
    input_reach_time        TIME
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO train_route (train_code, via_station_code, km_from_origin, reach_time)
    VALUES (input_train_code, input_via_station_code, input_km_from_origin, input_reach_time);
END;
$$;
