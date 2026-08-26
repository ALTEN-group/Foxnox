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
    'dbHistoryContractPolicy',
    'PostgreSQL history contract test',
    12,
    9001,
    'db-test'
  )
  RETURNING id INTO policy_id;

  IF NOT EXISTS (
    SELECT 1
    FROM log.history
    WHERE "schemaName" = 'public'
      AND "tableName" = 'pwd_policy'
      AND operation = 'INSERT'
      AND "userId" = 9001
      AND "userName" = 'db-test'
      AND (record->>'id')::integer = policy_id
  ) THEN
    RAISE EXCEPTION 'pwd_policy insert did not create the expected history record';
  END IF;

  UPDATE pwd_policy
  SET description = 'Updated by PostgreSQL contract test',
      "updaterId" = 9002,
      "updaterName" = 'db-test-update'
  WHERE id = policy_id;

  IF NOT EXISTS (
    SELECT 1
    FROM log.history
    WHERE "schemaName" = 'public'
      AND "tableName" = 'pwd_policy'
      AND operation = 'UPDATE'
      AND "userId" = 9002
      AND "userName" = 'db-test-update'
      AND (record->>'id')::integer = policy_id
  ) THEN
    RAISE EXCEPTION 'pwd_policy update did not create the expected history record';
  END IF;
END;
$$;

ROLLBACK;
