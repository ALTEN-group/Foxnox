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
    'dbArchiveContractPolicy',
    'PostgreSQL archive contract test',
    12,
    9001,
    'db-test'
  )
  RETURNING id INTO policy_id;

  PERFORM set_archived('pwd_policy', policy_id, true, false);

  IF NOT EXISTS (
    SELECT 1
    FROM pwd_policy
    WHERE id = policy_id
      AND archived = true
      AND "archivedAt" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'set_archived did not set archived and archivedAt on pwd_policy';
  END IF;
END;
$$;

ROLLBACK;
