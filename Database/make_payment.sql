CREATE OR REPLACE FUNCTION make_payment(
    trans_no    TEXT,
    pnr_number  INTEGER,
    user_code   INTEGER,
    pay_date    TIMESTAMPTZ,
    amount      NUMERIC,
    pay_mode    TEXT
)
RETURNS TABLE(
    pnr_no               BIGINT,
    transaction_number   TEXT,
    confirmation_status  TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO payment_info (transaction_number, pnr_no, user_id, payment_date, fare, mode)
    VALUES (trans_no, pnr_number, user_code, pay_date, amount, pay_mode);

    RETURN QUERY
    SELECT P.pnr_no, P.transaction_number, P.confirmation_status
    FROM payment_info P
    WHERE P.transaction_number = trans_no;
END;
$$;
