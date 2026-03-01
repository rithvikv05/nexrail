create or replace function fetch_from_stations(
    input_from text
)
returns table(
    station_name text,
    city text
)
language plpgsql
as $$
begin
    return query
    SELECT S.station_name, S.city
    FROM station S
    WHERE S.station_name ILIKE input_from || '%' OR S.city ILIKE input_from || '%';
end;
$$;