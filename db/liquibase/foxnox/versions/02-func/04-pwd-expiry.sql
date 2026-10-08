-- pwdExpiry must be NULL or tomorrow (UTC calendar day) or later.
-- Same rule as src/utils/pwd-expiry.js and the admin date picker.
-- Used by pwd_expiry_guard_trigger (05-trig/01-pwd.sql). A trigger rather than a
-- CHECK: CHECK expressions must be immutable (no now()), and rows that expire later
-- must stay updatable, so only an inserted or changed value is tested.
CREATE OR REPLACE FUNCTION pwd_expiry_guard() RETURNS TRIGGER AS $$
BEGIN
  IF NEW."pwdExpiry" IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW."pwdExpiry" IS DISTINCT FROM OLD."pwdExpiry")
     AND NEW."pwdExpiry" < (date_trunc('day', now() AT TIME ZONE 'UTC') + INTERVAL '1 day') AT TIME ZONE 'UTC'
  THEN
    RAISE EXCEPTION 'pwdExpiry must be tomorrow (UTC) or later'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
