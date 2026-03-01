CREATE OR REPLACE FUNCTION update_user_profile(
    p_user_id INTEGER,
    p_name TEXT,
    p_phone TEXT,
    p_age INTEGER,
    p_gender TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE users
    SET name = p_name,
        phone = p_phone,
        age = p_age,
        gender = p_gender
    WHERE user_id = p_user_id;
END;
$$;
