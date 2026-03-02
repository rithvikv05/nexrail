CREATE OR REPLACE FUNCTION public.confirm_booking(
    pnr_number bigint
) 
RETURNS void 
LANGUAGE plpgsql 
AS $$
BEGIN
    UPDATE payment_info
    SET confirmation_status = 'Confirmed'
    WHERE pnr_no = pnr_number;
END;
$$;
