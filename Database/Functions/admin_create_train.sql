CREATE OR REPLACE FUNCTION admin_create_train(
    input_train_no              INTEGER,
    input_train_name            TEXT,
    input_train_type            TEXT,
    input_train_running_days    TEXT,
    input_source_station_id     TEXT,
    input_destination_station_id TEXT,
    input_distance              INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO train (train_no, train_name, train_type, train_running_days, source_station_id, destination_station_id, distance)
    VALUES (input_train_no, input_train_name, input_train_type, input_train_running_days, input_source_station_id, input_destination_station_id, input_distance);

    INSERT INTO train_route (train_code, via_station_code, km_from_origin, reach_time)
    VALUES (input_train_no, input_source_station_id, 0, '00:00');

    INSERT INTO train_route (train_code, via_station_code, km_from_origin, reach_time)
    VALUES (input_train_no, input_destination_station_id, input_distance, '00:00');
END;
$$;
