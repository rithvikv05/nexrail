CREATE OR REPLACE FUNCTION public.make_payment(
    trans_no text, 
    pnr_number bigint, 
    user_code integer, 
    pay_date date, 
    amount numeric, 
    pay_mode text
) 
RETURNS TABLE(transaction_number text, pnr_no bigint, confirmation_status text) 
LANGUAGE plpgsql 
AS $$
BEGIN
    INSERT INTO payment_info (transaction_number, pnr_no, user_id, payment_date, fare, mode, confirmation_status)
    VALUES (trans_no, pnr_number, user_code, pay_date, amount, pay_mode, 'Pending');

    RETURN QUERY
    SELECT P.transaction_number, P.pnr_no, P.confirmation_status
    FROM payment_info P
    WHERE P.transaction_number = trans_no;
END;
$$;
