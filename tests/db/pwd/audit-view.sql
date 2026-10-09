BEGIN;

DO $$
DECLARE
  policy_id integer;
  r record;
BEGIN
  INSERT INTO pwd_policy (name, description, length, "creatorId", "creatorName")
  VALUES ('dbAuditViewPolicy', 'before', 12, 9101, 'audit-creator')
  RETURNING id INTO policy_id;

  UPDATE pwd_policy
  SET description = 'after', "updaterId" = 9102, "updaterName" = 'audit-editor'
  WHERE id = policy_id;

  -- Bookkeeping-only write: nothing meaningful changed.
  UPDATE pwd_policy
  SET "updatedAt" = NOW(), "updaterId" = 9103, "updaterName" = 'audit-bot'
  WHERE id = policy_id;

  UPDATE pwd_policy
  SET archived = TRUE, "updaterId" = 9104, "updaterName" = 'audit-archiver'
  WHERE id = policy_id;

  UPDATE pwd_policy
  SET archived = FALSE, "updaterId" = 9105, "updaterName" = 'audit-restorer'
  WHERE id = policy_id;

  SELECT * INTO r FROM log.audit
  WHERE "tableName" = 'pwd_policy' AND "recordId" = policy_id AND "userId" = 9101;
  IF r.action <> 'INSERT' OR r.previous IS NOT NULL OR r.kind <> 'change' THEN
    RAISE EXCEPTION 'audit view: INSERT row wrong (action %, previous %, kind %)',
      r.action, r.previous, r.kind;
  END IF;

  SELECT * INTO r FROM log.audit
  WHERE "tableName" = 'pwd_policy' AND "recordId" = policy_id AND "userId" = 9102;
  IF r.action <> 'UPDATE'
     OR r."changedKeys" <> ARRAY['description']
     OR r.previous->>'description' <> 'before'
     OR r.record->>'description' <> 'after'
     OR r.kind <> 'change' THEN
    RAISE EXCEPTION 'audit view: UPDATE row wrong (action %, keys %)', r.action, r."changedKeys";
  END IF;

  SELECT * INTO r FROM log.audit
  WHERE "tableName" = 'pwd_policy' AND "recordId" = policy_id AND "userId" = 9103;
  IF cardinality(r."changedKeys") <> 0 OR r.kind <> 'routine' THEN
    RAISE EXCEPTION 'audit view: bookkeeping-only update must be routine (keys %)', r."changedKeys";
  END IF;

  SELECT * INTO r FROM log.audit
  WHERE "tableName" = 'pwd_policy' AND "recordId" = policy_id AND "userId" = 9104;
  IF r.action <> 'ARCHIVE' THEN
    RAISE EXCEPTION 'audit view: expected ARCHIVE, got %', r.action;
  END IF;

  SELECT * INTO r FROM log.audit
  WHERE "tableName" = 'pwd_policy' AND "recordId" = policy_id AND "userId" = 9105;
  IF r.action <> 'RESTORE' THEN
    RAISE EXCEPTION 'audit view: expected RESTORE, got %', r.action;
  END IF;
END;
$$;

ROLLBACK;
