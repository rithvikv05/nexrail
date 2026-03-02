CREATE OR REPLACE FUNCTION get_fare(
    input_class_code TEXT
)
RETURNS TABLE(
    fare NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT tf.fare
    FROM train_fare tf
    JOIN class c ON c.class_id = tf.class_id
    WHERE c.class_code = input_class_code
    LIMIT 1;
END;
$$;
