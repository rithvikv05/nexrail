CREATE OR REPLACE FUNCTION get_pnr_details(
    pnr_number INTEGER
)
RETURNS TABLE(
    pnr_no              INT4,
    train_id            INTEGER,
    train_name          TEXT,
    from_station        TEXT,
    to_station          TEXT,
    from_date           DATE,
    to_date             DATE,
    distance            INTEGER,
    pax_name            TEXT,
    pax_age             INTEGER,
    pax_sex             TEXT,
    seat_no             TEXT,
    passenger_fare      NUMERIC,
    transaction_number  TEXT,
    payment_date        TIMESTAMPTZ,
    total_fare          NUMERIC,
    mode                TEXT,
    confirmation_status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        TR.pnr_no,
        TR.train_id,
        T.train_name,
        S1.station_name,
        S2.station_name,
        TR.from_date,
        TR.to_date,
        TR.distance,
        P.pax_name,
        P.pax_age,
        P.pax_sex,
        P.seat_no,
        P.fare,
        PI.transaction_number,
        PI.payment_date,
        PI.fare,
        PI.mode,
        PI.confirmation_status
    FROM ticket_reservation TR
    JOIN train T    ON TR.train_id = T.train_no
    JOIN station S1 ON TR.from_station = S1.station_code
    JOIN station S2 ON TR.to_station = S2.station_code
    LEFT JOIN passenger P    ON TR.pnr_no = P.pnr_no
    LEFT JOIN payment_info PI ON TR.pnr_no = PI.pnr_no
    WHERE TR.pnr_no = pnr_number;
END;
$$;
