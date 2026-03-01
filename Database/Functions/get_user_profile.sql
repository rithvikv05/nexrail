CREATE OR REPLACE FUNCTION get_user_profile(
    p_user_id INTEGER
)
RETURNS TABLE (
    user_id INTEGER,
    name TEXT,
    phone TEXT,
    age INTEGER,
    gender TEXT,
    email TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT u.user_id, u.name, u.phone, u.age, u.gender, u.email
    FROM users u
    WHERE u.user_id = p_user_id;
END;
$$;
