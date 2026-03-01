CREATE OR REPLACE FUNCTION change_password(
    p_user_id INTEGER,
    p_new_password TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE users
    SET password = p_new_password
    WHERE user_id = p_user_id;
END;
$$;
