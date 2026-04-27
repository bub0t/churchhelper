-- Migration: add atomic reset_password_with_token RPC
-- Date: 2026-04-27
--
-- Performs token validation and password update inside a single transaction so
-- the token can never be permanently consumed without a matching password change.

CREATE OR REPLACE FUNCTION reset_password_with_token(
  p_token        TEXT,
  p_password_hash TEXT
)
RETURNS TEXT        -- 'ok' | 'invalid_token'
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id TEXT;
BEGIN
  -- Atomically mark the token as used; only succeeds for valid, unexpired,
  -- unused tokens.
  UPDATE password_reset_tokens
  SET    used = TRUE
  WHERE  token       = p_token
    AND  used        = FALSE
    AND  expires_at  > now()
  RETURNING user_id INTO v_user_id;

  IF v_user_id IS NULL THEN
    RETURN 'invalid_token';
  END IF;

  -- Update the password hash in the same transaction.
  UPDATE users
  SET    password_hash = p_password_hash
  WHERE  id = v_user_id;

  RETURN 'ok';
END;
$$;
