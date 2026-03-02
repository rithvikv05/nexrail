CREATE OR REPLACE FUNCTION admin_delete_train(
    input_train_no INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM train_route WHERE train_code = input_train_no;
    DELETE FROM seat_availability WHERE train_code = input_train_no;
    DELETE FROM train WHERE train_no = input_train_no;
END;
$$;
