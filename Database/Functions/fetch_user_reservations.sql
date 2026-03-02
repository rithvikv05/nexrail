CREATE OR REPLACE FUNCTION public.fetch_user_reservations(
    user_code integer
) 
RETURNS TABLE(pnr_no bigint, train_name text, from_station_name text, to_station_name text, booking_status text) 
LANGUAGE plpgsql 
AS $$
BEGIN
    RETURN QUERY
    SELECT TR.pnr_no, T.train_name, S1.station_name, S2.station_name, P.confirmation_status
    FROM ticket_reservation TR
    JOIN train T ON TR.train_id = T.train_no
    JOIN station S1 ON TR.from_station = S1.station_code
    JOIN station S2 ON TR.to_station = S2.station_code
    LEFT JOIN payment_info P ON TR.pnr_no = P.pnr_no
    WHERE TR.user_id = user_code;
END;
$$;
