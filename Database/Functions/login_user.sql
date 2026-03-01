CREATE OR REPLACE FUNCTION login_user(
    p_email TEXT,
    p_password TEXT
)
RETURNS TABLE (
    user_id INTEGER,
    name TEXT,
    email TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT u.user_id, u.name, u.email
    FROM users u
    WHERE u.email = p_email
    AND u.password = p_password;
END;
$$;
