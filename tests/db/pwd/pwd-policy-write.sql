BEGIN;

DO $$
DECLARE
  policy_id integer;
BEGIN
  INSERT INTO pwd_policy (
    name,
    description,
    length,
    "creatorId",
    "creatorName"
  )
  VALUES (
    'dbContractPolicy',
    'PostgreSQL contract test',
    12,
    9001,
    'db-test'
  )
  RETURNING id INTO policy_id;

  IF NOT EXISTS (
    SELECT 1
    FROM pwd_policy
    WHERE id = policy_id
      AND name = 'dbContractPolicy'
      AND length = 12
      AND "creatorId" = 9001
  ) THEN
    RAISE EXCEPTION 'pwd_policy insert was not readable from the base table';
  END IF;
END;
$$;

ROLLBACK;
