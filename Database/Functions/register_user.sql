CREATE OR REPLACE FUNCTION register_user(
    p_name TEXT,
    p_phone TEXT,
    p_age INTEGER,
    p_gender TEXT,
    p_email TEXT,
    p_password TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO users(name, phone, age, gender, email, password)
    VALUES (p_name, p_phone, p_age, p_gender, p_email, p_password);
END;
$$;
