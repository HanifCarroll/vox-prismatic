-- Migrate existing password hashes from users.password_hash to auth_keys.hashed_password
INSERT INTO auth_keys (id, user_id, hashed_password, primary_key, created_at, updated_at)
SELECT 'email:' || lower(u.email) AS id, u.id AS user_id, u.password_hash AS hashed_password, true, now(), now()
FROM users u
WHERE u.password_hash IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM auth_keys k WHERE k.id = 'email:' || lower(u.email)
  );

-- Drop password_hash column from users
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

