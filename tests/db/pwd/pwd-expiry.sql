BEGIN;

-- pwd_expiry_guard: pwdExpiry must be NULL or tomorrow (UTC) or later,
-- only checked when the value is inserted or changed.
DO $$
DECLARE
  v_id INT;
  v_tomorrow TIMESTAMPTZ :=
    (date_trunc('day', now() AT TIME ZONE 'UTC') + INTERVAL '1 day') AT TIME ZONE 'UTC';
BEGIN
  -- accepted: NULL, tomorrow 00:00Z, later
  INSERT INTO pwd ("userId", "pwdHash", "pwdExpiry", "creatorId", "creatorName")
  VALUES (9001, 'hash', v_tomorrow, 9001, 'db-test')
  RETURNING id INTO v_id;
  UPDATE pwd SET "updaterId" = 9002, "updaterName" = 'db-test', "pwdExpiry" = v_tomorrow + INTERVAL '30 days' WHERE id = v_id;
  UPDATE pwd SET "updaterId" = 9002, "updaterName" = 'db-test', "pwdExpiry" = NULL WHERE id = v_id;

  -- rejected on insert: one microsecond before tomorrow (i.e. today)
  BEGIN
    INSERT INTO pwd ("userId", "pwdHash", "pwdExpiry", "creatorId", "creatorName")
    VALUES (9002, 'hash', v_tomorrow - INTERVAL '1 microsecond', 9001, 'db-test');
    RAISE EXCEPTION 'pwdExpiry of today was accepted on insert';
  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;

  -- rejected on update: yesterday
  BEGIN
    UPDATE pwd SET "updaterId" = 9002, "updaterName" = 'db-test', "pwdExpiry" = now() - INTERVAL '1 day' WHERE id = v_id;
    RAISE EXCEPTION 'pwdExpiry of yesterday was accepted on update';
  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;

  -- unrelated updates and an unchanged pwdExpiry are not rejected
  UPDATE pwd SET "updaterId" = 9002, "updaterName" = 'db-test', "pwdExpiry" = v_tomorrow WHERE id = v_id;
  UPDATE pwd SET "updaterId" = 9002, "updaterName" = 'db-test', "failedAttempts" = 3 WHERE id = v_id;
  UPDATE pwd SET "updaterId" = 9002, "updaterName" = 'db-test', "pwdExpiry" = "pwdExpiry" WHERE id = v_id;
END;
$$;

ROLLBACK;
