BEGIN;

DO $$
DECLARE
  type_id integer;
BEGIN
  SELECT id INTO STRICT type_id
  FROM token_type
  WHERE name = 'Password reset';

  INSERT INTO token (
    hash,
    "typeId",
    "userId",
    "creatorId",
    "creatorName"
  )
  VALUES (
    'db-test-token-hash',
    type_id,
    9001,
    9001,
    'db-test'
  );

  BEGIN
    INSERT INTO token (
      hash,
      "typeId",
      "userId",
      "creatorId",
      "creatorName"
    )
    VALUES (
      'db-test-token-hash',
      type_id,
      9002,
      9001,
      'db-test'
    );
    RAISE EXCEPTION 'duplicate token hash was accepted';
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;
END;
$$;

ROLLBACK;
