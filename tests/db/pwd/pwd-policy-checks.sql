BEGIN;

DO $$
BEGIN
  BEGIN
    INSERT INTO pwd_policy (
      name,
      length,
      "creatorId",
      "creatorName"
    )
    VALUES (
      'dbTooShortPolicy',
      5,
      9001,
      'db-test'
    );
    RAISE EXCEPTION 'pwd_policy length of 5 was accepted';
  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;

  BEGIN
    INSERT INTO pwd_policy (
      name,
      "maxFailedAttempts",
      "creatorId",
      "creatorName"
    )
    VALUES (
      'dbZeroAttemptsPolicy',
      0,
      9001,
      'db-test'
    );
    RAISE EXCEPTION 'pwd_policy maxFailedAttempts of 0 was accepted';
  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;

  BEGIN
    INSERT INTO pwd_policy (
      name,
      number,
      symbol,
      "lowerCase",
      "upperCase",
      "creatorId",
      "creatorName"
    )
    VALUES (
      'dbNoCharsetPolicy',
      false,
      false,
      false,
      false,
      9001,
      'db-test'
    );
    RAISE EXCEPTION 'pwd_policy with no character class was accepted';
  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;

  INSERT INTO pwd_policy (
    name,
    length,
    number,
    symbol,
    "lowerCase",
    "upperCase",
    "maxFailedAttempts",
    "creatorId",
    "creatorName"
  )
  VALUES (
    'dbValidCheckPolicy',
    6,
    true,
    false,
    false,
    false,
    1,
    9001,
    'db-test'
  );
END;
$$;

ROLLBACK;
